import * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";
import { cn } from "@/lib/utils";

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultSizes?: number[];
  className?: string;
}

export function SplitPane({
  left,
  right,
  defaultSizes = [60, 40],
  className
}: SplitPaneProps) {
  return (
    <ResizablePrimitive.PanelGroup
      direction="horizontal"
      className={cn("min-h-[200px] rounded-lg border", className)}
    >
      <ResizablePrimitive.Panel
        defaultSize={defaultSizes[0]}
        className="p-4"
      >
        {left}
      </ResizablePrimitive.Panel>
      <ResizablePrimitive.PanelResizeHandle className="w-2 bg-border hover:bg-primary/20 transition-colors" />
      <ResizablePrimitive.Panel
        defaultSize={defaultSizes[1]}
        className="p-4"
      >
        {right}
      </ResizablePrimitive.Panel>
    </ResizablePrimitive.PanelGroup>
  );
}
