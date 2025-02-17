import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Point {
  x: number;
  y: number;
  isOutlier: boolean;
  title: string;
  authors: string[];
  topic?: string;
}

interface KnowledgeGraphProps {
  points: Point[];
  query: string;
}

export function KnowledgeGraph({ points, query }: KnowledgeGraphProps) {
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!plotRef.current || !points.length) return;

    const outliers = points.filter(p => p.isOutlier);
    const nonOutliers = points.filter(p => !p.isOutlier);

    // Create heatmap data
    const heatmapData = {
      x: points.map(p => p.x),
      y: points.map(p => p.y),
      type: 'histogram2dcontour',
      colorscale: 'Viridis',
      showscale: false,
      ncontours: 20,
      opacity: 0.5,
      name: 'Paper Density'
    };

    // Create scatter plot data
    const scatterData = [
      {
        x: nonOutliers.map(p => p.x),
        y: nonOutliers.map(p => p.y),
        mode: 'markers+text',
        type: 'scatter',
        name: 'Non-outliers',
        marker: {
          color: 'rgb(66, 135, 245)',
          size: 8
        },
        text: nonOutliers.map(p => p.topic || ''),
        textposition: 'top center',
        hovertext: nonOutliers.map(p => `${p.title}<br>Authors: ${p.authors.join(', ')}`),
        hoverinfo: 'text'
      },
      {
        x: outliers.map(p => p.x),
        y: outliers.map(p => p.y),
        mode: 'markers+text',
        type: 'scatter',
        name: 'Outliers',
        marker: {
          color: 'rgb(255, 65, 54)',
          size: 8
        },
        text: outliers.map(p => p.topic || ''),
        textposition: 'top center',
        hovertext: outliers.map(p => `${p.title}<br>Authors: ${p.authors.join(', ')}`),
        hoverinfo: 'text'
      }
    ];

    const layout = {
      title: `Literature Corpus Distribution for Query: "${query}"`,
      showlegend: true,
      hovermode: 'closest',
      xaxis: {
        title: 'UMAP dimension 1',
        showgrid: false,
        zeroline: false
      },
      yaxis: {
        title: 'UMAP dimension 2',
        showgrid: false,
        zeroline: false
      },
      plot_bgcolor: 'rgb(240, 240, 250)',
      paper_bgcolor: 'rgb(250, 250, 250)',
      margin: { t: 50, b: 50, l: 50, r: 50 },
      annotations: points
        .filter(p => p.topic)
        .map(p => ({
          x: p.x,
          y: p.y,
          text: p.topic,
          showarrow: false,
          font: {
            size: 10
          }
        }))
    };

    // Plot both heatmap and scatter plots
    Plotly.newPlot(plotRef.current, [heatmapData, ...scatterData], layout, {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      toImageButtonOptions: {
        format: 'png',
        filename: 'knowledge_graph',
        height: 800,
        width: 1200,
        scale: 2
      }
    });

    return () => {
      if (plotRef.current) {
        Plotly.purge(plotRef.current);
      }
    };
  }, [points, query]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge Graph Visualization</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={plotRef} style={{ width: '100%', height: '600px' }} />
      </CardContent>
    </Card>
  );
}