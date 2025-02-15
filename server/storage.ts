import { type Paper, type InsertPaper, type SearchHistory } from "@shared/schema";

export interface IStorage {
  getPaper(id: number): Promise<Paper | undefined>;
  insertPaper(paper: InsertPaper): Promise<Paper>;
  findPaperBySourceId(sourceId: string): Promise<Paper | undefined>;
  getRecentSearches(): Promise<SearchHistory[]>;
  addSearchHistory(search: SearchHistory): Promise<void>;
}

export class MemStorage implements IStorage {
  private papers: Map<number, Paper>;
  private searches: SearchHistory[];
  private currentId: number;

  constructor() {
    this.papers = new Map();
    this.searches = [];
    this.currentId = 1;
  }

  async getPaper(id: number): Promise<Paper | undefined> {
    return this.papers.get(id);
  }

  async insertPaper(insertPaper: InsertPaper): Promise<Paper> {
    const id = this.currentId++;
    const paper: Paper = {
      ...insertPaper,
      id,
      cached_at: new Date(),
      summary: insertPaper.summary || null,
      pdf_url: insertPaper.pdf_url || null
    };
    this.papers.set(id, paper);
    return paper;
  }

  async findPaperBySourceId(sourceId: string): Promise<Paper | undefined> {
    return Array.from(this.papers.values()).find(
      (paper) => paper.sourceId === sourceId
    );
  }

  async getRecentSearches(): Promise<SearchHistory[]> {
    return this.searches
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }

  async addSearchHistory(search: SearchHistory): Promise<void> {
    this.searches.push(search);
    if (this.searches.length > 100) {
      this.searches.shift();
    }
  }
}

export const storage = new MemStorage();