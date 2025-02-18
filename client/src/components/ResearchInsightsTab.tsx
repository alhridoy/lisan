import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isErrorResponse } from "@/lib/api-types";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  TrendingUp, 
  BookOpen, 
  Star, 
  ArrowRight, 
  Lightbulb,
  Target
} from "lucide-react";

interface Recommendation {
  title: string;
  reason: string;
  relevance_score: number;
}

interface ResearchTrend {
  name: string;
  description: string;
  timeline: string;
  key_papers: string[];
  impact_score: number;
}

interface Methodology {
  name: string;
  description: string;
  advantages: string[];
  adoption_rate: string;
}

interface ResearchGap {
  area: string;
  description: string;
  opportunity_level: string;
}

interface Prediction {
  prediction: string;
  likelihood: string;
  potential_impact: string;
  timeframe: string;
}

interface TrendsAnalysis {
  trends: ResearchTrend[];
  methodologies: Methodology[];
  research_gaps: ResearchGap[];
  predictions: Prediction[];
}

export function ResearchInsightsTab() {
  const [topic, setTopic] = useState("");
  const { toast } = useToast();

  const recommendationsMutation = useMutation({
    mutationFn: async (topic: string) => {
      const res = await apiRequest("POST", "/api/recommendations", { topic });
      const data = await res.json();
      if (isErrorResponse(data)) {
        throw new Error(data.error);
      }
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Recommendations Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const trendsMutation = useMutation({
    mutationFn: async (topic: string) => {
      const res = await apiRequest("POST", "/api/research-trends", { 
        topic,
        timeframe: "Recent" 
      });
      const data = await res.json();
      if (isErrorResponse(data)) {
        throw new Error(data.error);
      }
      return data as TrendsAnalysis;
    },
    onError: (error: Error) => {
      toast({
        title: "Trends Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    
    await Promise.all([
      recommendationsMutation.mutate(topic),
      trendsMutation.mutate(topic)
    ]);
  };

  const renderRecommendations = (recommendations: Recommendation[]) => (
    <div className="space-y-4">
      {recommendations.map((rec, index) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-2 flex-1">
                <h4 className="font-semibold">{rec.title}</h4>
                <p className="text-sm text-muted-foreground">{rec.reason}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Relevance:</span>
                  <Progress value={rec.relevance_score * 100} className="h-2 flex-1" />
                  <span className="text-sm font-medium">{(rec.relevance_score * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderTrends = (trends: ResearchTrend[]) => (
    <div className="space-y-4">
      {trends.map((trend, index) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-2 flex-1">
                <h4 className="font-semibold">{trend.name}</h4>
                <p className="text-sm text-muted-foreground">{trend.description}</p>
                <div className="text-sm">
                  <span className="font-medium">Timeline:</span> {trend.timeline}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Impact:</span>
                  <Progress value={trend.impact_score * 100} className="h-2 flex-1" />
                  <span className="text-sm font-medium">{(trend.impact_score * 100).toFixed(0)}%</span>
                </div>
                {trend.key_papers.length > 0 && (
                  <div className="mt-2">
                    <span className="text-sm font-medium">Key Papers:</span>
                    <ul className="mt-1 space-y-1">
                      {trend.key_papers.map((paper, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          • {paper}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderMethodologies = (methodologies: Methodology[]) => (
    <div className="space-y-4">
      {methodologies.map((method, index) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-2 flex-1">
                <h4 className="font-semibold">{method.name}</h4>
                <p className="text-sm text-muted-foreground">{method.description}</p>
                <div className="space-y-1">
                  <span className="text-sm font-medium">Advantages:</span>
                  <ul className="space-y-1">
                    {method.advantages.map((advantage, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {advantage}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Adoption Rate:</span> {method.adoption_rate}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderPredictions = (predictions: Prediction[]) => (
    <div className="space-y-4">
      {predictions.map((prediction, index) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <Lightbulb className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-2 flex-1">
                <h4 className="font-semibold">{prediction.prediction}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Likelihood:</span> {prediction.likelihood}
                  </div>
                  <div>
                    <span className="font-medium">Timeframe:</span> {prediction.timeframe}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Potential Impact:</span> {prediction.potential_impact}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <form onSubmit={handleAnalyze} className="flex gap-2">
        <Input
          placeholder="Enter research topic to analyze trends and get recommendations..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="flex-1"
        />
        <Button 
          type="submit" 
          disabled={recommendationsMutation.isPending || trendsMutation.isPending}
        >
          {recommendationsMutation.isPending || trendsMutation.isPending
            ? "Analyzing..."
            : "Analyze Research"}
        </Button>
      </form>

      {(recommendationsMutation.isPending || trendsMutation.isPending) && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {(recommendationsMutation.data || trendsMutation.data) && (
        <Tabs defaultValue="recommendations" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="recommendations">
              <Star className="w-4 h-4 mr-2" />
              Recommendations
            </TabsTrigger>
            <TabsTrigger value="trends">
              <TrendingUp className="w-4 h-4 mr-2" />
              Research Trends
            </TabsTrigger>
            <TabsTrigger value="methodologies">
              <Target className="w-4 h-4 mr-2" />
              Methodologies
            </TabsTrigger>
            <TabsTrigger value="predictions">
              <Lightbulb className="w-4 h-4 mr-2" />
              Predictions
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[600px] mt-4">
            <TabsContent value="recommendations" className="mt-0">
              {recommendationsMutation.data?.recommendations && 
                renderRecommendations(recommendationsMutation.data.recommendations)}
            </TabsContent>

            <TabsContent value="trends" className="mt-0">
              {trendsMutation.data?.trends && 
                renderTrends(trendsMutation.data.trends)}
            </TabsContent>

            <TabsContent value="methodologies" className="mt-0">
              {trendsMutation.data?.methodologies && 
                renderMethodologies(trendsMutation.data.methodologies)}
            </TabsContent>

            <TabsContent value="predictions" className="mt-0">
              {trendsMutation.data?.predictions && 
                renderPredictions(trendsMutation.data.predictions)}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      )}
    </div>
  );
}
