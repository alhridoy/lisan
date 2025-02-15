import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

export default function SummaryTab() {
  const [query, setQuery] = useState("");
  const { toast } = useToast();

  const summaryMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const res = await apiRequest("POST", "/api/summarize", { query: searchQuery });
      return res.json() as Promise<SummaryResponse>;
    },
    onError: (error) => {
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
    summaryMutation.mutate(query);
  };

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
          <Search className="mr-2 h-4 w-4" />
          Generate Summary
        </Button>
      </form>

      {summaryMutation.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : summaryMutation.data ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2">Overview</h3>
              <p className="text-muted-foreground">{summaryMutation.data.overview}</p>
            </CardContent>
          </Card>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Paper</TableHead>
                  <TableHead>Main Findings</TableHead>
                  <TableHead>Methodology</TableHead>
                  <TableHead>Outcomes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryMutation.data.summaries.map((summary, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{summary.title}</TableCell>
                    <TableCell>{summary.mainFindings}</TableCell>
                    <TableCell>{summary.methodology}</TableCell>
                    <TableCell>{summary.outcomes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </div>
  );
}