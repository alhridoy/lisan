import OpenAI from "openai";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const API_URL = "https://api.tavily.com/search";

export async function searchWeb(query: string): Promise<{
  response: string;
  citations: string[];
}> {
  try {
    console.log("Starting web search for query:", query);

    // First, search using Tavily API
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
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
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
      citations: citations
    };

  } catch (error: any) {
    console.error("Web search error:", error);
    throw new Error(`Failed to perform web search: ${error.message}`);
  }
}