import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isErrorResponse } from "@/lib/api-types";
import { ChatInterface } from "@/components/ui/chat";
import { SplitPane } from "@/components/ui/split-pane";

interface PeerReviewResponse {
  generalFeedback: string;
  methodologyAnalysis: {
    strengths: string[];
    gaps: string[];
    recommendations: string[];
  };
  literatureReview: {
    relevantPapers: Array<{
      title: string;
      authors: string[];
      year: number;
      relevance: string;
    }>;
    suggestedRemovals: Array<{
      citation: string;
      reason: string;
    }>;
  };
  writingStyle: {
    clarity: string;
    improvements: string[];
  };
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function PeerReviewTab() {
  const [file, setFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();

  const reviewMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/peer-review", formData, {
        isFormData: true,
      });
      const data = await res.json();

      if (isErrorResponse(data)) {
        throw new Error(data.error);
      }

      return data as PeerReviewResponse;
    },
    onError: (error: Error) => {
      console.error("Peer review error:", error);
      toast({
        title: "Review Failed",
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
          context: JSON.stringify(reviewMutation.data),
          type: "peer-review"
        });

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileType = selectedFile.type;
      if (
        fileType === "application/pdf" ||
        fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        setFile(selectedFile);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF or DOCX file",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    reviewMutation.mutate(formData);
    setMessages([]);
  };

  const handleSendMessage = async (message: string) => {
    await chatMutation.mutate(message);
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4">
          <Input
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!file || reviewMutation.isPending}
          >
            {reviewMutation.isPending ? "Analyzing..." : "Review Paper"}
          </Button>
        </div>
        {file && (
          <p className="text-sm text-muted-foreground">
            Selected file: {file.name}
          </p>
        )}
      </form>

      {reviewMutation.isPending && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      )}

      {reviewMutation.data && (
        <SplitPane
          left={
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Peer Review Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">General Feedback</h3>
                    <p className="whitespace-pre-wrap">{reviewMutation.data.generalFeedback}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">Methodology Analysis</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium">Strengths</h4>
                        <ul className="list-disc pl-6 space-y-1">
                          {reviewMutation.data.methodologyAnalysis.strengths.map((strength, i) => (
                            <li key={i}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium">Gaps Identified</h4>
                        <ul className="list-disc pl-6 space-y-1">
                          {reviewMutation.data.methodologyAnalysis.gaps.map((gap, i) => (
                            <li key={i}>{gap}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium">Recommendations</h4>
                        <ul className="list-disc pl-6 space-y-1">
                          {reviewMutation.data.methodologyAnalysis.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">Literature Review Analysis</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium">Relevant Papers to Consider</h4>
                        <div className="space-y-2">
                          {reviewMutation.data.literatureReview.relevantPapers.map((paper, i) => (
                            <div key={i} className="p-3 border rounded-md">
                              <p className="font-medium">{paper.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {paper.authors.join(", ")} ({paper.year})
                              </p>
                              <p className="text-sm mt-1">{paper.relevance}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      {reviewMutation.data.literatureReview.suggestedRemovals.length > 0 && (
                        <div>
                          <h4 className="font-medium">Suggested Citations to Reconsider</h4>
                          <div className="space-y-2">
                            {reviewMutation.data.literatureReview.suggestedRemovals.map((removal, i) => (
                              <div key={i} className="p-3 border rounded-md">
                                <p className="font-medium">{removal.citation}</p>
                                <p className="text-sm mt-1">{removal.reason}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">Writing Style & Clarity</h3>
                    <div className="space-y-2">
                      <p>{reviewMutation.data.writingStyle.clarity}</p>
                      <div>
                        <h4 className="font-medium mt-2">Suggested Improvements</h4>
                        <ul className="list-disc pl-6 space-y-1">
                          {reviewMutation.data.writingStyle.improvements.map((improvement, i) => (
                            <li key={i}>{improvement}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          }
          right={
            <ChatInterface
              title="Discuss Review Feedback"
              context="Ask questions about the peer review feedback, methodology gaps, or recommended papers. Get clarification on specific aspects of the review."
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
