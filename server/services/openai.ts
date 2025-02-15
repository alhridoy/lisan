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

export async function semanticSearch(query: string): Promise<string> {
  const prompt = `Convert this natural language query into an academic search query optimized for finding relevant papers. Return JSON with fields: enhancedQuery (string), focusAreas (array of strings):\n\n${query}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  const content = response.choices[0].message.content || "{}";
  const result = JSON.parse(content);
  return result.enhancedQuery || query;
}