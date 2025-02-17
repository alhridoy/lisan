import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, Sparkles, Search, Globe, Link, CheckCircle2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  searchStatus?: {
    queries?: string[];
    searched?: boolean;
    sourcesFound?: number;
  };
}

interface ChatInterfaceProps {
  title?: string;
  context: string;
  onSendMessage: (message: string, type?: "chat" | "web-search") => Promise<void>;
  messages: Message[];
  isLoading?: boolean;
  className?: string;
}

export function ChatInterface({
  title = "Chat",
  context,
  onSendMessage,
  messages,
  isLoading,
  className,
}: ChatInterfaceProps) {
  const [input, setInput] = React.useState("");
  const [isWebSearch, setIsWebSearch] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input;
    setInput("");
    await onSendMessage(message, isWebSearch ? "web-search" : "chat");
  };

  return (
    <Card className={cn("flex flex-col h-[600px]", className)}>
      <div className="px-4 py-2 border-b bg-muted/50 flex justify-between items-center">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          {isWebSearch ? <Globe className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Web Search</span>
          <Switch
            checked={isWebSearch}
            onCheckedChange={setIsWebSearch}
            aria-label="Toggle web search"
          />
        </div>
      </div>
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {context && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                {isWebSearch
                  ? "Ask anything and I'll search the web for comprehensive answers with citations."
                  : context}
              </p>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-2 text-sm",
                message.role === "assistant" ? "items-start" : "items-start flex-row-reverse"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  message.role === "assistant" ? "bg-primary/10" : "bg-muted"
                )}
              >
                {message.role === "assistant" ? (
                  isWebSearch ? (
                    <Globe className="w-4 h-4 text-primary" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-primary" />
                  )
                ) : (
                  <MessageCircle className="w-4 h-4" />
                )}
              </div>
              <div
                className={cn(
                  "rounded-lg px-3 py-2 max-w-[80%] space-y-2",
                  message.role === "assistant"
                    ? "bg-muted/50 text-foreground"
                    : "bg-primary text-primary-foreground"
                )}
              >
                {message.searchStatus?.queries && (
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-muted-foreground">To provide the best answer, I will research different possible meanings:</p>
                    {message.searchStatus.queries.map((query, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm">{query}</p>
                      </div>
                    ))}
                    {message.searchStatus.searched && (
                      <div className="flex items-center gap-2 text-primary">
                        <CheckCircle2 className="w-4 h-4" />
                        <p className="text-sm">Searched the web</p>
                      </div>
                    )}
                    {message.searchStatus.sourcesFound !== undefined && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm">Found {message.searchStatus.sourcesFound} web sources</p>
                      </div>
                    )}
                  </div>
                )}
                <div>{message.content}</div>
                {message.role === "assistant" && message.citations && message.citations.length > 0 && (
                  <div className="border-t pt-2 mt-2 space-y-1">
                    <p className="text-xs font-medium flex items-center gap-1">
                      <Link className="w-3 h-3" />
                      Sources:
                    </p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      {message.citations.map((citation, i) => (
                        <li key={i}>
                          <a
                            href={citation}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline hover:text-primary"
                          >
                            {citation}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 items-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                {isWebSearch ? (
                  <Globe className="w-4 h-4 text-primary animate-pulse" />
                ) : (
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                )}
              </div>
              <div className="bg-muted/50 rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <span className="animate-bounce">•</span>
                  <span className="animate-bounce delay-100">•</span>
                  <span className="animate-bounce delay-200">•</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <Input
          placeholder={isWebSearch ? "Search the web..." : "Type a message..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          {isWebSearch ? (
            <Search className="w-4 h-4" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </Card>
  );
}