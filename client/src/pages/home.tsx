import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Table } from "lucide-react";
import SearchTab from "@/components/SearchTab";
import SummaryTab from "@/components/SummaryTab";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Academic Paper Search & Analysis
            </h1>
            <p className="text-muted-foreground">
              Search and analyze academic papers from arXiv and Semantic Scholar
            </p>
          </div>

          <Tabs defaultValue="search" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search" className="space-x-2">
                <Search className="h-4 w-4" />
                <span>Semantic Search</span>
              </TabsTrigger>
              <TabsTrigger value="summary" className="space-x-2">
                <Table className="h-4 w-4" />
                <span>Research Summary</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="search">
              <SearchTab />
            </TabsContent>
            <TabsContent value="summary">
              <SummaryTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

function PaperList({ papers }: { papers: Paper[] }) {
  if (papers.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No papers found matching your query
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {papers.map((paper) => (
        <Link key={paper.id} href={`/paper/${paper.id}`}>
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardContent className="p-4">
              <h2 className="font-semibold mb-2 text-lg">{paper.title}</h2>
              <p className="text-sm text-muted-foreground mb-2">
                {paper.authors.join(", ")}
              </p>
              <p className="text-sm line-clamp-2">{paper.summary || paper.abstract}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}