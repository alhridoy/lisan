import { NextApiRequest, NextApiResponse } from 'next';
import { generateNovelIdeas } from '../../api/services/openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const ideas = await generateNovelIdeas(topic);
    return res.status(200).json({ ideas });
  } catch (error) {
    console.error('Ideas generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
