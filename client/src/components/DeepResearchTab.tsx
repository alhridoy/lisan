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
import { KnowledgeGraph } from "./KnowledgeGraph";
import { ChatInterface } from "@/components/ui/chat";
import { SplitPane } from "@/components/ui/split-pane";

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
  visualization?: {
    points: Array<{
      x: number;
      y: number;
      isOutlier: boolean;
      title: string;
      authors: string[];
    }>;
  };
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function DeepResearchTab() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
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

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/chat", {
        message,
        context: JSON.stringify(researchMutation.data),
        type: "deep-research"
      });
      const data = await res.json();

      if (isErrorResponse(data)) {
        throw new Error(data.error);
      }

      return data.response as string;
    },
    onSuccess: (response, message) => {
      setMessages(prev => [
        ...prev,
        { role: "user", content: message },
        { role: "assistant", content: response }
      ]);
    },
    onError: (error) => {
      toast({
        title: "Chat Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    researchMutation.mutate(query);
    setMessages([]);
  };

  const handleSendMessage = async (message: string) => {
    await chatMutation.mutate(message);
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

  // Helper function to extract section content
  const extractSection = (text: string | undefined | null, sectionName: string, endSection?: string) => {
    if (!text || typeof text !== 'string') return "";

    const sections = text.split(/\n(?=\w+:|\w+ Metrics:|\w+ Requirements:)/);
    const section = sections.find(s => s.trim().startsWith(sectionName));
    if (!section) return "";

    if (endSection) {
      const parts = section.split(endSection);
      return parts[0].trim();
    }
    return section.trim();
  };

  const extractReferences = (text: string | undefined | null): string[] => {
    if (!text || typeof text !== 'string') return [];

    const referencesSection = text.split('References')[1];
    if (!referencesSection) return [];

    return referencesSection
      .trim()
      .split('\n')
      .filter(ref => ref.trim())
      .map(ref => ref.trim());
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

      {researchMutation.isError && (
        <Card className="border-destructive">
          <CardContent className="p-6 text-destructive">
            {researchMutation.error?.message || "An error occurred during analysis"}
          </CardContent>
        </Card>
      )}

      {researchMutation.isPending && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      )}

      {researchMutation.data && (
        <SplitPane
          left={
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>Research Analysis</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none space-y-6">
                    <div>
                      <h3 className="font-semibold text-lg">Abstract & Method</h3>
                      <p className="mt-2">{researchMutation.data.abstractAndMethod}</p>
                    </div>

                    {researchMutation.data?.visualization && (
                      <div>
                        <h3 className="font-semibold text-lg mb-4">Knowledge Graph</h3>
                        <KnowledgeGraph
                          points={researchMutation.data.visualization.points}
                          query={query}
                        />
                      </div>
                    )}

                    <div>
                      <h3 className="font-semibold text-lg mb-4">Detailed Analysis</h3>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Study</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Focus</TableHead>
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
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg">Cross-Study Analysis</h3>
                      <div className="mt-2 whitespace-pre-wrap">
                        {extractSection(researchMutation.data.fullText, "Cross-Study Analysis", "Success Metrics")}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg">Implementation Insights</h3>
                      <div className="mt-2 space-y-4">
                        <div>
                          <h4 className="font-medium">Success Metrics</h4>
                          <p className="whitespace-pre-wrap">
                            {extractSection(researchMutation.data.fullText, "Success Metrics", "Implementation Requirements")}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium">Implementation Requirements</h4>
                          <p className="whitespace-pre-wrap">
                            {extractSection(researchMutation.data.fullText, "Implementation Requirements", "References")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg">References</h3>
                      <div className="mt-2 space-y-2">
                        {extractReferences(researchMutation.data?.fullText).map((reference, index) => (
                          <p key={index} className="text-sm">
                            {reference}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          }
          right={
            <ChatInterface
              title="Discuss Research Analysis"
              context="Ask questions about the research analysis, methodology, findings, or request clarification on specific aspects."
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={chatMutation.isPending}
            />
          }
        />
      )}
    </div>
  );
}