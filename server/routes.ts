import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { semanticSearch, generatePaperSummary, calculateRelevanceScore } from "./services/openai";
import { searchArxiv } from "./services/arxiv";
import { searchSemanticScholar } from "./services/semantic-scholar";
import { insertPaperSchema } from "@shared/schema";

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

      // Get enhanced query and analysis
      const queryAnalysis = await semanticSearch(query);

      // Search both APIs in parallel
      const [arxivResults, semanticScholarResults] = await Promise.all([
        searchArxiv(queryAnalysis.enhancedQuery),
        searchSemanticScholar(queryAnalysis.enhancedQuery)
      ]);

      // Combine results and calculate scores
      const allResults = [...arxivResults, ...semanticScholarResults];
      const scoredResults = [];
      const seenIds = new Set();

      for (const paper of allResults) {
        if (!seenIds.has(paper.sourceId)) {
          seenIds.add(paper.sourceId);
          const existingPaper = await storage.findPaperBySourceId(paper.sourceId);

          if (existingPaper) {
            // Calculate hybrid score for existing paper
            const keywordScore = calculateKeywordScore(
              existingPaper.title + ' ' + existingPaper.abstract,
              queryAnalysis.keywords
            );
            const semanticScore = await calculateRelevanceScore(
              existingPaper,
              query,
              queryAnalysis
            );

            // Combine scores (60% semantic, 40% keyword)
            const hybridScore = (semanticScore * 0.6) + (keywordScore * 0.4);

            scoredResults.push({
              ...existingPaper,
              score: hybridScore
            });
          } else {
            // Generate summary and calculate scores for new paper
            const summary = await generatePaperSummary(paper.abstract);
            const validated = insertPaperSchema.parse({
              ...paper,
              summary
            });
            const saved = await storage.insertPaper(validated);

            const keywordScore = calculateKeywordScore(
              paper.title + ' ' + paper.abstract,
              queryAnalysis.keywords
            );
            const semanticScore = await calculateRelevanceScore(
              paper,
              query,
              queryAnalysis
            );

            const hybridScore = (semanticScore * 0.6) + (keywordScore * 0.4);

            scoredResults.push({
              ...saved,
              score: hybridScore
            });
          }
        }
      }

      // Sort by score and return top results
      const sortedResults = scoredResults
        .sort((a, b) => b.score - a.score)
        .map(({ score, ...paper }) => paper);

      res.json({ 
        results: sortedResults,
        metadata: {
          query: queryAnalysis.enhancedQuery,
          subjects: queryAnalysis.subjects,
          totalResults: sortedResults.length
        }
      });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to perform search" });
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

  return httpServer;
}