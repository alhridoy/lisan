import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generatePaperSummary(abstract: string): Promise<string> {
  const prompt = `Please summarize this academic paper abstract concisely while preserving key findings and methodology:\n\n${abstract}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 250
  });

  return response.choices[0].message.content || "";
}

interface QueryAnalysis {
  filters: {
    yearRange?: { start?: number; end?: number };
    authors?: string[];
    venues?: string[];
    subjects?: string[];
    keywords: string[];
  };
  enhancedQuery: string;
}

export async function analyzeQuery(query: string): Promise<QueryAnalysis> {
  const prompt = `Analyze this academic search query and return a JSON object with metadata filters and an enhanced query.
Example input: "deep learning papers by Yoshua Bengio after 2020 in ICML"
Example output: {
  "filters": {
    "yearRange": { "start": 2020 },
    "authors": ["Yoshua Bengio"],
    "venues": ["ICML"],
    "subjects": ["Computer Science", "Machine Learning"],
    "keywords": ["deep learning", "neural networks"]
  },
  "enhancedQuery": "deep learning neural networks machine learning artificial intelligence"
}

Query to analyze: ${query}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  const content = response.choices[0].message.content || "{}";
  const result = JSON.parse(content);

  return {
    filters: {
      yearRange: result.filters?.yearRange,
      authors: result.filters?.authors || [],
      venues: result.filters?.venues || [],
      subjects: result.filters?.subjects || [],
      keywords: result.filters?.keywords || []
    },
    enhancedQuery: result.enhancedQuery || query
  };
}

export async function calculateRelevanceScore(
  paper: { title: string; abstract: string; metadata: any },
  query: string
): Promise<number> {
  const prompt = `Rate the relevance of this academic paper to the search query on a scale of 0 to 1.
Return only a JSON object with a single "score" field containing a number.

Search Query: ${query}
Paper Title: ${paper.title}
Paper Abstract: ${paper.abstract}
Paper Metadata: ${JSON.stringify(paper.metadata)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  const content = response.choices[0].message.content || "{}";
  const result = JSON.parse(content);
  return result.score || 0;
}