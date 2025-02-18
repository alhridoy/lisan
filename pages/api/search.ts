import { NextApiRequest, NextApiResponse } from 'next';
import { generatePaperSummary, analyzeQuery } from '../../api/services/openai';
import { searchArxiv } from '../../api/services/arxiv';
import { searchSemanticScholar } from '../../api/services/semantic-scholar';
import { storage } from '../../api/storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const analysis = await analyzeQuery(query);
    const [arxivResults, semanticResults] = await Promise.all([
      searchArxiv(analysis.enhancedQuery),
      searchSemanticScholar(analysis.enhancedQuery)
    ]);

    const papers = [...arxivResults, ...semanticResults];
    const results = await Promise.all(
      papers.map(async (paper) => {
        const existingPaper = await storage.findPaperBySourceId(paper.sourceId);
        if (existingPaper) {
          return existingPaper;
        }

        const summary = await generatePaperSummary(paper.abstract);
        const paperWithSummary = { ...paper, summary };
        return await storage.insertPaper(paperWithSummary);
      })
    );

    await storage.addSearchHistory({
      query,
      timestamp: new Date()
    });

    return res.status(200).json({
      papers: results,
      analysis
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
