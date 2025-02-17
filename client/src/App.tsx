import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchTab } from "@/components/SearchTab";
import { SummaryTab } from "@/components/SummaryTab";
import { DeepResearchTab } from "@/components/DeepResearchTab";
import PaperDetails from "@/pages/paper-details";
import NotFound from "@/pages/not-found";

function ResearchTabs() {
  return (
    <div className="container py-8 space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Academic Research Assistant</h1>
        <p className="text-muted-foreground">Discover and analyze academic papers with AI-powered insights</p>
      </header>

      <Tabs defaultValue="search">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="deep-research">Deep Research</TabsTrigger>
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