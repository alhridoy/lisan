import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { analyzeQuery, generatePaperSummary, calculateRelevanceScore, generateStructuredSummaries, generateDeepResearch, generateNovelIdeas, generateChatResponse } from "./services/openai";
import { searchArxiv } from "./services/arxiv";
import { searchSemanticScholar } from "./services/semantic-scholar";
import { insertPaperSchema } from "@shared/schema";
import OpenAI from "openai";
import { searchWeb } from "./services/tavily";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, context, type } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Invalid message" });
      }

      // Make context optional for web search
      if (type !== "web-search" && (!context || typeof context !== "string")) {
        return res.status(400).json({ error: "Invalid context" });
      }

      if (!type || !["deep-research", "novel-ideas", "web-search"].includes(type)) {
        return res.status(400).json({ error: "Invalid type" });
      }

      console.log("Processing chat request:", { type, messageLength: message.length });

      let response;
      if (type === "web-search") {
        console.log("Performing web search for:", message);
        const searchResult = await searchWeb(message);
        res.json(searchResult);
      } else {
        // Handle existing chat types
        response = await generateChatResponse(message, context, type as "deep-research" | "novel-ideas");
        res.json({ response });
      }

    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error.message });
    }
  });

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

  app.post("/api/recommendations", async (req, res) => {
    try {
      const { paperId, topic } = req.body;

      if (!paperId && !topic) {
        return res.status(400).json({ error: "Either paperId or topic is required" });
      }

      const openai = new OpenAI();

      // Get relevant papers from storage or search
      let papers = [];
      if (paperId) {
        const paper = await storage.findPaperBySourceId(paperId);
        if (paper) {
          // Search for related papers
          const [arxivResults, semanticScholarResults] = await Promise.all([
            searchArxiv(paper.title),
            searchSemanticScholar(paper.title)
          ]);
          papers = [...arxivResults, ...semanticScholarResults];
        }
      } else if (topic) {
        const [arxivResults, semanticScholarResults] = await Promise.all([
          searchArxiv(topic),
          searchSemanticScholar(topic)
        ]);
        papers = [...arxivResults, ...semanticScholarResults];
      }

      // Use OpenAI to analyze and generate recommendations
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a research recommendation system. Analyze the papers and provide:
            1. A list of recommended papers with justification
            2. Emerging research trends in this area
            3. Potential future research directions

            Format the response as JSON with the following structure:
            {
              "recommendations": [
                {
                  "title": string,
                  "reason": string,
                  "relevance_score": number
                }
              ],
              "trends": [
                {
                  "trend": string,
                  "description": string,
                  "supporting_evidence": string[]
                }
              ],
              "future_directions": [
                {
                  "direction": string,
                  "rationale": string,
                  "potential_impact": string
                }
              ]
            }`
          },
          {
            role: "user",
            content: `Papers to analyze:
            ${papers.map(p => `
              Title: ${p.title}
              Abstract: ${p.abstract}
              Year: ${p.metadata?.year || 'Unknown'}
            `).join('\n')}
            `
          }
        ],
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(completion.choices[0].message.content);
      res.json(analysis);
    } catch (error: any) {
      console.error("Recommendations error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/research-trends", async (req, res) => {
    try {
      const { topic, timeframe } = req.body;

      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      // Search for papers in the specified topic
      const [arxivResults, semanticScholarResults] = await Promise.all([
        searchArxiv(topic),
        searchSemanticScholar(topic)
      ]);

      const papers = [...arxivResults, ...semanticScholarResults];

      // Use OpenAI to analyze trends
      const openai = new OpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a research trend analyzer. Analyze the papers and provide:
            1. Key research trends over time
            2. Emerging methodologies and approaches
            3. Gaps in current research
            4. Future predictions

            Format the response as JSON with the following structure:
            {
              "trends": [
                {
                  "name": string,
                  "description": string,
                  "timeline": string,
                  "key_papers": string[],
                  "impact_score": number
                }
              ],
              "methodologies": [
                {
                  "name": string,
                  "description": string,
                  "advantages": string[],
                  "adoption_rate": string
                }
              ],
              "research_gaps": [
                {
                  "area": string,
                  "description": string,
                  "opportunity_level": string
                }
              ],
              "predictions": [
                {
                  "prediction": string,
                  "likelihood": string,
                  "potential_impact": string,
                  "timeframe": string
                }
              ]
            }`
          },
          {
            role: "user",
            content: `Topic: ${topic}
            Timeframe: ${timeframe || 'Recent'}

            Papers to analyze:
            ${papers.map(p => `
              Title: ${p.title}
              Abstract: ${p.abstract}
              Year: ${p.metadata?.year || 'Unknown'}
            `).join('\n')}
            `
          }
        ],
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(completion.choices[0].message.content);
      res.json(analysis);
    } catch (error: any) {
      console.error("Research trends analysis error:", error);
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