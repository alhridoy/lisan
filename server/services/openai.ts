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

// Update the generateDeepResearch interface to include topic information
interface Point {
  x: number;
  y: number;
  isOutlier: boolean;
  title: string;
  authors: string[];
  topic?: string;
}

export async function generateDeepResearch(
  papers: { title: string; abstract: string }[],
  query: string
): Promise<{
  abstractAndMethod: string;
  studies: Array<{
    study: string;
    studyType: string;
    researchFocus: string;
    analysis: string;
    references: string[];
  }>;
  fullText: string;
  visualization: {
    points: Point[];
  };
}> {
  try {
    console.log("Generating deep research analysis for papers:", papers.length);

    if (!papers.length) {
      return {
        abstractAndMethod: "No papers found for analysis.",
        studies: [],
        fullText: "No papers found for analysis.",
        visualization: { points: [] }
      };
    }

    const prompt = `Analyze these academic papers related to "${query}" and provide a comprehensive research analysis with visualization coordinates and topic mapping.
Include proper academic citations, references, and detailed cross-study analysis.

Papers to analyze:
${papers.map(p => `Title: ${p.title}\nAbstract: ${p.abstract}\n---`).join('\n')}

Return a JSON object with:
{
  "abstractAndMethod": "A comprehensive overview of the research area and methodologies used across studies (500-1000 words)",
  "studies": [
    {
      "study": "Name or brief identifier of the study (author and year)",
      "studyType": "Type of research (e.g., Empirical, Theoretical, Case Study)",
      "researchFocus": "Main research questions or objectives",
      "analysis": "Key findings and implications",
      "references": ["Full academic citations in the format: LastName, FirstName. (Year). Title. Journal/Conference, etc."]
    }
  ],
  "fullText": "A complete report including: Title, Date, Abstract, Methods, Results (with characteristics of included studies), Thematic Analysis, Cross-Study Analysis, Success Metrics, Implementation Requirements, and References. For References, ensure each entry follows proper academic citation format with author names, year, title, and publication details. For unknown authors, use the format: LastName, FirstName or Organization Name if available, otherwise omit author field and start with title. The Cross-Study Analysis section should comprehensively analyze relationships, patterns, and contradictions across studies, identifying research gaps and future directions.",
  "visualization": {
    "points": [
      {
        "x": number (-10 to 10),
        "y": number (-10 to 10),
        "isOutlier": boolean,
        "title": "paper title",
        "authors": ["author names"],
        "topic": "main topic or theme of the paper"
      }
    ]
  }
}`;

    console.log("Sending request to OpenAI for deep research analysis...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 4000
    });

    const content = response.choices[0].message.content || "{}";
    console.log("Received deep research analysis from OpenAI");

    const result = JSON.parse(content);
    return {
      abstractAndMethod: result.abstractAndMethod || "No abstract available",
      studies: result.studies || [],
      fullText: result.fullText || "No full text available",
      visualization: result.visualization || { points: [] }
    };
  } catch (error: any) {
    console.error("OpenAI deep research analysis error:", error);
    throw new Error(`Failed to generate deep research analysis: ${error.message}`);
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

// Add these functions after the existing ones

export async function generateNovelIdeas(topic: string): Promise<Array<{
  idea: ExpandedIdea;
  evaluation: IdeaEvaluation;
}>> {
  try {
    console.log("Generating novel research ideas for topic:", topic);

    // First get related papers from both sources
    const [arxivResults, semanticScholarResults] = await Promise.all([
      searchArxiv(topic),
      searchSemanticScholar(topic)
    ]);

    // Combine and deduplicate papers
    const allPapers = [...arxivResults, ...semanticScholarResults];
    const seenTitles = new Set();
    const relevantPapers = allPapers.filter(paper => {
      if (!seenTitles.has(paper.title)) {
        seenTitles.add(paper.title);
        return true;
      }
      return false;
    });

    console.log(`Found ${relevantPapers.length} relevant papers for context`);

    // Prepare context from papers
    const context = relevantPapers.map(paper => `
Title: ${paper.title}
Abstract: ${paper.abstract}
Authors: ${paper.authors.join(', ')}
${paper.metadata?.year ? `Year: ${paper.metadata.year}` : ''}
---
`).join('\n');

    const prompt = `Based on an analysis of these relevant papers:

${context}

Generate novel research ideas for the topic: "${topic}"

Follow this process:
1. Analyze the research landscape from the provided papers
2. Identify gaps and opportunities
3. Generate innovative solutions
4. Consider interdisciplinary connections
5. Evaluate against existing approaches

For each idea, provide a detailed analysis in this JSON format:
{
  "ideas": [
    {
      "idea": {
        "title": "Title of the research idea",
        "problem_statement": "Clear statement of the problem and its significance",
        "existing_methods": "Analysis of current approaches and their limitations, citing relevant papers",
        "motivation": "Why this idea is important and novel, referencing gaps in current literature",
        "proposed_method": "Detailed description of the proposed approach"
      },
      "evaluation": {
        "novelty": {
          "score": number (1-10),
          "justification": "Detailed explanation of novelty score relative to existing work"
        },
        "feasibility": {
          "score": number (1-10),
          "justification": "Detailed explanation of feasibility score"
        },
        "potential_impact": {
          "score": number (1-10),
          "justification": "Detailed explanation of impact score"
        },
        "overall_score": number (1-10),
        "related_papers": ["List of relevant paper titles that support or relate to this idea"]
      }
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert AI research assistant specialized in analyzing research literature and generating novel research ideas."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000
    });

    const content = response.choices[0].message.content || "{}";
    console.log("Received novel ideas from OpenAI");

    const result = JSON.parse(content);
    return result.ideas || [];
  } catch (error: any) {
    console.error("OpenAI novel ideas generation error:", error);
    throw new Error(`Failed to generate novel ideas: ${error.message}`);
  }
}

interface ExpandedIdea {
  title: string;
  problem_statement: string;
  existing_methods: string;
  motivation: string;
  proposed_method: string;
}

interface IdeaEvaluation {
  novelty: {
    score: number;
    justification: string;
  };
  feasibility: {
    score: number;
    justification: string;
  };
  potential_impact: {
    score: number;
    justification: string;
  };
  overall_score: number;
  related_papers: string[];
}

// Placeholder functions -  These need to be implemented separately
async function searchArxiv(topic: string): Promise<Array<{ title: string; abstract: string; authors: string[]; metadata: { year?: number }; }>> {
  //Implementation to search arXiv for papers related to the topic.  Return an array of papers.
  return [];
}

async function searchSemanticScholar(topic: string): Promise<Array<{ title: string; abstract: string; authors: string[]; metadata: { year?: number }; }>> {
  //Implementation to search Semantic Scholar for papers related to the topic. Return an array of papers.
  return [];
}

export async function generateChatResponse(
  message: string,
  context: string,
  type: "deep-research" | "novel-ideas"
): Promise<string> {
  try {
    console.log(`Generating chat response for ${type} with context length: ${context.length}`);

    let systemPrompt = "";
    if (type === "deep-research") {
      systemPrompt = `You are a research assistant helping users understand a deep research analysis. 
Use the provided research context to answer questions accurately and informatively.
If a question cannot be answered using the provided context, acknowledge that and suggest what additional information might be needed.`;
    } else {
      systemPrompt = `You are a research ideation assistant helping users explore novel research ideas. 
Use the provided idea context to answer questions about methodology, implications, and potential developments.
If a question cannot be answered using the provided context, acknowledge that and suggest what additional information might be needed.`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Context:\n${context}\n\nUser Question: ${message}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return response.choices[0].message.content || "I apologize, but I couldn't generate a response. Please try rephrasing your question.";
  } catch (error: any) {
    console.error("OpenAI chat response generation error:", error);
    throw new Error(`Failed to generate chat response: ${error.message}`);
  }
}