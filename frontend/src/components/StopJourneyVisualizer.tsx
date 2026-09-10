import { useState, useEffect } from "react";
import { X, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { routesApi } from "@/services/api";
import type { AnalyzePoi, CoolingStop } from "@/services/api";

interface StopJourneyVisualizerProps {
  open: boolean;
  origin: string;
  destination: string;
  routeDistance: string;
  routeDuration: string;
  pois: AnalyzePoi[];
  coolingStops: CoolingStop[];
  onClose: () => void;
  passengerTypes?: string[];
  routeContext?: string;
  decision?: string;
}

interface StopNode {
  id: string;
  emoji: string;
  label: string;
  sublabel: string;
  km?: number;
  color: string;
  bg: string;
  border: string;
  badge?: string;
}

const ROAD_CSS = `
  @keyframes _sjv_dash {
    from { background-position: 0 0; }
    to   { background-position: 0 20px; }
  }
  ._sjv_road_dashes {
    background-image: repeating-linear-gradient(
      to bottom,
      transparent 0, transparent 5px,
      rgba(255,255,255,0.75) 5px, rgba(255,255,255,0.75) 11px,
      transparent 11px, transparent 20px
    );
    background-size: 8px 20px;
    animation: _sjv_dash 0.42s linear infinite;
  }
`;

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch { return iso; }
}

function emojiForStop(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("fuel") || t.includes("gas") || t.includes("petrol") || t.includes("shell") || t.includes("circle k") || t.includes("bp ")) return "⛽";
  if (t.includes("mcdonald") || t.includes("burger") || t.includes("subway") || t.includes("food") || t.includes("restaurant") || t.includes("eat") || t.includes("kfc") || t.includes("pizza")) return "🍽️";
  if (t.includes("starbucks") || t.includes("coffee") || t.includes("café") || t.includes("cafe")) return "☕";
  if (t.includes("cool") || t.includes("ac ") || t.includes("air cond") || t.includes("chill") || t.includes("water")) return "🧊";
  if (t.includes("hospital") || t.includes("clinic") || t.includes("medical") || t.includes("pharmacy")) return "🏥";
  if (t.includes("kids") || t.includes("child") || t.includes("play") || t.includes("family")) return "👶";
  if (t.includes("elder") || t.includes("senior")) return "👴";
  if (t.includes("pet") || t.includes("dog") || t.includes("cat")) return "🐾";
  if (t.includes("rest area") || t.includes("rest stop") || t.includes("parking")) return "🅿️";
  if (t.includes("hotel") || t.includes("motel") || t.includes("lodg")) return "🏨";
  return "📍";
}

function colorForStop(text: string): { color: string; bg: string; border: string } {
  const t = text.toLowerCase();
  if (t.includes("fuel") || t.includes("gas") || t.includes("petrol")) return { color: "#d97706", bg: "#fffbeb", border: "#fcd34d" };
  if (t.includes("food") || t.includes("eat") || t.includes("restaurant") || t.includes("mcdonald") || t.includes("burger")) return { color: "#9333ea", bg: "#faf5ff", border: "#d8b4fe" };
  if (t.includes("coffee") || t.includes("starbucks") || t.includes("café")) return { color: "#92400e", bg: "#fef3c7", border: "#fde68a" };
  if (t.includes("cool") || t.includes("water") || t.includes("ac")) return { color: "#0284c7", bg: "#f0f9ff", border: "#7dd3fc" };
  if (t.includes("hospital") || t.includes("medical")) return { color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" };
  if (t.includes("kids") || t.includes("family") || t.includes("child")) return { color: "#db2777", bg: "#fdf2f8", border: "#f9a8d4" };
  if (t.includes("elder") || t.includes("senior")) return { color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd" };
  if (t.includes("pet") || t.includes("dog")) return { color: "#059669", bg: "#f0fdf4", border: "#6ee7b7" };
  return { color: "#475569", bg: "#f8fafc", border: "#cbd5e1" };
}

function stripMd(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/_(.+?)_/g, "$1");
}

function parseAiStops(text: string): StopNode[] {
  const lines = text.split("\n").filter(l => /^\d+[.)]\s/.test(l.trim()));
  return lines.map((line, i) => {
    const clean = stripMd(line.replace(/^\d+[.)]\s*/, "").trim());

    // Extract km marker: "km 150", "150 km", "at 150km"
    const kmMatch = clean.match(/\bkm\s*(\d+)/i) || clean.match(/(\d+)\s*km\b/i);
    const km = kmMatch ? parseInt(kmMatch[1]) : undefined;

    // Split on common separators: · — | - (after optional km mention)
    const sepIdx = clean.search(/\s[·—|]\s|(?<=\bkm\s*\d+\s*)[-–]/);
    let label = sepIdx > 0 ? clean.substring(0, sepIdx).trim() : clean.split(/\s{2,}/)[0].trim();
    const sublabel = sepIdx > 0 ? clean.substring(sepIdx).replace(/^[\s·—|\-–]+/, "").trim() : clean;

    // Remove duplicate km text from label
    label = label.replace(/\s*(at\s+)?km\s*\d+/i, "").trim();
    if (!label) label = `Stop ${i + 1}`;

    const colors = colorForStop(label + " " + sublabel);
    return {
      id: `ai-${i}`,
      emoji: emojiForStop(label + " " + sublabel),
      label,
      sublabel: [km != null ? `~${km} km` : "", sublabel].filter(Boolean).join(" · "),
      km,
      ...colors,
    };
  });
}

