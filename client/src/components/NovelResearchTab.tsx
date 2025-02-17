import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isErrorResponse } from "@/lib/api-types";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ChatInterface } from "@/components/ui/chat";
import { SplitPane } from "@/components/ui/split-pane";
import { cn } from "@/lib/utils";

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
  related_papers: string[];
}

interface RankedIdea {
  idea: ExpandedIdea;
  evaluation: IdeaEvaluation;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function NovelResearchTab() {
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<RankedIdea | null>(null);
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

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      try {
        const res = await apiRequest("POST", "/api/chat", {
          message,
          context: selectedIdea
            ? JSON.stringify(selectedIdea)
            : JSON.stringify(generateMutation.data),
          type: "novel-ideas"
        });

        // Check if response is not JSON
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response from server");
        }

        const data = await res.json();

        if (isErrorResponse(data)) {
          throw new Error(data.error);
        }

        return data.response as string;
      } catch (error: any) {
        console.error("Chat error:", error);
        throw new Error("Failed to send message. Please try again.");
      }
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

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    generateMutation.mutate(topic);
    setMessages([]);
    setSelectedIdea(null);
  };

  const handleSendMessage = async (message: string) => {
    await chatMutation.mutate(message);
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
        <SplitPane
          left={
            <div className="space-y-6 pr-4">
              {generateMutation.data.map((rankedIdea, index) => (
                <Card
                  key={index}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedIdea === rankedIdea ? "border-primary" : "hover:border-primary/50"
                  )}
                  onClick={() => setSelectedIdea(rankedIdea)}
                >
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
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-semibold">Existing Methods & Limitations</h3>
                      <p>{rankedIdea.idea.existing_methods}</p>
                      <h3 className="font-semibold">Proposed Method</h3>
                      <p>{rankedIdea.idea.proposed_method}</p>
                      <h3 className="font-semibold">Related Papers</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {rankedIdea.evaluation.related_papers.map((paper, i) => (
                          <li key={i} className="text-sm text-muted-foreground">{paper}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          }
          right={
            <ChatInterface
              title={selectedIdea ? `Discuss: ${selectedIdea.idea.title}` : "Discuss Generated Ideas"}
              context={
                selectedIdea
                  ? "Ask questions about this research idea and its implications."
                  : "Ask questions about any of the generated research ideas."
              }
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