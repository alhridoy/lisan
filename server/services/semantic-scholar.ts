import axios from "axios";

const API_URL = "https://api.semanticscholar.org/graph/v1";

export async function searchSemanticScholar(query: string, offset = 0, limit = 10) {
  const response = await axios.get(`${API_URL}/paper/search`, {
    params: {
      query,
      offset,
      limit,
      fields: "title,abstract,authors,url,paperId,year,venue"
    }
  });

  if (!response.data || !Array.isArray(response.data.data)) {
    console.error("Unexpected API response:", response.data);
    return [];
  }

  return response.data.data.map((paper: any) => ({
    title: paper.title || "Untitled",
    abstract: paper.abstract || "No abstract available",
    authors: (paper.authors || []).map((author: any) => author.name || "Unknown"),
    url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
    sourceId: paper.paperId,
    source: "semantic-scholar",
    pdf_url: null,
    metadata: {
      year: paper.year,
      venue: paper.venue,
      original_response: paper
    }
  }));
}