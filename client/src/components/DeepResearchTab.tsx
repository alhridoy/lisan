import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isErrorResponse } from "@/lib/api-types";

interface StudyAnalysis {
  study: string;
  studyType: string;
  researchFocus: string;
  analysis: string;
  references: string[];
}

interface DeepResearchResponse {
  abstractAndMethod: string;
  studies: StudyAnalysis[];
}

export function DeepResearchTab() {
  const [query, setQuery] = useState("");
  const { toast } = useToast();

  const researchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      console.log("Starting deep research analysis for:", searchQuery);
      const res = await apiRequest("POST", "/api/deep-research", { query: searchQuery });
      const data = await res.json();
      console.log("Received deep research response:", data);

      if (isErrorResponse(data)) {
        throw new Error(data.error);
      }

      return data as DeepResearchResponse;
    },
    onError: (error: Error) => {
      console.error("Deep research error:", error);
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    researchMutation.mutate(query);
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Enter your research query..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={researchMutation.isPending}>
          {researchMutation.isPending ? "Analyzing..." : "Analyze"}
        </Button>
      </form>

      {/* Error state */}
      {researchMutation.isError && (
        <Card className="border-destructive">
          <CardContent className="p-6 text-destructive">
            {researchMutation.error?.message || "An error occurred during analysis"}
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {researchMutation.isPending && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      )}

      {/* Results */}
      {researchMutation.data && (
        <div className="space-y-6">
          {/* Abstract & Method Section */}
          <Card>
            <CardHeader>
              <CardTitle>Abstract & Method</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{researchMutation.data.abstractAndMethod}</p>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Research Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Study</TableHead>
                      <TableHead>Study Type</TableHead>
                      <TableHead>Research Focus</TableHead>
                      <TableHead>Analysis</TableHead>
                      <TableHead>References</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {researchMutation.data.studies.map((study, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{study.study}</TableCell>
                        <TableCell>{study.studyType}</TableCell>
                        <TableCell>{study.researchFocus}</TableCell>
                        <TableCell className="max-w-md">{study.analysis}</TableCell>
                        <TableCell className="max-w-xs">
                          <ul className="list-disc pl-4">
                            {study.references.map((ref, i) => (
                              <li key={i} className="text-sm">{ref}</li>
                            ))}
                          </ul>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
