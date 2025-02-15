import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { semanticSearch, generatePaperSummary } from "./services/openai";
import { searchArxiv } from "./services/arxiv";
import { searchSemanticScholar } from "./services/semantic-scholar";
import { insertPaperSchema } from "@shared/schema";

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

      // Enhance query using OpenAI
      const enhancedQuery = await semanticSearch(query);

      // Search both APIs in parallel
      const [arxivResults, semanticScholarResults] = await Promise.all([
        searchArxiv(enhancedQuery),
        searchSemanticScholar(enhancedQuery)
      ]);

      // Combine and deduplicate results
      const allResults = [...arxivResults, ...semanticScholarResults];
      const uniqueResults = [];
      const seenIds = new Set();

      for (const paper of allResults) {
        if (!seenIds.has(paper.sourceId)) {
          seenIds.add(paper.sourceId);
          const existingPaper = await storage.findPaperBySourceId(paper.sourceId);
          
          if (existingPaper) {
            uniqueResults.push(existingPaper);
          } else {
            // Generate summary and cache paper
            const summary = await generatePaperSummary(paper.abstract);
            const validated = insertPaperSchema.parse({
              ...paper,
              summary
            });
            const saved = await storage.insertPaper(validated);
            uniqueResults.push(saved);
          }
        }
      }

      res.json({ results: uniqueResults });
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
