import axios from "axios";

const ARXIV_API_URL = "http://export.arxiv.org/api/query";

export async function searchArxiv(query: string, start = 0, maxResults = 10) {
  const params = new URLSearchParams({
    search_query: query,
    start: start.toString(),
    max_results: maxResults.toString()
  });

  const response = await axios.get(`${ARXIV_API_URL}?${params}`);
  const xmlData = response.data;

  // Parse XML response to extract papers
  const papers = [];
  const entries = xmlData.match(/<entry>([\s\S]*?)<\/entry>/g) || [];

  for (const entry of entries) {
    const title = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.trim();
    const abstract = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1]?.trim();
    const id = entry.match(/<id[^>]*>([\s\S]*?)<\/id>/)?.[1]?.trim();
    const pdfUrl = entry.match(/<link[^>]*title="pdf"[^>]*href="([^"]*)">/)?.[1];
    
    const authors = [];
    const authorMatches = entry.matchAll(/<author[^>]*><name[^>]*>([\s\S]*?)<\/name><\/author>/g);
    for (const match of authorMatches) {
      authors.push(match[1].trim());
    }

    if (title && abstract && id) {
      papers.push({
        title,
        abstract,
        authors,
        url: id,
        sourceId: id.split("/").pop(),
        pdf_url: pdfUrl,
        source: "arxiv",
        metadata: { original_response: entry }
      });
    }
  }

  return papers;
}