export function StopJourneyVisualizer({
  open,
  origin,
  destination,
  routeDistance,
  routeDuration,
  pois,
  coolingStops,
  onClose,
  passengerTypes = [],
  routeContext,
  decision,
}: StopJourneyVisualizerProps) {
  const [aiStops, setAiStops] = useState<StopNode[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const run = async () => {
      setAiStops([]);
      setAiLoading(true);

      const poiLines = pois.slice(0, 25).map(p => {
        const dist = p.distance != null ? ` (${(p.distance / 1000).toFixed(1)} km from road)` : "";
        return `- ${p.name || p.type} [${p.type || "stop"}]${dist}`;
      }).join("\n");

      const coolingLines = coolingStops.length
        ? coolingStops.map(cs => `- ${cs.name} at ${cs.distance_km.toFixed(0)} km${cs.eta_time ? ", ETA " + fmtTime(cs.eta_time) : ""}`).join("\n")
        : "None";

      const passengerNote = passengerTypes.length
        ? `Passengers: ${passengerTypes.join(", ")}. Include breaks for their needs.`
        : "";

      const question = [
        `Plan an optimal stop schedule for this ${routeDistance} drive from ${(origin || "").split(",")[0]} to ${(destination || "").split(",")[0]}.`,
        "",
        `POIs along the route:\n${poiLines || "None listed."}`,
        `AI cooling stops:\n${coolingLines}`,
        passengerNote,
        "",
        "Give 3-6 stops in travel order. Format each as a numbered list item:",
        "N. [Stop Name] · km [X] — [One-line reason: heat, fuel, food, rest, or passenger need]",
        "Use real POI names where possible. Be specific.",
      ].filter(Boolean).join("\n");

      const history = routeContext ? [{ role: "assistant" as const, content: routeContext }] : [];

      try {
        const res = await routesApi.chatWithAI(question, history, "results");
        const parsed = parseAiStops(res.reply || "");
        setAiStops(parsed.length ? parsed : []);
      } catch {
        setAiStops([]);
      } finally {
        setAiLoading(false);
      }
    };

    void run();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const distanceKm = parseFloat(routeDistance) || 0;
  const durationMin = parseInt(routeDuration) || 0;
  const fuelLiters = Math.min(80, Math.ceil((distanceKm / 100) * 10 * 1.2 / 5) * 5) || 40;
  const hrs = Math.floor(durationMin / 60);
  const mins = durationMin % 60;
  const originCity = (origin || "").split(",")[0].trim() || origin;
  const destCity = (destination || "").split(",")[0].trim() || destination;

  // Packing reminders
  const packingNotes = [
    ...(passengerTypes.includes("kids") ? ["🎒 Snacks & activities"] : []),
    ...(passengerTypes.includes("elderly") ? ["💊 Medications & water"] : []),
    ...(passengerTypes.includes("pets") ? ["🐾 Water bowl & leash"] : []),
  ].join(" · ");

  // Full node list: start + (loading placeholder OR ai stops) + end
  const startNode: StopNode = {
    id: "start",
    emoji: "🚗",
    label: originCity,
    sublabel: `⛽ Fill to at least ${fuelLiters}L${packingNotes ? " · " + packingNotes : ""}`,
    color: "#16a34a", bg: "#f0fdf4", border: "#86efac", badge: "Departure",
  };

  const endNode: StopNode = {
    id: "end",
    emoji: "🏁",
    label: destCity,
    sublabel: `${distanceKm > 0 ? distanceKm.toFixed(0) + " km" : "—"} · ~${hrs > 0 ? hrs + "h " + mins + "m" : mins + "m"}`,
    color: "#F97316", bg: "#fff7ed", border: "#fed7aa", badge: "Destination",
  };

  return (
    <>
      <style>{ROAD_CSS}</style>

      {/* Backdrop */}
      <div style={{ position: "fixed", inset: 0, background: "rgba(9,9,11,0.65)", backdropFilter: "blur(4px)", zIndex: 2000 }} />

      {/* Wrapper — click outside to close */}
      <div
        onClick={onClose}
        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 2001 }}
      >
        <motion.div
          initial={{ y: 28, scale: 0.96 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          onClick={e => e.stopPropagation()}
          style={{ width: "min(500px, 100%)", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 24, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.28)" }}
        >
          {/* ── Header ── */}
          <div style={{ padding: "18px 20px 14px", flexShrink: 0, background: "linear-gradient(135deg,#1C1917,#2c2825)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                  <Sparkles style={{ width: 13, height: 13, color: "#F97316", flexShrink: 0 }} />
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15, color: "#fff", letterSpacing: "-0.01em" }}>
                    AI Journey Plan
                  </div>
                  {aiLoading && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Loader2 style={{ width: 11, height: 11, color: "#F97316" }} className="animate-spin" />
                      <span style={{ fontSize: 10, color: "#a8a29e" }}>Planning stops…</span>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: "#a8a29e", display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  <span style={{ color: "#fb923c", fontWeight: 600 }}>{originCity}</span>
                  <span>→</span>
                  <span style={{ color: "#fb923c", fontWeight: 600 }}>{destCity}</span>
                  <span style={{ color: "#57534e" }}>·</span>
                  <span>{routeDistance}</span>
                </div>
                {decision && (() => {
                  const d = decision.toUpperCase();
                  const isGo = d.startsWith("GO");
                  const isDelay = d === "DELAY";
                  const cfg = isGo
                    ? { label: "GOOD TO GO", bg: "linear-gradient(135deg,#16a34a,#15803d)" }
                    : isDelay
                    ? { label: "DELAY ADVISED", bg: "linear-gradient(135deg,#dc2626,#b91c1c)" }
                    : { label: "PROCEED WITH CAUTION", bg: "linear-gradient(135deg,#d97706,#b45309)" };
                  return (
                    <div style={{ marginTop: 8 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 999, background: cfg.bg, color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "0.07em" }}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })()}
                {passengerTypes.length > 0 && (
                  <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                    {passengerTypes.includes("kids") && <span style={{ fontSize: 10, fontWeight: 700, color: "#db2777", background: "rgba(219,39,119,0.15)", padding: "2px 8px", borderRadius: 999 }}>👶 Kids</span>}
                    {passengerTypes.includes("elderly") && <span style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", background: "rgba(124,58,237,0.15)", padding: "2px 8px", borderRadius: 999 }}>👴 Elderly</span>}
                    {passengerTypes.includes("pets") && <span style={{ fontSize: 10, fontWeight: 700, color: "#34d399", background: "rgba(5,150,105,0.15)", padding: "2px 8px", borderRadius: 999 }}>🐾 Pets</span>}
                  </div>
                )}
              </div>
              <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, border: "none", background: "rgba(255,255,255,0.1)", color: "#d6d3d1", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <X size={13} />
              </button>
            </div>
          </div>

          {/* ── Body — unified road strip ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 20px 60px" }}>
            <div style={{ position: "relative" }}>

              {/* Road strip */}
              <div style={{ position: "absolute", left: -38, top: 16, bottom: 16, width: 8, borderRadius: 4, background: "#374151", overflow: "hidden" }}>
                <div className="_sjv_road_dashes" style={{ position: "absolute", inset: 0 }} />
              </div>

              {/* Car */}
              <motion.div
                style={{ position: "absolute", left: -34, fontSize: 15, transform: "translateX(-50%)", pointerEvents: "none", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))" }}
                initial={{ top: "2%" }}
                animate={{ top: "94%" }}
                transition={{ duration: 3.6, delay: 0.3, ease: [0.4, 0, 0.6, 1] }}
              >
                🚗
              </motion.div>

              {/* Start node */}
              <StopCard node={startNode} isTerminal dotOffset={-38} />

              {/* Loading placeholder — sits between start and end on the road */}
              {aiLoading && (
                <div style={{ position: "relative", margin: "18px 0" }}>
                  <div style={{
                    position: "absolute",
                    left: -(38 + 12),
                    top: "50%", transform: "translateY(-50%)",
                    width: 24, height: 24, borderRadius: "50%",
                    background: "#F97316",
                    border: "3px solid #fff",
                    boxShadow: "0 0 0 2px rgba(249,115,22,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 5,
                  }}>
                    <Loader2 style={{ width: 11, height: 11, color: "#fff" }} className="animate-spin" />
                  </div>
                  <div style={{ background: "rgba(249,115,22,0.05)", border: "1.5px dashed rgba(249,115,22,0.3)", borderRadius: 12, padding: "10px 13px" }}>
                    <div style={{ fontSize: 12, color: "#92400E", fontWeight: 600 }}>Planning your stops with AI…</div>
                    <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 2 }}>Analyzing {pois.length} POIs along your route</div>
                  </div>
                </div>
              )}

              {/* AI stop nodes */}
              {!aiLoading && aiStops.map(node => (
                <div key={node.id} style={{ margin: "18px 0" }}>
                  <StopCard node={node} isTerminal={false} dotOffset={-38} aiSuggested />
                </div>
              ))}

              {/* No POIs fallback */}
              {!aiLoading && aiStops.length === 0 && pois.length === 0 && coolingStops.length === 0 && (
                <div style={{ position: "relative", margin: "18px 0" }}>
                  <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "10px 13px" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>No POIs found along this route — drive straight through.</div>
                  </div>
                </div>
              )}

              {/* End node */}
              <StopCard node={endNode} isTerminal dotOffset={-38} />
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{ padding: "12px 20px", borderTop: "1px solid #f0ede8", flexShrink: 0, background: "#fafaf9", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 10.5, color: "#9a948e", flex: 1, lineHeight: 1.4 }}>
              AI-planned using your route's {pois.length} POIs · {coolingStops.length > 0 ? coolingStops.length + " cooling stops" : "heat data"}
            </span>
            <button onClick={onClose} style={{ padding: "7px 18px", borderRadius: 10, border: "none", background: "#1C1917", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-heading)", flexShrink: 0 }}>
              Got it
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

function StopCard({ node, isTerminal, dotOffset, aiSuggested }: {
  node: StopNode;
  isTerminal: boolean;
  dotOffset: number;
  aiSuggested?: boolean;
}) {
  const dotSize = isTerminal ? 30 : 24;
  return (
    <div style={{ position: "relative" }}>
      <div style={{
        position: "absolute",
        left: dotOffset - dotSize / 2,
        top: "50%", transform: "translateY(-50%)",
        width: dotSize, height: dotSize,
        borderRadius: "50%",
        background: node.color,
        border: "3px solid #fff",
        boxShadow: `0 0 0 2px ${node.color}40, 0 2px 8px rgba(0,0,0,0.15)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: isTerminal ? 14 : 11,
        zIndex: 5,
      }}>
        {node.emoji}
      </div>
      <div style={{ background: node.bg, border: `1.5px solid ${node.border}`, borderRadius: 12, padding: "10px 13px", position: "relative" }}>
        <div style={{ position: "absolute", left: -8, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderRight: `8px solid ${node.border}` }} />
        <div style={{ position: "absolute", left: -6, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderRight: `7px solid ${node.bg}` }} />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 12.5, color: "#1C1917", lineHeight: 1.3 }}>{node.label}</div>
          {aiSuggested && (
            <span style={{ fontSize: 9, fontWeight: 700, color: "#F97316", background: "rgba(249,115,22,0.1)", padding: "2px 6px", borderRadius: 999, flexShrink: 0, marginTop: 1 }}>
              AI
            </span>
          )}
        </div>

        {node.sublabel && (
          <div style={{ fontSize: 11, color: "#57534e", marginTop: 3, lineHeight: 1.55 }}>{node.sublabel}</div>
        )}

        {node.badge && (
          <span style={{ marginTop: 5, display: "inline-block", fontSize: 10, fontWeight: 700, color: node.badge === "Departure" ? "#15803d" : "#ea580c", background: node.badge === "Departure" ? "#dcfce7" : "#ffedd5", padding: "2px 8px", borderRadius: 999 }}>
            {node.badge}
          </span>
        )}
      </div>
    </div>
  );
}
