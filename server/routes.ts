import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { analyzeQuery, generatePaperSummary, calculateRelevanceScore, generateStructuredSummaries, generateDeepResearch, generateNovelIdeas, generateChatResponse } from "./services/openai";
import { searchArxiv } from "./services/arxiv";
import { searchSemanticScholar } from "./services/semantic-scholar";
import { insertPaperSchema } from "@shared/schema";
import { extractTextFromDocument } from "./services/document-processor";
import multer from "multer";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Ensure uploads directory exists with proper permissions
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
}

// Configure multer for file upload with file filter
const upload = multer({
  dest: uploadDir,
  fileFilter: (req, file, cb) => {
    console.log('Received file:', file.originalname, 'with mimetype:', file.mimetype);

    // Check file mimetype and extension
    const allowedMimeTypes = [
      'application/pdf',
      'application/x-pdf',
      'application/acrobat',
      'application/vnd.pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const fileExtension = file.originalname.toLowerCase().split('.').pop();
    console.log('File extension:', fileExtension);

    if (allowedMimeTypes.includes(file.mimetype) || 
        (fileExtension === 'pdf' && file.mimetype.includes('pdf'))) {
      console.log('File type validated successfully');
      cb(null, true);
    } else {
      console.log('File type validation failed. Mimetype:', file.mimetype);
      cb(new Error('Invalid file type. Please upload a PDF or DOCX file.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  app.post("/api/search", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Invalid query" });
      }

      // Add to search history
      await storage.addSearchHistory({
        query,
        timestamp: new Date()
      });

      // First, analyze query to extract filters and enhanced query
      const analysis = await analyzeQuery(query);

      // Search both APIs in parallel with enhanced query
      const [arxivResults, semanticScholarResults] = await Promise.all([
        searchArxiv(analysis.enhancedQuery),
        searchSemanticScholar(analysis.enhancedQuery)
      ]);

      // Combine results and apply metadata filters first
      const allResults = [...arxivResults, ...semanticScholarResults];
      const filteredResults = [];
      const seenIds = new Set();

      for (const paper of allResults) {
        if (!seenIds.has(paper.sourceId) && applyMetadataFilters(paper, analysis.filters)) {
          seenIds.add(paper.sourceId);

          // Check if paper already exists in storage
          const existingPaper = await storage.findPaperBySourceId(paper.sourceId);

          if (existingPaper) {
            // Calculate relevance score for ranking
            const relevanceScore = await calculateRelevanceScore(
              existingPaper,
              query
            );

            filteredResults.push({
              ...existingPaper,
              score: relevanceScore
            });
          } else {
            // Generate summary and store new paper
            const summary = await generatePaperSummary(paper.abstract);
            const validated = insertPaperSchema.parse({
              ...paper,
              summary
            });
            const saved = await storage.insertPaper(validated);

            const relevanceScore = await calculateRelevanceScore(
              saved,
              query
            );

            filteredResults.push({
              ...saved,
              score: relevanceScore
            });
          }
        }
      }

      // Sort by relevance score and return results
      const sortedResults = filteredResults
        .sort((a, b) => b.score - a.score)
        .map(({ score, ...paper }) => paper);

      res.json({
        results: sortedResults,
        metadata: {
          filters: analysis.filters,
          totalResults: sortedResults.length
        }
      });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  });

  app.post("/api/summarize", async (req, res) => {
    try {
      const { query } = req.body;
      console.log("Received summarize request with query:", query);

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Invalid query" });
      }

      // Add to search history
      await storage.addSearchHistory({
        query,
        timestamp: new Date()
      });

      // First, analyze query and get relevant papers
      console.log("Analyzing query...");
      const analysis = await analyzeQuery(query);
      console.log("Query analysis result:", analysis);

      const [arxivResults, semanticScholarResults] = await Promise.all([
        searchArxiv(analysis.enhancedQuery),
        searchSemanticScholar(analysis.enhancedQuery)
      ]);

      console.log("Search results:", {
        arxivCount: arxivResults.length,
        semanticScholarCount: semanticScholarResults.length
      });

      // Combine and filter results
      const allResults = [...arxivResults, ...semanticScholarResults];
      const filteredResults = [];
      const seenIds = new Set();

      for (const paper of allResults) {
        if (!seenIds.has(paper.sourceId) && applyMetadataFilters(paper, analysis.filters)) {
          seenIds.add(paper.sourceId);
          filteredResults.push(paper);
        }
      }

      console.log("Filtered results count:", filteredResults.length);

      // Get relevance scores
      const scoredResults = await Promise.all(
        filteredResults.map(async (paper) => ({
          ...paper,
          score: await calculateRelevanceScore(paper, query)
        }))
      );

      // Sort by score and take top 5 papers
      const topPapers = scoredResults
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(({ score, ...paper }) => paper);

      console.log("Selected top papers count:", topPapers.length);

      // Generate structured summaries using OpenAI
      console.log("Generating structured summaries...");
      const summaryResult = await generateStructuredSummaries(topPapers, query);
      console.log("Generated summary result:", summaryResult);

      res.json(summaryResult);
    } catch (error) {
      console.error("Summary generation error:", error);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  app.post("/api/deep-research", async (req, res) => {
    try {
      const { query } = req.body;
      console.log("Received deep research request with query:", query);

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Invalid query" });
      }

      // First, analyze query and get relevant papers
      console.log("Analyzing query for deep research...");
      const analysis = await analyzeQuery(query);
      console.log("Query analysis result:", analysis);

      const [arxivResults, semanticScholarResults] = await Promise.all([
        searchArxiv(analysis.enhancedQuery),
        searchSemanticScholar(analysis.enhancedQuery)
      ]);

      console.log("Search results:", {
        arxivCount: arxivResults.length,
        semanticScholarCount: semanticScholarResults.length
      });

      // Combine and filter results
      const allResults = [...arxivResults, ...semanticScholarResults];
      const filteredResults = [];
      const seenTitles = new Set();

      for (const paper of allResults) {
        if (!seenTitles.has(paper.title)) {
          seenTitles.add(paper.title);
          filteredResults.push(paper);
        }
      }

      console.log("Filtered results count:", filteredResults.length);

      // Get relevance scores
      const scoredResults = await Promise.all(
        filteredResults.map(async (paper) => ({
          ...paper,
          score: await calculateRelevanceScore(paper, query)
        }))
      );

      // Select top papers
      const topPapers = scoredResults
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(({ score, ...paper }) => paper);

      console.log("Selected top papers for deep research:", topPapers.length);

      // Generate deep research analysis
      console.log("Generating deep research analysis...");
      const researchResult = await generateDeepResearch(topPapers, query);
      console.log("Generated deep research result");

      res.json(researchResult);
    } catch (error: any) {
      console.error("Deep research error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/peer-review", upload.single("file"), async (req, res) => {
    let filePath: string | undefined;

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      filePath = req.file.path;
      console.log("Processing uploaded file for peer review:", req.file.originalname);
      console.log("File details:", {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      });

      // Verify file exists before processing
      try {
        await fs.promises.access(filePath, fs.constants.R_OK);
        console.log("File exists and is readable:", filePath);
      } catch (error) {
        console.error("File access error:", error);
        throw new Error("Uploaded file not accessible");
      }

      // Extract text from the uploaded document
      const text = await extractTextFromDocument(filePath);
      console.log("Text extraction successful, length:", text.length);

      if (!text || text.trim().length === 0) {
        throw new Error("No text could be extracted from the document");
      }

      // Use OpenAI to analyze the paper
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Using the latest model
        messages: [{
          role: "user",
          content: `You are an expert academic peer reviewer. Review this academic paper and provide detailed feedback.
            Consider methodology, literature review, clarity, and scientific rigor.

            Paper text:
            ${text}

            Provide your review in JSON format with:
            {
              "generalFeedback": "Overall assessment of the paper",
              "methodologyAnalysis": {
                "strengths": ["list of methodological strengths"],
                "gaps": ["identified gaps or weaknesses"],
                "recommendations": ["specific suggestions for improvement"]
              },
              "literatureReview": {
                "relevantPapers": [
                  {
                    "title": "paper title",
                    "authors": ["author names"],
                    "year": year,
                    "relevance": "explanation of relevance"
                  }
                ],
                "suggestedRemovals": [
                  {
                    "citation": "citation text",
                    "reason": "reason for suggesting removal"
                  }
                ]
              },
              "writingStyle": {
                "clarity": "assessment of writing clarity",
                "improvements": ["suggested writing improvements"]
              }
            }`
        }],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      res.json(result);

    } catch (error: any) {
      console.error("Peer review error:", error);
      res.status(500).json({ error: error.message });
    } finally {
      // Clean up uploaded file
      if (filePath) {
        try {
          await fs.promises.unlink(filePath);
          console.log("Temporary file cleaned up:", filePath);
        } catch (error) {
          console.error("Error deleting uploaded file:", error);
        }
      }
    }
  });

  app.get("/api/papers/:id", async (req, res) => {
    try {
      const paper = await storage.getPaper(parseInt(req.params.id));
      if (!paper) {
        return res.status(404).json({ error: "Paper not found" });
      }
      res.json(paper);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch paper" });
    }
  });

  app.get("/api/recent-searches", async (req, res) => {
    try {
      const searches = await storage.getRecentSearches();
      res.json(searches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent searches" });
    }
  });

  app.post("/api/novel-ideas", async (req, res) => {
    try {
      const { topic } = req.body;
      if (!topic || typeof topic !== "string") {
        return res.status(400).json({ error: "Invalid topic" });
      }

      console.log("Generating novel ideas for topic:", topic);
      const ideas = await generateNovelIdeas(topic);
      res.json(ideas);
    } catch (error: any) {
      console.error("Novel ideas generation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, context, type } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Invalid message" });
      }

      if (!context || typeof context !== "string") {
        return res.status(400).json({ error: "Invalid context" });
      }

      if (!type || !["deep-research", "novel-ideas"].includes(type)) {
        return res.status(400).json({ error: "Invalid type" });
      }

      console.log("Processing chat request:", { type, messageLength: message.length });

      const response = await generateChatResponse(message, context, type as "deep-research" | "novel-ideas");

      res.json({ response });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}

function applyMetadataFilters(paper: any, filters: any) {
  const { yearRange, authors, venues, subjects, keywords } = filters;

  // Year range check
  if (yearRange) {
    const paperYear = paper.metadata?.year;
    if (paperYear) {
      if (yearRange.start && paperYear < yearRange.start) return false;
      if (yearRange.end && paperYear > yearRange.end) return false;
    }
  }

  // Author check
  if (authors?.length > 0) {
    const paperAuthors = paper.authors.map((a: string) => a.toLowerCase());
    if (!authors.some((author: string) =>
      paperAuthors.some(paperAuthor => paperAuthor.includes(author.toLowerCase()))
    )) {
      return false;
    }
  }

  // Venue check
  if (venues?.length > 0 && paper.metadata?.venue) {
    const paperVenue = paper.metadata.venue.toLowerCase();
    if (!venues.some((venue: string) => paperVenue.includes(venue.toLowerCase()))) {
      return false;
    }
  }

  // Subject check
  if (subjects?.length > 0 && paper.metadata?.subjects) {
    const paperSubjects = paper.metadata.subjects.map((s: string) => s.toLowerCase());
    if (!subjects.some((subject: string) =>
      paperSubjects.some(paperSubject => paperSubject.includes(subject.toLowerCase()))
    )) {
      return false;
    }
  }

  // Keyword check
  if (keywords?.length > 0) {
    const paperText = (paper.title + ' ' + paper.abstract).toLowerCase();
    const hasKeyword = keywords.some((keyword: string) =>
      paperText.includes(keyword.toLowerCase())
    );
    if (!hasKeyword) return false;
  }

  return true;
}

function calculateKeywordScore(text: string, keywords: string[]): number {
  const normalizedText = text.toLowerCase();
  let score = 0;

  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase();
    // Exact match has higher weight
    if (normalizedText.includes(normalizedKeyword)) {
      score += 0.3;
    }
    // Partial match has lower weight
    else if (normalizedText.split(' ').some(word =>
      word.includes(normalizedKeyword) || normalizedKeyword.includes(word)
    )) {
      score += 0.1;
    }
  }

  return Math.min(1, score); // Normalize to [0,1]
}