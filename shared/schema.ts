import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const papers = pgTable("papers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  abstract: text("abstract").notNull(),
  authors: text("authors").array().notNull(),
  url: text("url").notNull(),
  source: text("source").notNull(), // "arxiv" or "semantic-scholar"
  sourceId: text("source_id").notNull(),
  summary: text("summary"),
  pdf_url: text("pdf_url"),
  cached_at: timestamp("cached_at").notNull().defaultNow(),
  metadata: jsonb("metadata").notNull()
});

export const insertPaperSchema = createInsertSchema(papers).omit({
  id: true,
  cached_at: true
});

export type InsertPaper = z.infer<typeof insertPaperSchema>;
export type Paper = typeof papers.$inferSelect;

export const searchHistorySchema = z.object({
  query: z.string(),
  timestamp: z.date()
});

export type SearchHistory = z.infer<typeof searchHistorySchema>;
