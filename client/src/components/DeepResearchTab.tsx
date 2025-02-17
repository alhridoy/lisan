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
import { Download } from "lucide-react";

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
  fullText: string;
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

  const handleDownload = () => {
    if (!researchMutation.data?.fullText) return;

    const blob = new Blob([researchMutation.data.fullText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Abstract & Method</CardTitle>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
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
                          <ul className="list-disc pl-4 space-y-1">
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

          {/* Cross-Study Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Cross-Study Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap">
                  {researchMutation.data.fullText.split("Cross-Study Analysis")[1]?.split("References")[0] || ""}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Success Metrics & Implementation Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Implementation Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap">
                  {researchMutation.data.fullText.split("Success Metrics:")[1]?.split("References")[0] || ""}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* References */}
          <Card>
            <CardHeader>
              <CardTitle>References</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap">
                  {researchMutation.data.fullText.split("References")[1] || ""}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}