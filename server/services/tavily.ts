import OpenAI from "openai";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const API_URL = "https://api.tavily.com/search";

// Helper function to generate search queries
async function generateSearchQueries(query: string): Promise<string[]> {
  const openai = new OpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o", 
    messages: [
      {
        role: "system",
        content: "You are a search expert. Generate 3-5 specific search queries to comprehensively research this topic. Return only the queries, one per line."
      },
      {
        role: "user",
        content: query
      }
    ]
  });

  return completion.choices[0].message.content?.split('\n').filter(q => q.trim()) || [query];
}

export async function searchWeb(query: string): Promise<{
  response: string;
  citations: string[];
  searchStatus: {
    queries: string[];
    searched: boolean;
    sourcesFound: number;
  };
}> {
  try {
    console.log("Starting web search for query:", query);

    // First, generate search queries
    const searchQueries = await generateSearchQueries(query);
    console.log("Generated search queries:", searchQueries);

    // Then, search using Tavily API
    const searchResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TAVILY_API_KEY}`
      },
      body: JSON.stringify({
        query: query,
        search_depth: "advanced",
        include_answer: true,
        include_domains: [],
        exclude_domains: [],
        max_results: 10,
      })
    });

    if (!searchResponse.ok) {
      throw new Error(`Tavily API error: ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    console.log("Received search results from Tavily");

    const searchResults = searchData.results || [];

    // Extract URLs for citations
    const citations = searchResults.map((result: any) => result.url);

    // Use OpenAI to generate a coherent response from the search results
    const openai = new OpenAI();
    console.log("Generating response with OpenAI");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", 
      messages: [
        {
          role: "system",
          content: `You are a research assistant helping to analyze web search results. 
          Synthesize the information into a clear, comprehensive response. 
          Focus on accuracy and cite specific sources when presenting information.
          Present information in a clear, structured format using bullet points when appropriate.`
        },
        {
          role: "user",
          content: `Search query: "${query}"

          Search results:
          ${searchResults.map((r: any) => `
          Title: ${r.title}
          Content: ${r.content}
          URL: ${r.url}
          `).join('\n')}

          Please provide a comprehensive answer based on these search results.`
        }
      ]
    });

    console.log("Generated response from OpenAI");

    return {
      response: completion.choices[0].message.content || "No response generated",
      citations: citations,
      searchStatus: {
        queries: searchQueries,
        searched: true,
        sourcesFound: citations.length
      }
    };

  } catch (error: any) {
    console.error("Web search error:", error);
    throw new Error(`Failed to perform web search: ${error.message}`);
  }
}