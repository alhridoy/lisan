import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isErrorResponse } from "@/lib/api-types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

interface SeedIdea {
  title: string;
  description: string;
}

interface ExpandedIdea {
  title: string;
  problem_statement: string;
  existing_methods: string;
  motivation: string;
  proposed_method: string;
}

interface IdeaEvaluation {
  novelty: {
    score: number;
    justification: string;
  };
  feasibility: {
    score: number;
    justification: string;
  };
  potential_impact: {
    score: number;
    justification: string;
  };
  overall_score: number;
}

interface RankedIdea {
  idea: ExpandedIdea;
  evaluation: IdeaEvaluation;
}

export function NovelResearchTab() {
  const [topic, setTopic] = useState("");
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async (searchTopic: string) => {
      const res = await apiRequest("POST", "/api/novel-ideas", { topic: searchTopic });
      const data = await res.json();

      if (isErrorResponse(data)) {
        throw new Error(data.error);
      }

      return data as RankedIdea[];
    },
    onError: (error: Error) => {
      console.error("Novel ideas generation error:", error);
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    generateMutation.mutate(topic);
  };

  const renderScore = (score: number, label: string) => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span>{score.toFixed(1)}/10</span>
      </div>
      <Progress value={score * 10} className="h-2" />
    </div>
  );

  return (
    <div className="space-y-8">
      <form onSubmit={handleGenerate} className="flex gap-2">
        <Input
          placeholder="Enter research topic to generate novel ideas..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={generateMutation.isPending}>
          {generateMutation.isPending ? "Generating..." : "Generate Ideas"}
        </Button>
      </form>

      {generateMutation.isPending && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      )}

      {generateMutation.data && (
        <div className="space-y-6">
          {generateMutation.data.map((rankedIdea, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{rankedIdea.idea.title}</span>
                  <span className="text-lg font-semibold">
                    Score: {rankedIdea.evaluation.overall_score.toFixed(1)}/10
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Problem Statement</h3>
                    <p>{rankedIdea.idea.problem_statement}</p>
                    <h3 className="font-semibold">Motivation</h3>
                    <p>{rankedIdea.idea.motivation}</p>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold">Evaluation Scores</h3>
                    {renderScore(rankedIdea.evaluation.novelty.score, "Novelty")}
                    {renderScore(rankedIdea.evaluation.feasibility.score, "Feasibility")}
                    {renderScore(rankedIdea.evaluation.potential_impact.score, "Impact")}
                    <div className="mt-4">
                      <h4 className="font-semibold">Justifications</h4>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Novelty</TableCell>
                            <TableCell>{rankedIdea.evaluation.novelty.justification}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Feasibility</TableCell>
                            <TableCell>{rankedIdea.evaluation.feasibility.justification}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Impact</TableCell>
                            <TableCell>{rankedIdea.evaluation.potential_impact.justification}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Proposed Method</h3>
                  <p>{rankedIdea.idea.proposed_method}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
