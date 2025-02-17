import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isErrorResponse } from "@/lib/api-types";

interface PaperSummary {
  title: string;
  mainFindings: string;
  methodology: string;
  outcomes: string;
}

interface SummaryResponse {
  summaries: PaperSummary[];
  overview: string;
}

export function SummaryTab() {
  const [query, setQuery] = useState("");
  const { toast } = useToast();

  const summaryMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      console.log("Sending search query:", searchQuery);
      const res = await apiRequest("POST", "/api/summarize", { query: searchQuery });
      const data = await res.json();
      console.log("Received summary response:", data);

      if (isErrorResponse(data)) {
        throw new Error(data.error);
      }

      return data as SummaryResponse;
    },
    onError: (error: Error) => {
      console.error("Summary error:", error);
      toast({
        title: "Summary Generation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    console.log("Starting summary generation for query:", query);
    summaryMutation.mutate(query);
  };

  // Debug output
  console.log("Current mutation state:", {
    isPending: summaryMutation.isPending,
    isError: summaryMutation.isError,
    error: summaryMutation.error,
    data: summaryMutation.data
  });

  return (
    <div className="space-y-8">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your research topic for a comprehensive summary..."
          className="flex-1"
        />
        <Button type="submit" disabled={summaryMutation.isPending}>
          Generate Summary
        </Button>
      </form>

      {/* Error state */}
      {summaryMutation.isError && (
        <Card className="border-destructive">
          <CardContent className="p-6 text-destructive">
            {summaryMutation.error?.message || "An error occurred while generating the summary"}
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {summaryMutation.isPending && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {/* Results */}
      {summaryMutation.data && (
        <div className="space-y-6">
          {/* Overview Card */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2">Overview</h3>
              <p className="text-muted-foreground whitespace-pre-line">
                {summaryMutation.data.overview}
              </p>
            </CardContent>
          </Card>

          {/* Results Table */}
          {summaryMutation.data.summaries && summaryMutation.data.summaries.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Paper</TableHead>
                    <TableHead className="w-[250px]">Main Findings</TableHead>
                    <TableHead className="w-[250px]">Methodology</TableHead>
                    <TableHead>Outcomes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryMutation.data.summaries.map((summary, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium align-top">{summary.title}</TableCell>
                      <TableCell className="align-top">{summary.mainFindings}</TableCell>
                      <TableCell className="align-top">{summary.methodology}</TableCell>
                      <TableCell className="align-top">{summary.outcomes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}