import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generatePaperSummary(abstract: string): Promise<string> {
  try {
    const prompt = `Please summarize this academic paper abstract concisely while preserving key findings and methodology:\n\n${abstract}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 250
    });

    return response.choices[0].message.content || "";
  } catch (error: any) {
    console.error("OpenAI summary generation error:", error);
    throw new Error(`Failed to generate summary: ${error.message}`);
  }
}

export async function analyzeQuery(query: string): Promise<QueryAnalysis> {
  try {
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
  } catch (error: any) {
    console.error("OpenAI query analysis error:", error);
    throw new Error(`Failed to analyze query: ${error.message}`);
  }
}

export async function generateStructuredSummaries(
  papers: { title: string; abstract: string }[],
  query: string
): Promise<{
  summaries: PaperSummaryStructure[];
  overview: string;
}> {
  try {
    console.log("Generating structured summaries for papers:", papers.length);

    if (!papers.length) {
      return {
        summaries: [],
        overview: "No papers found to summarize."
      };
    }

    const prompt = `Analyze these academic papers related to "${query}" and provide a structured analysis.

Papers to analyze:
${papers.map(p => `Title: ${p.title}\nAbstract: ${p.abstract}\n---`).join('\n')}

Provide a JSON response in this format:
{
  "summaries": [
    {
      "title": "paper title",
      "mainFindings": "key findings and conclusions",
      "methodology": "research methods used",
      "outcomes": "results and implications"
    }
  ],
  "overview": "synthesis of key themes and insights across all papers"
}`;

    console.log("Sending request to OpenAI...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 1500
    });

    const content = response.choices[0].message.content || "{}";
    console.log("Received response from OpenAI");

    const result = JSON.parse(content);
    return {
      summaries: result.summaries || [],
      overview: result.overview || "No overview available"
    };
  } catch (error: any) {
    console.error("OpenAI structured summary generation error:", error);
    throw new Error(`Failed to generate structured summaries: ${error.message}`);
  }
}

export async function calculateRelevanceScore(
  paper: { title: string; abstract: string; metadata: any },
  query: string
): Promise<number> {
  try {
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
  } catch (error: any) {
    console.error("OpenAI relevance score calculation error:", error);
    throw new Error(`Failed to calculate relevance score: ${error.message}`);
  }
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

interface PaperSummaryStructure {
  title: string;
  mainFindings: string;
  methodology: string;
  outcomes: string;
}