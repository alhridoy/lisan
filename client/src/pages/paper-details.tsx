import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Paper } from "@shared/schema";

export default function PaperDetails() {
  const [, params] = useRoute("/paper/:id");
  const paperId = params?.id;

  const { data: paper, isLoading } = useQuery<Paper>({
    queryKey: [`/api/papers/${paperId}`],
    enabled: !!paperId
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-8 w-48 mb-8" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Paper not found</h1>
        <Link href="/">
          <Button>Return to Search</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Search
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{paper.title}</CardTitle>
            <p className="text-muted-foreground">
              {paper.authors.join(", ")}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <a href={paper.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Source
                </Button>
              </a>
              {paper.pdf_url && (
                <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </a>
              )}
            </div>

            {paper.summary && (
              <div>
                <h3 className="font-semibold mb-2">Summary</h3>
                <p className="text-muted-foreground">{paper.summary}</p>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Abstract</h3>
              <p className="text-muted-foreground">{paper.abstract}</p>
            </div>

            {paper.metadata && (
              <div>
                <h3 className="font-semibold mb-2">Additional Information</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  {paper.metadata.year && (
                    <>
                      <dt className="font-medium">Year</dt>
                      <dd className="text-muted-foreground">{paper.metadata.year}</dd>
                    </>
                  )}
                  {paper.metadata.venue && (
                    <>
                      <dt className="font-medium">Venue</dt>
                      <dd className="text-muted-foreground">{paper.metadata.venue}</dd>
                    </>
                  )}
                </dl>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}