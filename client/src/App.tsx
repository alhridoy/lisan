import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchTab } from "@/components/SearchTab";
import { SummaryTab } from "@/components/SummaryTab";
import { DeepResearchTab } from "@/components/DeepResearchTab";
import { NovelResearchTab } from "@/components/NovelResearchTab";
import PaperDetails from "@/pages/paper-details";
import NotFound from "@/pages/not-found";

function ResearchTabs() {
  return (
    <div className="container py-8 space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Academic Research Assistant</h1>
        <p className="text-muted-foreground">Discover, analyze, and generate novel research ideas with AI-powered insights</p>
      </header>

      <Tabs defaultValue="search">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="deep-research">Deep Research</TabsTrigger>
          <TabsTrigger value="novel-ideas">Novel Ideas</TabsTrigger>
        </TabsList>
        <TabsContent value="search" className="mt-6">
          <SearchTab />
        </TabsContent>
        <TabsContent value="summary" className="mt-6">
          <SummaryTab />
        </TabsContent>
        <TabsContent value="deep-research" className="mt-6">
          <DeepResearchTab />
        </TabsContent>
        <TabsContent value="novel-ideas" className="mt-6">
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">How Novel Ideas Generation Works</h3>
            <p className="text-sm text-muted-foreground">
              This feature analyzes research papers and generates novel research ideas using advanced AI. Each idea is:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
              <li>Evaluated for novelty, feasibility, and potential impact</li>
              <li>Provided with a detailed problem statement and methodology</li>
              <li>Ranked based on overall scientific merit</li>
              <li>Supported by analysis of existing methods and limitations</li>
            </ul>
          </div>
          <NovelResearchTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={ResearchTabs} />
      <Route path="/paper/:id" component={PaperDetails} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}