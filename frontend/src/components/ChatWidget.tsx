import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, Zap } from "lucide-react";
import tdLogo from "@/components/ui/images/7a3307fc-4753-42b3-b511-11169f744cd0.png";
import { motion, AnimatePresence } from "framer-motion";
import { routesApi } from "@/services/api";
import type { ChatMessage, ChatExtractedFields } from "@/services/api";
import { MascotCharacter } from "@/components/ui/MascotCharacter";

interface ChatWidgetProps {
  onFillForm?: (fields: ChatExtractedFields) => void;
  onAutoSubmit?: (fields: ChatExtractedFields) => void;
  onSubmit?: () => void;
  mode?: "plan" | "results";
  routeContext?: {
    origin: string;
    destination: string;
    /** Pre-built rich context string injected as first assistant message */
    contextSummary?: string;
  };
}

function renderMd(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0, idx = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] != null) parts.push(<strong key={idx++} style={{ fontWeight: 700 }}>{m[1]}</strong>);
    else parts.push(<em key={idx++}>{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

const PLAN_SUGGESTIONS = [
  { label: "Phoenix → Tucson right now", icon: "🔥" },
  { label: "Drive I-40 this afternoon", icon: "🌅" },
  { label: "Las Vegas to LA — best window", icon: "⏱" },
];

const RESULTS_SUGGESTIONS = [
  { label: "Is it safe to leave at 3 PM?", icon: "🕒" },
  { label: "What's the worst stretch?", icon: "🌡️" },
  { label: "Should I delay my departure?", icon: "⏳" },
];

export function ChatWidget({ onFillForm, onAutoSubmit, onSubmit, mode = "plan", routeContext }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 180);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-grow textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0";
    const next = Math.min(el.scrollHeight, 120);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > 120 ? "auto" : "hidden";
  }, [input]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || launching) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const history = [...messages];
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    inputRef.current?.focus();

    try {
      const contextContent = routeContext?.contextSummary
        || (routeContext
          ? `Context: The user is viewing heat analysis results for a route from "${routeContext.origin}" to "${routeContext.destination}". You already know their origin and destination — never ask them to repeat it. Do NOT plan a new route or trigger analysis. Only answer follow-up questions about this specific route's heat conditions, timing, safety, or stops.`
          : null);

      const historyWithContext: ChatMessage[] = contextContent
        ? [{ role: "assistant", content: contextContent }, ...history]
        : history;
      const res = await routesApi.chatWithAI(trimmed, historyWithContext, mode);

      if (
        mode !== "results" &&
        res.auto_submit &&
        res.extracted_fields.origin_lat != null &&
        res.extracted_fields.destination_lat != null
      ) {
        setMessages([...next, { role: "assistant", content: res.reply }]);
        setLoading(false);
        setLaunching(true);
        setTimeout(() => {
          setOpen(false);
          setLaunching(false);
          onAutoSubmit?.(res.extracted_fields);
        }, 900);
      } else {
        setMessages([...next, { role: "assistant", content: res.reply }]);
        if (mode !== "results") {
          if (res.action === "fill_form" || res.action === "submit") {
            onFillForm?.(res.extracted_fields);
          }
          if (res.action === "submit") {
            setTimeout(() => { setOpen(false); onSubmit?.(); }, 700);
          }
        }
      }
    } catch {
      setMessages([...next, { role: "assistant", content: "Something went wrong — please try again." }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const suggestions = mode === "results" ? RESULTS_SUGGESTIONS : PLAN_SUGGESTIONS;
  const isEmpty = messages.length === 0;

  return (
    <>
      {/* ── "Ask AI" tooltip bubble ── */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 6 }}
            transition={{ delay: 1.2, duration: 0.22, ease: [0, 0, 0.2, 1] }}
            onClick={() => setOpen(true)}
            style={{
              position: "fixed",
              bottom: 96,
              right: 24,
              zIndex: 1099,
              background: "#18181b",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "var(--font-heading)",
              padding: "6px 12px",
              borderRadius: 999,
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 14px rgba(0,0,0,0.22)",
              userSelect: "none",
            }}
          >
            Ask AI
            {/* tail */}
            <div style={{
              position: "absolute",
              bottom: -5,
              right: 20,
              width: 10,
              height: 10,
              background: "#18181b",
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Trigger — mascot ── */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label={open ? "Close AI" : "Open AI"}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1100,
          width: 64,
          height: 64,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background: "transparent",
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: open ? "none" : "drop-shadow(0 6px 18px rgba(249,115,22,0.55))",
          transition: "filter 150ms",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.div
              key="close"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
              style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "#18181b",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <X style={{ width: 20, height: 20, color: "#fff" }} />
            </motion.div>
          ) : (
            <motion.div
              key="mascot"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15 }}
            >
              <MascotCharacter state="idle" size={64} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Panel ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              style={{
                position: "fixed", inset: 0,
                background: "rgba(9,9,11,0.35)",
                backdropFilter: "blur(2px)",
                zIndex: 1090,
              }}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
              style={{
                position: "fixed",
                bottom: 100,
                right: 24,
                width: "min(400px, calc(100vw - 48px))",
                maxHeight: "min(560px, calc(100vh - 130px))",
                display: "flex",
                flexDirection: "column",
                borderRadius: 18,
                overflow: "hidden",
                background: "#fff",
                border: "1px solid #e4e4e7",
                boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
                zIndex: 1095,
              }}
            >
              {/* Header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderBottom: "1px solid #f4f4f5",
                flexShrink: 0,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <img src={tdLogo} alt="ThermoDispatch" style={{ width: 34, height: 34, borderRadius: 9, display: "block", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 14, color: "#09090b", letterSpacing: "-0.01em" }}>ThermoDispatch AI</div>
                    <div style={{ fontSize: 11, color: "#71717a", marginTop: 1 }}>
                      {mode === "results" && routeContext
                        ? <><span style={{ fontWeight: 600, color: "#F97316" }}>{routeContext.origin}</span> → <span style={{ fontWeight: 600, color: "#F97316" }}>{routeContext.destination}</span></>
                        : mode === "results" ? "Ask about your route results"
                        : "Describe your drive, I'll analyze it"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "#f4f4f5", color: "#71717a", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <X style={{ width: 12, height: 12 }} />
                </button>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>

                {/* Empty state */}
                {isEmpty && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "#52525b" }}>
                      {mode === "results"
                        ? "Ask anything about your current route — heat risk, timing, stops, or safe windows."
                        : "Describe your drive and I'll geocode, set the window, and launch the analysis automatically."}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {suggestions.map(s => (
                        <button
                          key={s.label}
                          onClick={() => send(s.label)}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 14px",
                            background: "#fafafa",
                            border: "1px solid #e4e4e7",
                            borderRadius: 12,
                            cursor: "pointer",
                            textAlign: "left",
                            fontSize: 13,
                            color: "#3f3f46",
                            fontFamily: "var(--font-body)",
                            transition: "border-color 100ms, background 100ms",
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#F97316"; (e.currentTarget as HTMLElement).style.background = "rgba(249,115,22,0.04)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e4e4e7"; (e.currentTarget as HTMLElement).style.background = "#fafafa"; }}
                        >
                          <span style={{ fontSize: 16 }}>{s.icon}</span>
                          <span style={{ flex: 1 }}>{s.label}</span>
                          <span style={{ color: "#a1a1aa", fontSize: 12 }}>→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message bubbles — AgentChat pattern */}
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {msg.role === "user" ? (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <div style={{
                          maxWidth: "80%",
                          padding: "9px 14px",
                          borderRadius: "18px 18px 4px 18px",
                          background: "linear-gradient(135deg, #F97316, #EA580C)",
                          fontSize: 13,
                          lineHeight: 1.6,
                          color: "#fff",
                          whiteSpace: "pre-line",
                          fontFamily: "var(--font-body)",
                          boxShadow: "0 2px 10px rgba(249,115,22,0.3)",
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "flex-start" }}>
                        <div style={{
                          maxWidth: "90%",
                          padding: "9px 14px",
                          borderRadius: "18px 18px 18px 4px",
                          background: "#f4f4f5",
                          fontSize: 13,
                          lineHeight: 1.65,
                          color: "#09090b",
                          whiteSpace: "pre-line",
                          fontFamily: "var(--font-body)",
                        }}>
                          {renderMd(msg.content)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Loader2 style={{ width: 13, height: 13, color: "#F97316" }} className="animate-spin" />
                    <span style={{ fontSize: 12, color: "#a1a1aa", fontFamily: "var(--font-body)" }}>Thinking…</span>
                  </div>
                )}

                {/* Launching state */}
                {launching && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 12px", borderRadius: 10,
                    background: "rgba(249,115,22,0.07)",
                    border: "1px solid rgba(249,115,22,0.2)",
                  }}>
                    <Zap style={{ width: 12, height: 12, color: "#F97316" }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#F97316", fontFamily: "var(--font-body)" }}>
                      Launching analysis…
                    </span>
                    <Loader2 style={{ width: 11, height: 11, color: "#F97316", marginLeft: 2 }} className="animate-spin" />
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input — AgentChat pattern */}
              <div style={{ flexShrink: 0, padding: "10px 14px 14px", borderTop: "1px solid #f4f4f5" }}>
                <div
                  style={{
                    borderRadius: 14,
                    background: "#fff",
                    boxShadow: "0 0 0 1px #e4e4e7",
                    transition: "box-shadow 120ms",
                    cursor: "text",
                  }}
                  onFocusCapture={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1.5px #F97316"}
                  onBlurCapture={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1px #e4e4e7"}
                  onClick={() => inputRef.current?.focus()}
                >
                  <div style={{ padding: "10px 14px 0" }}>
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder={mode === "results" ? "Ask about heat, timing, stops…" : "e.g. Phoenix to Flagstaff this afternoon…"}
                      disabled={loading || launching}
                      style={{
                        width: "100%",
                        resize: "none",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: "#09090b",
                        fontFamily: "var(--font-body)",
                        minHeight: 22,
                        display: "block",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", padding: "6px 10px 8px" }}>
                    <button
                      onClick={() => send(input)}
                      disabled={loading || launching || !input.trim()}
                      aria-label="Send"
                      style={{
                        width: 30, height: 30,
                        borderRadius: "50%",
                        border: "none",
                        cursor: input.trim() && !loading && !launching ? "pointer" : "default",
                        background: input.trim() && !loading && !launching ? "#09090b" : "#e4e4e7",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background 120ms",
                        flexShrink: 0,
                      }}
                    >
                      <Send style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                </div>
                <p style={{ margin: "7px 0 0", fontSize: 10, color: "#a1a1aa", textAlign: "center", fontFamily: "var(--font-body)" }}>
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
