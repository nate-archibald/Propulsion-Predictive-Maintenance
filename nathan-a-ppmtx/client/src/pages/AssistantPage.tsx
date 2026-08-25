import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Card,
  CardContent,
  Input,
  Button,
} from "@databricks/appkit-ui/react";
import { Bot, User, Send, Sparkles, ChevronDown, ChevronRight, AlertTriangle, RotateCcw } from "lucide-react";

type Role = "user" | "assistant";

interface QueryResult {
  columns: string[];
  rows: string[][];
  title?: string;
}

interface Visualization {
  title: string;
  dataUrl: string;
}

interface ChatMessage {
  role: Role;
  content: string;
  steps?: string[];
  source?: "live" | "mock";
  error?: boolean;
  queryResults?: QueryResult[];
  visualizations?: Visualization[];
}

const SUGGESTIONS = [
  "Which aircraft has the most open propulsion defects?",
  "What are the top ATA chapters by defect count?",
  "Which engine parts are approaching their life-limit?",
  "Summarize propulsion reliability trends over the last quarter.",
];

function StepList({ steps }: { steps: string[] }) {
  const [open, setOpen] = useState(false);
  if (!steps || steps.length === 0) return null;
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {steps.length} reasoning step{steps.length > 1 ? "s" : ""}
      </button>
      {open && (
        <ul className="mt-1 space-y-1 border-l-2 border-muted pl-3">
          {steps.map((s, i) => (
            <li key={i} className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QueryResultTable({ result }: { result: QueryResult }) {
  const [expanded, setExpanded] = useState(true);
  const displayRows = result.rows.slice(0, 50);
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground mb-1"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {result.title ? result.title : "Query results"} ({result.rows.length} rows)
      </button>
      {expanded && (
        <div className="overflow-x-auto rounded border border-border text-xs">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/60">
                {result.columns.map((col, i) => (
                  <th key={i} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap border-b border-border">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1.5 whitespace-nowrap text-muted-foreground">
                      {cell ?? "â€”"}
                    </td>
                  ))}
                </tr>
              ))}
              {result.rows.length > 50 && (
                <tr>
                  <td colSpan={result.columns.length} className="px-2 py-1.5 text-center text-muted-foreground italic">
                    Showing 50 of {result.rows.length} rows
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  function resetConversation() {
    setMessages([]);
    setConversationId(null);
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || sending) return;
    setInput("");
    const nextHistory: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(nextHistory);
    setSending(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
          conversationId: conversationId ?? undefined,
        }),
      });
      const json = await res.json();
      if (json.conversationId) setConversationId(json.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: json.reply ?? "(No response.)",
          steps: Array.isArray(json.steps) ? json.steps : [],
          source: json.source === "live" ? "live" : "mock",
          queryResults: Array.isArray(json.queryResults) ? json.queryResults : undefined,
          visualizations: Array.isArray(json.visualizations) ? json.visualizations : undefined,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry â€” I couldn't reach the Propulsion Assistant. Please try again.",
          error: true,
          source: "mock",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-11rem)]" data-testid="assistant-page">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="assistant-heading">
            <Sparkles className="h-5 w-5 text-primary" />
            Propulsion Assistant
          </h2>
          <p className="text-muted-foreground mt-1">
            Ask questions about propulsion defects, parts, and reliability â€” powered by
            Propulsion Reliability Intelligence.
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={resetConversation} title="Start a new conversation">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            New conversation
          </Button>
        )}
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pr-1"
        data-testid="assistant-messages"
      >
        {messages.length === 0 && !sending && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4">
            <Bot className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground max-w-md">
              Start a conversation with the Propulsion Assistant. Try one of these:
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="text-sm px-3 py-1.5 rounded-full border bg-muted/40 hover:bg-muted transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className={`max-w-[85%] ${m.role === "user" ? "order-first" : ""}`}>
              <Card
                className={
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : m.error
                      ? "border-destructive/40"
                      : ""
                }
              >
                <CardContent className="py-3 px-4">
                  {m.role === "assistant" && !m.error ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed
                      [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>ul>li]:mb-0.5 [&>ol>li]:mb-0.5
                      [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>strong]:font-semibold">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
                  )}

                  {/* Query result tables */}
                  {m.queryResults?.map((qr, qi) => (
                    <QueryResultTable key={qi} result={qr} />
                  ))}

                  {/* Visualization images */}
                  {m.visualizations?.map((viz, vi) => (
                    <div key={vi} className="mt-3">
                      {viz.title && (
                        <p className="text-xs font-medium text-muted-foreground mb-1">{viz.title}</p>
                      )}
                      <img
                        src={viz.dataUrl}
                        alt={viz.title || "Genie chart"}
                        className="rounded border border-border max-w-full"
                      />
                    </div>
                  ))}

                  {m.role === "assistant" && !m.error && m.steps && <StepList steps={m.steps} />}
                  {m.role === "assistant" && m.source === "mock" && !m.error && (
                    <div className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--warning)]">
                      <AlertTriangle className="h-3 w-3" />
                      Assistant offline â€” showing a fallback message
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            {m.role === "user" && (
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex gap-3 justify-start">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <Card>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                  <span className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 rounded-full bg-current animate-bounce" />
                  <span className="ml-2">Thinkingâ€¦</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        className="mt-4 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={conversationId ? "Ask a follow-up questionâ€¦" : "Ask about propulsion defects, parts, reliabilityâ€¦"}
          disabled={sending}
          data-testid="assistant-input"
          aria-label="Message the Propulsion Assistant"
        />
        <Button type="submit" disabled={sending || !input.trim()} data-testid="assistant-send">
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}