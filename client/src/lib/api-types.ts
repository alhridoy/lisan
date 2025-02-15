import type { Paper, SearchHistory } from "@shared/schema";

export interface SearchResponse {
  results: Paper[];
}

export interface ErrorResponse {
  error: string;
}

export type ApiResponse<T> = T | ErrorResponse;

export function isErrorResponse(response: any): response is ErrorResponse {
  return typeof response === "object" && "error" in response;
}
