import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SearchResponse } from "@/lib/api-types";
import type { Paper, SearchHistory } from "@shared/schema";

export default function Home() {
  const [query, setQuery] = useState("");
  const { toast } = useToast();

  const { data: recentSearches } = useQuery<SearchHistory[]>({
    queryKey: ["/api/recent-searches"]
  });

  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const res = await apiRequest("POST", "/api/search", { query: searchQuery });
      return res.json() as Promise<SearchResponse>;
    },
    onError: (error) => {
      toast({
        title: "Search Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    searchMutation.mutate(query);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Academic Paper Search
            </h1>
            <p className="text-muted-foreground">
              Semantic search across arXiv and Semantic Scholar papers
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your research query..."
              className="flex-1"
            />
            <Button type="submit" disabled={searchMutation.isPending}>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </form>

          {/* Search Results */}
          <div className="space-y-4">
            {searchMutation.isPending ? (
              Array(3)
                .fill(0)
                .map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))
            ) : searchMutation.data?.results ? (
              <PaperList papers={searchMutation.data.results} />
            ) : null}
          </div>

          {/* Recent Searches */}
          {recentSearches?.length > 0 && !searchMutation.data && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Searches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuery(search.query);
                        searchMutation.mutate(search.query);
                      }}
                    >
                      {search.query}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
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