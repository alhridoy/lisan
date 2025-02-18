import { NextApiRequest, NextApiResponse } from 'next';
import { generateStructuredSummaries, generateDeepResearch } from '../../api/services/openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { papers, query, type } = req.body;
    if (!papers || !query) {
      return res.status(400).json({ error: 'Papers and query are required' });
    }

    if (type === 'structured') {
      const analysis = await generateStructuredSummaries(papers, query);
      return res.status(200).json(analysis);
    } else if (type === 'deep') {
      const analysis = await generateDeepResearch(papers, query);
      return res.status(200).json(analysis);
    }

    return res.status(400).json({ error: 'Invalid analysis type' });
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
