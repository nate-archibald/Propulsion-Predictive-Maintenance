import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  Input,
  Button,
} from "@databricks/appkit-ui/react";
import { Bot, User, Send, Sparkles, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";

type Role = "user" | "assistant";
interface ChatMessage {
  role: Role;
  content: string;
  steps?: string[];
  source?: "live" | "mock";
  error?: boolean;
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
            <li key={i} className="text-xs text-muted-foreground whitespace-pre-wrap">
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

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
        }),
      });
      const json = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: json.reply ?? "(No response.)",
          steps: Array.isArray(json.steps) ? json.steps : [],
          source: json.source === "live" ? "live" : "mock",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry — I couldn't reach the Propulsion Assistant. Please try again.",
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
            Ask questions about propulsion defects, parts, and reliability — powered by the
            Propulsion-Supervisor-Agent.
          </p>
        </div>
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
            <div className={`max-w-[80%] ${m.role === "user" ? "order-first" : ""}`}>
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
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
                  {m.role === "assistant" && !m.error && m.steps && <StepList steps={m.steps} />}
                  {m.role === "assistant" && m.source === "mock" && !m.error && (
                    <div className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--warning)]">
                      <AlertTriangle className="h-3 w-3" />
                      Assistant offline — showing a fallback message
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
                  <span className="ml-2">Thinking…</span>
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
          placeholder="Ask about propulsion defects, parts, reliability…"
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
