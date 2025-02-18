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
        content: "You are a search expert. Generate 3-5 specific search queries to comprehensively research this topic. Each query should focus on different aspects or interpretations of the topic. Return only the queries, one per line."
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
  citations: Array<{url: string, domain: string}>;
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

    // Then, search using Tavily API for each query
    const allSearchResults = [];
    for (const searchQuery of searchQueries) {
      console.log("Searching for query:", searchQuery);
      const searchResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TAVILY_API_KEY}`
        },
        body: JSON.stringify({
          query: searchQuery,
          search_depth: "advanced",
          include_answer: true,
          include_domains: [],
          exclude_domains: [],
          max_results: 40, // Increased to get more comprehensive results
        })
      });

      if (!searchResponse.ok) {
        throw new Error(`Tavily API error: ${searchResponse.statusText}`);
      }

      const searchData = await searchResponse.json();
      allSearchResults.push(...(searchData.results || []));
    }

    console.log(`Total results before deduplication: ${allSearchResults.length}`);

    // Deduplicate results by URL and filter out undefined/null entries
    const uniqueResults = Array.from(
      new Map(
        allSearchResults
          .filter(r => r && r.url)
          .map(r => [r.url, r])
      ).values()
    );

    console.log(`Unique results after deduplication: ${uniqueResults.length}`);

    // Extract URLs and domains for citations
    const citations = uniqueResults.map((result: any) => {
      try {
        const domain = new URL(result.url).hostname;
        return {
          url: result.url,
          domain: domain
        };
      } catch (e) {
        console.error("Error parsing URL:", result.url);
        return null;
      }
    }).filter(citation => citation !== null) as Array<{url: string, domain: string}>;

    // Use OpenAI to generate a coherent response
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
          Present information in a structured format using bullet points.
          Include specific mentions of sources using their domain names when presenting key information.
          Example: "According to v7labs.com, ..."
          Keep your response focused and concise.`
        },
        {
          role: "user",
          content: `Search query: "${query}"

          Search results:
          ${uniqueResults.map((r: any) => `
          Title: ${r.title}
          Content: ${r.content}
          URL: ${r.url}
          `).join('\n')}

          Please provide a comprehensive answer based on these search results.`
        }
      ]
    });

    console.log(`Final number of citations: ${citations.length}`);

    return {
      response: completion.choices[0].message.content || "No response generated",
      citations,
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