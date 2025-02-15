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
  enhancedQuery: string;
  keywords: string[];
  subjects: string[];
  yearRange?: { start?: number; end?: number };
}

export async function semanticSearch(query: string): Promise<QueryAnalysis> {
  const prompt = `Analyze this academic search query and return a JSON object with the following fields:
- enhancedQuery: an expanded academic search query
- keywords: array of important technical terms and concepts
- subjects: array of relevant academic fields
- yearRange: object with optional start and end years if mentioned
Example input: "recent papers on transformer architecture in NLP"
Example output: {
  "enhancedQuery": "transformer neural architecture natural language processing deep learning attention mechanism",
  "keywords": ["transformer", "attention mechanism", "neural architecture", "NLP"],
  "subjects": ["Computer Science", "Machine Learning", "Natural Language Processing"],
  "yearRange": { "start": 2020 }
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
    enhancedQuery: result.enhancedQuery || query,
    keywords: result.keywords || [],
    subjects: result.subjects || [],
    yearRange: result.yearRange
  };
}

// Function to calculate relevance score between query and paper
export async function calculateRelevanceScore(
  paper: { title: string; abstract: string },
  query: string,
  queryAnalysis: QueryAnalysis
): Promise<number> {
  const prompt = `Rate the relevance of this academic paper to the search query on a scale of 0 to 1.
Return only a JSON object with a single "score" field containing a number.

Search Query: ${query}
Search Context: ${JSON.stringify(queryAnalysis)}

Paper Title: ${paper.title}
Paper Abstract: ${paper.abstract}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  const content = response.choices[0].message.content || "{}";
  const result = JSON.parse(content);
  return result.score || 0;
}