import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Thermometer, Wind, Droplets, Zap, CheckCircle, AlertTriangle,
  Clock, Shield, TrendingUp, Brain, Activity, MapPin,
  ChevronDown, ChevronUp, Snowflake, Fuel,
  Building2, Leaf, HeartPulse, Gauge,
} from "lucide-react";
import type { AnalyzeHeatPoint, CriticalAlert, CoolingStop } from "@/services/api";
import type { DepartureHourInfo } from "@/components/FloatingMapDock";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Recommendation {
  headline: string; decision: string; reason: string;
  key_factors: string[]; safety_tip: string;
  best_departure_times?: string[];
  alerts?: CriticalAlert[]; cooling_stops?: CoolingStop[];
}
interface RiskMetrics {
  max_temperature?: number | null; max_humidity?: number | null;
  max_heat_index?: number | null; max_aqi?: number | null;
  max_uv_index?: number | null;
}
export interface HeatIntelTabProps {
  heatPoints: AnalyzeHeatPoint[];
  recommendation: Recommendation | null;
  departureHours: DepartureHourInfo[];
  shownDepartureTime?: string | null;
  riskScore?: number | null;
  origin: string; destination: string;
  routeName: string; routeDistance: string; routeDuration: string;
  riskLevel: string; riskMetrics: RiskMetrics | null;
  unitF?: boolean;
  weatherWeightPct?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toF = (c: number) => Math.round(c * 9 / 5 + 32);
const disp = (c: number, inF: boolean) => inF ? toF(c) : Math.round(c);
const fmtTime = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
  catch { return iso; }
};
const RISK_ORDER: Record<string, number> = { LOW: 1, MEDIUM: 2, MODERATE: 2, HIGH: 3, VERY_HIGH: 4, EXTREME: 4 };

function riskColor(level: string) {
  const u = (level ?? "").toUpperCase();
  if (u === "EXTREME")   return { hex: "#DC2626", bg: "rgba(220,38,38,0.07)", border: "rgba(220,38,38,0.18)" };
  if (u === "VERY_HIGH") return { hex: "#B91C1C", bg: "rgba(185,28,28,0.07)", border: "rgba(185,28,28,0.18)" };
  if (u === "HIGH")      return { hex: "#F97316", bg: "rgba(249,115,22,0.07)", border: "rgba(249,115,22,0.20)" };
  if (u === "MEDIUM" || u === "MODERATE") return { hex: "#D4A000", bg: "rgba(212,160,0,0.07)", border: "rgba(212,160,0,0.20)" };
  return { hex: "#0EA472", bg: "rgba(14,164,114,0.07)", border: "rgba(14,164,114,0.20)" };
}

function heatColorForTemp(t: number): string {
  if (t <= 24) return "#7CC8E8";
  if (t <= 28) return "#90D9A8";
  if (t <= 32) return "#FAD675";
  if (t <= 36) return "#F59052";
  if (t <= 40) return "#E86433";
  return "#CC3320";
}

// ─── Count-up ─────────────────────────────────────────────────────────────────

function useCountUp(target: number, ms = 900, active = true): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active || !target) return;
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setV(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, active]);
  return v;
}

// ─── Bezier path ──────────────────────────────────────────────────────────────

function bezier(pts: { x: number; y: number }[]) {
  return pts.map((p, i) => {
    if (i === 0) return `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const pr = pts[i - 1];
    const cx = pr.x + (p.x - pr.x) * 0.45;
    return `C${cx.toFixed(1)} ${pr.y.toFixed(1)},${cx.toFixed(1)} ${p.y.toFixed(1)},${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }).join(" ");
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ title, sub, icon, children, delay = 0, noPad = false, accent, style: extraStyle = {} }: {
  title?: string; sub?: string; icon?: React.ReactNode; accent?: string;
  children: React.ReactNode; delay?: number; noPad?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25, ease: [0, 0, 0.2, 1] }}
      style={{
        background: "#fff",
        borderRadius: 20,
        border: "1px solid #EBE8E3",
        boxShadow: "0 1px 4px rgba(28,25,23,0.06)",
        overflow: "hidden",
        ...extraStyle,
      }}
    >
      {accent && <div style={{ height: 3, background: accent }} />}
      {title && (
        <div
          style={{
            padding: "14px 22px",
            borderBottom: "1px solid #F0EDE8",
            display: "flex",
            alignItems: "center",
            gap: 9,
            background: "#FAF8F2",
          }}
        >
          {icon && (
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(249,115,22,0.09)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#F97316" }}>{icon}</span>
            </div>
          )}
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 14, color: "#1C1917" }}>{title}</div>
            {sub && <div style={{ fontSize: 10, color: "#9A948E", marginTop: 1 }}>{sub}</div>}
          </div>
        </div>
      )}
      <div style={noPad ? {} : { padding: "20px 22px" }}>{children}</div>
    </motion.div>
  );
}

// ─── KPI Stat Card ────────────────────────────────────────────────────────────

function StatCard({ label, value, unit, sub, color, delay = 0, icon }: {
  label: string; value: number; unit?: string; sub?: string;
  color: string; delay?: number; icon?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const animated = useCountUp(value, 900, inView);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      style={{
        background: "#fff",
        borderRadius: 18,
        border: "1px solid #EBE8E3",
        padding: "20px 22px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(28,25,23,0.06)",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${color},${color}60)` }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: 32, lineHeight: 1, letterSpacing: "-0.03em", color }}>
        {animated}<span style={{ fontSize: 15, fontWeight: 600, marginLeft: 2, opacity: 0.85 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#44403C", marginTop: 5 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "#9A948E", marginTop: 2 }}>{sub}</div>}
    </motion.div>
  );
}

// ─── Temp sparkline ───────────────────────────────────────────────────────────

// ─── Decision badge ───────────────────────────────────────────────────────────

function DecisionBadge({ decision }: { decision: string }) {
  const d = (decision ?? "").toUpperCase();
  const isGo = d.startsWith("GO");
  const isDelay = d === "DELAY";
  const cfg = isGo
    ? { label: "GOOD TO GO", bg: "linear-gradient(135deg,#16a34a,#15803d)", icon: <CheckCircle style={{ width: 16, height: 16 }} /> }
    : isDelay
    ? { label: "DELAY ADVISED", bg: "linear-gradient(135deg,#dc2626,#b91c1c)", icon: <AlertTriangle style={{ width: 16, height: 16 }} /> }
    : { label: "PROCEED WITH CAUTION", bg: "linear-gradient(135deg,#d97706,#b45309)", icon: <Clock style={{ width: 16, height: 16 }} /> };
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px 6px 10px", borderRadius: 999, background: cfg.bg, color: "#fff" }}>
      {cfg.icon}
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.07em" }}>{cfg.label}</span>
    </div>
  );
}

// ─── Temperature profile chart ────────────────────────────────────────────────

function TempChart({ points, unitF }: { points: AnalyzeHeatPoint[]; unitF: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  if (points.length < 2) return (
    <div style={{ textAlign: "center", padding: "32px 0", fontSize: 12, color: "#9A948E" }}>Not enough data points</div>
  );
  const unit = unitF ? "°F" : "°C";
  const W = 820; const H = 200; const PL = 44; const PR = 24; const PT = 16; const PB = 28;
  const cW = W - PL - PR; const cH = H - PT - PB;
  const maxD = Math.max(...points.map(p => p.distance_from_origin_m ?? 0));
  const tF = points.map(p => disp(p.temperature, unitF));
  const hF = points.map(p => disp(p.heat_index ?? p.temperature, unitF));
  const all = [...tF, ...hF];
  const yMin = Math.floor(Math.min(...all) / 10) * 10 - 5;
  const yMax = Math.ceil(Math.max(...all) / 10) * 10 + 5;
  const xs = (m: number) => PL + ((m ?? 0) / Math.max(maxD, 1)) * cW;
  const ys = (v: number) => PT + cH - ((v - yMin) / (yMax - yMin)) * cH;
  const tPts = points.map((_,i) => ({ x: xs(points[i].distance_from_origin_m ?? 0), y: ys(tF[i]) }));
  const hPts = points.map((_,i) => ({ x: xs(points[i].distance_from_origin_m ?? 0), y: ys(hF[i]) }));
  const tLine = bezier(tPts); const hLine = bezier(hPts);
  const areaClose = ` L${tPts.at(-1)!.x.toFixed(1)} ${(PT+cH).toFixed(1)} L${PL} ${(PT+cH).toFixed(1)} Z`;
  const yTicks = Array.from({ length: Math.ceil((yMax-yMin)/10)+1 }, (_,i) => yMin+i*10).filter(t => t>=yMin && t<=yMax);

  return (
    <div style={{ position: "relative" }}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="tAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F97316" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="tLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0EA472" />
            <stop offset="55%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
        </defs>
        {yTicks.map(t => (
          <line key={t} x1={PL} x2={PL+cW} y1={ys(t)} y2={ys(t)} stroke="#EBE8E3" strokeWidth={0.7} strokeDasharray="4,4" />
        ))}
        {(unitF ? [90, 105] : [32, 40]).map((thresh, ti) => thresh>=yMin && thresh<=yMax && (
          <g key={thresh}>
            <line x1={PL} x2={PL+cW} y1={ys(thresh)} y2={ys(thresh)} stroke={ti===0 ? "rgba(212,160,0,0.4)" : "rgba(220,38,38,0.4)"} strokeWidth={1} strokeDasharray="6,3" />
            <rect x={PL+cW-32} y={ys(thresh)-11} width={30} height={12} rx={4} fill={ti===0 ? "rgba(212,160,0,0.1)" : "rgba(220,38,38,0.1)"} />
            <text x={PL+cW-17} y={ys(thresh)-2} textAnchor="middle" fontSize={8} fontWeight="700" fill={ti===0 ? "#D4A000" : "#DC2626"}>{thresh}{unit}</text>
          </g>
        ))}
        <path d={tLine + areaClose} fill="url(#tAreaFill)" />
        <motion.path d={hLine} fill="none" stroke="#DC2626" strokeWidth={1.5} strokeDasharray="5,3" opacity={0.4}
          initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : {}} transition={{ duration: 1.4, delay: 0.3 }} />
        <motion.path d={tLine} fill="none" stroke="url(#tLineGrad)" strokeWidth={2.5} strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : {}} transition={{ duration: 1.2, delay: 0.1 }} />
        {points.map((p,i) => {
          const { hex } = riskColor(p.risk_level);
          const { x, y } = tPts[i];
          return (
            <g key={i} onMouseEnter={() => setHover(i)} style={{ cursor: "crosshair" }}>
              <circle cx={x} cy={y} r={14} fill="transparent" />
              <circle cx={x} cy={y} r={hover===i ? 5.5 : 3} fill={hex} stroke="#fff" strokeWidth={1.8} />
            </g>
          );
        })}
        <line x1={PL} y1={PT} x2={PL} y2={PT+cH} stroke="#EBE8E3" strokeWidth={1} />
        <line x1={PL} y1={PT+cH} x2={PL+cW} y2={PT+cH} stroke="#EBE8E3" strokeWidth={1} />
        {yTicks.map(t => (
          <text key={t} x={PL-7} y={ys(t)+4} textAnchor="end" fontSize={9} fill="#9A948E">{t}°</text>
        ))}
        {[0,0.25,0.5,0.75,1].map(f => {
          const idx = Math.round(f*(points.length-1));
          return <text key={f} x={xs(points[idx].distance_from_origin_m??0)} y={H-2} textAnchor="middle" fontSize={9} fill="#9A948E">
            {((points[idx].distance_from_origin_m??0)/1000).toFixed(0)}km</text>;
        })}
        {hover !== null && (() => {
          const p = points[hover]; const { x, y } = tPts[hover]; const { hex } = riskColor(p.risk_level);
          const tx = x > W-160 ? x-152 : x+10; const ty = Math.max(PT+4, y-60);
          return (
            <g>
              <line x1={x} y1={PT} x2={x} y2={PT+cH} stroke="#F97316" strokeWidth={1} strokeDasharray="3,2" opacity={0.35} />
              <rect x={tx} y={ty} width={142} height={p.eta ? 64 : 46} rx={10} fill="#fff" stroke={hex} strokeWidth={1} filter="drop-shadow(0 3px 10px rgba(28,25,23,0.10))" />
              <text x={tx+10} y={ty+16} fontSize={10} fontWeight="700" fill={hex}>{p.risk_level} · {((p.distance_from_origin_m??0)/1000).toFixed(1)} km</text>
              <text x={tx+10} y={ty+30} fontSize={10} fill="#44403C">{tF[hover]}{unit} · HI {hF[hover]}{unit}</text>
              {p.humidity!=null && <text x={tx+10} y={ty+43} fontSize={9} fill="#9A948E">Humidity {Math.round(p.humidity)}%</text>}
              {p.eta && <text x={tx+10} y={ty+(p.humidity!=null?56:43)} fontSize={9} fill="#9A948E">ETA {fmtTime(p.eta)}</text>}
            </g>
          );
        })()}
      </svg>
      <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
        {[
          { el: <span style={{ width: 20, height: 3, background: "linear-gradient(90deg,#0EA472,#DC2626)", borderRadius: 2, display: "inline-block" as const }} />, label: `Temperature (${unit})` },
          { el: <span style={{ width: 20, height: 0, borderBottom: "2px dashed rgba(220,38,38,0.5)", display: "inline-block" as const }} />, label: `Heat Index (${unit})` },
          { el: <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F97316", display: "inline-block" as const }} />, label: "Risk waypoints" },
        ].map(({ el, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#9A948E" }}>{el}{label}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Exposure strip ────────────────────────────────────────────────────────────

function ExposureStrip({ points, unitF }: { points: AnalyzeHeatPoint[]; unitF: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return null;
  const total = Math.max(...points.map(p => p.distance_from_origin_m ?? 0)) || 1;
  const counts: Record<string, number> = {};
  points.forEach(p => { const u = (p.risk_level ?? "LOW").toUpperCase(); counts[u] = (counts[u]||0)+1; });

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {Object.entries(counts).sort((a,b)=>(RISK_ORDER[b[0]]||0)-(RISK_ORDER[a[0]]||0)).map(([lv, cnt]) => {
          const { hex, bg, border } = riskColor(lv);
          return (
            <span key={lv} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 999, background: bg, border: `1px solid ${border}`, fontSize: 10, fontWeight: 700, color: hex }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: hex, display: "inline-block" }} />
              {lv} ({cnt})
            </span>
          );
        })}
      </div>
      <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", height: 32, border: "1px solid #EBE8E3", display: "flex" }}>
        {points.map((p, i) => {
          const d0 = p.distance_from_origin_m ?? 0;
          const d1 = points[i+1]?.distance_from_origin_m ?? total;
          const { hex } = riskColor(p.risk_level);
          return (
            <div key={i} style={{ flex: `0 0 ${((d1-d0)/total)*100}%`, background: hex, opacity: hover===null ? 0.82 : hover===i ? 1 : 0.2, transition: "opacity 80ms", cursor: "crosshair" }}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
          );
        })}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(255,255,255,0.18) 0%,transparent 60%)", pointerEvents: "none" }} />
      </div>
      <AnimatePresence>
        {hover !== null && (() => {
          const p = points[hover]; const { hex } = riskColor(p.risk_level);
          return (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ marginTop: 8, padding: "6px 14px", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: `1px solid ${hex}`, fontSize: 11, fontWeight: 600, color: hex, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <Thermometer style={{ width: 11, height: 11 }} />
              {p.risk_level} · {((p.distance_from_origin_m??0)/1000).toFixed(1)} km · {disp(p.temperature, unitF)}{unitF ? "°F" : "°C"}
              {p.eta && <span style={{ color: "#9A948E", fontWeight: 500 }}>· {fmtTime(p.eta)}</span>}
            </motion.div>
          );
        })()}
      </AnimatePresence>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontSize: 9, color: "#9A948E" }}>Origin</span>
        <span style={{ fontSize: 9, color: "#9A948E" }}>{(total/1000).toFixed(0)} km</span>
      </div>
    </div>
  );
}

// ─── Temp vs AI Comparison table ──────────────────────────────────────────────

function TempVsAITable({ hours, recommendation, unitF, weightPct = 70, shownDepartureTime = null }: {
  hours: DepartureHourInfo[];
  recommendation: Recommendation | null;
  unitF: boolean;
  weightPct?: number;
  shownDepartureTime?: string | null;
}) {
  if (!hours.length) return null;

  const decisionUpper = (recommendation?.decision ?? "").toUpperCase();
  const bestHour = hours.find(h => h.isBest);
  const aiTimes: string[] = recommendation?.best_departure_times ?? [];

  const normalizeTime = (t: string) =>
    t.replace(/\s/g, "").replace(/:00/g, "").toUpperCase();
  const normAiTimes = aiTimes.map(normalizeTime);

  const tdLabel = bestHour ? normalizeTime(bestHour.label) : null;
  const disagreement =
    tdLabel !== null &&
    normAiTimes.length > 0 &&
    !normAiTimes.includes(tdLabel);

  const priorityLabel =
    weightPct >= 70 ? "comfort-first (lowest heat exposure)"
    : weightPct <= 30 ? "speed-first (earliest safe departure)"
    : "balanced heat + time";

  const priorityVerb =
    weightPct >= 70 ? "Stay comfortable"
    : weightPct <= 30 ? "Leave sooner"
    : "Balanced";

  return (
    <div>
      {recommendation && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 18px",
          borderRadius: 14, marginBottom: 12,
          background: decisionUpper.startsWith("GO")
            ? "rgba(14,164,114,0.06)"
            : decisionUpper === "DELAY"
            ? "rgba(220,38,38,0.06)"
            : "rgba(212,160,0,0.06)",
          border: `1px solid ${decisionUpper.startsWith("GO") ? "rgba(14,164,114,0.2)" : decisionUpper === "DELAY" ? "rgba(220,38,38,0.2)" : "rgba(212,160,0,0.2)"}`,
        }}>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 6, flex: 0 }}>
            <DecisionBadge decision={recommendation.decision} />
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(249,115,22,0.1)", color: "#C2410C", textAlign: "center" as const }}>
              {priorityVerb}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7, color: "#44403C", flex: 1 }}>
            {recommendation.reason}
          </p>
        </div>
      )}

      {disagreement && (
        <div style={{
          display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10, marginBottom: 12,
          background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.22)",
          fontSize: 11, color: "#92400E", lineHeight: 1.6,
        }}>
          <AlertTriangle style={{ width: 13, height: 13, color: "#F97316", flexShrink: 0, marginTop: 2 }} />
          <span>
            ThermoDispatch pick (<strong>{bestHour?.label}</strong>) differs from AI suggestion ({aiTimes.join(", ")}).
            {" "}ThermoDispatch scored by {priorityLabel}; AI recommends based on risk level and conditions.
            Both are shown below.
          </span>
        </div>
      )}

      <div style={{ overflowX: "auto", borderRadius: 14, border: "1px solid #EBE8E3" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#FAF8F2", borderBottom: "2px solid #EBE8E3" }}>
              <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#9A948E", whiteSpace: "nowrap" as const }}>Departure</th>
              <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#9A948E" }}>Temp</th>
              <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#9A948E" }}>Risk</th>
              <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#9A948E", whiteSpace: "nowrap" as const }}>Score</th>
              <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#9A948E" }}>vs Best</th>
              <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#9A948E" }}>Verdict</th>
            </tr>
          </thead>
          <tbody>
            {hours.map((h, i) => {
              const isBest = !!h.isBest;
              const isViewing = !!(shownDepartureTime && h.departureTime === shownDepartureTime);
              const isAiPick = normAiTimes.includes(normalizeTime(h.label));
              const tempDelta = bestHour ? h.tempValue - bestHour.tempValue : 0;
              const displayScore = h.weatherScore ?? h.routeScore ?? null;
              const bestDisplayScore = bestHour?.weatherScore ?? bestHour?.routeScore ?? null;
              const scoreDelta =
                displayScore != null && bestDisplayScore != null
                  ? displayScore - bestDisplayScore
                  : null;
              const { hex, bg, border } = riskColor(h.risk.toUpperCase());
              const riskScore = RISK_ORDER[h.risk.toUpperCase()] ?? 1;

              // Per-row verdict based on actual risk
              const rowVerdict = riskScore >= 4 ? "DELAY" : riskScore >= 3 ? "CAUTION" : "GO";
              const verdictColor = rowVerdict === "DELAY" ? "#DC2626" : rowVerdict === "CAUTION" ? "#D4A000" : "#0EA472";
              const verdictBg = rowVerdict === "DELAY" ? "rgba(220,38,38,0.08)" : rowVerdict === "CAUTION" ? "rgba(212,160,0,0.08)" : "rgba(14,164,114,0.08)";

              const tempDisplay = unitF ? `${Math.round(h.tempValue * 9/5 + 32)}°F` : `${h.tempValue}°C`;
              const scoreDisplay = displayScore != null ? Math.round(displayScore).toString() : "—";

              return (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid #F4F1ED",
                    background: isBest ? "rgba(249,115,22,0.04)" : isAiPick ? "rgba(99,102,241,0.03)" : i % 2 === 0 ? "#fff" : "#FDFCFA",
                    outline: isBest ? "2px solid rgba(249,115,22,0.22)" : isAiPick ? "1px solid rgba(99,102,241,0.18)" : "none",
                    outlineOffset: -2,
                  }}
                >
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" as const }}>
                      <span style={{ fontFamily: "monospace", fontWeight: isBest || isAiPick ? 700 : 500, fontSize: 13, color: isBest ? "#F97316" : isAiPick ? "#4F46E5" : "#1C1917" }}>
                        {h.label}
                      </span>
                      {isBest && (
                        <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 5, background: "rgba(249,115,22,0.12)", color: "#C2410C", letterSpacing: "0.04em", whiteSpace: "nowrap" as const }}>
                          ★ BEST
                        </span>
                      )}
                      {isAiPick && (
                        <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 5, background: "rgba(99,102,241,0.1)", color: "#4338CA", letterSpacing: "0.04em", whiteSpace: "nowrap" as const }}>
                          ✦ AI
                        </span>
                      )}
                      {isViewing && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 5, background: "rgba(14,164,114,0.1)", color: "#047857", letterSpacing: "0.04em", whiteSpace: "nowrap" as const }}>
                          👁 Viewing
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 32, height: 6, borderRadius: 4, overflow: "hidden", background: "#EBE8E3" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, Math.round((h.tempValue - 15) / 25 * 100))}%`, background: heatColorForTemp(h.tempValue) }} />
                      </div>
                      <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 12, color: "#1C1917" }}>{tempDisplay}</span>
                    </div>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999, background: bg, border: `1px solid ${border}`, fontSize: 9, fontWeight: 800, color: hex }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: hex, display: "inline-block" }} />
                      {h.risk.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: isBest ? "#0EA472" : "#6B6560" }}>
                      {scoreDisplay}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    {isBest ? (
                      <span style={{ fontSize: 11, color: "#0EA472", fontWeight: 600 }}>baseline</span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column" as const, gap: 1 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: tempDelta > 0 ? "#C2410C" : "#0EA472" }}>
                          {tempDelta > 0 ? `+${tempDelta}°` : `${tempDelta}°`}
                        </span>
                        {scoreDelta != null && (
                          <span style={{ fontSize: 9, color: scoreDelta > 0 ? "#C2410C" : "#0EA472", fontWeight: 500 }}>
                            {scoreDelta > 0 ? `+${Math.round(scoreDelta)}` : Math.round(scoreDelta)} pts
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    <span style={{ display: "inline-block", padding: "3px 9px", borderRadius: 7, fontSize: 9, fontWeight: 800, background: verdictBg, color: verdictColor, letterSpacing: "0.05em" }}>
                      {rowVerdict}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: "#9A948E", lineHeight: 1.6 }}>
        ★ BEST = recommended departure · ✦ AI = AI suggested time · 👁 = currently shown in graphs · Score: heat risk 0–100 (lower = safer) · Verdict based on heat risk per hour
      </div>
    </div>
  );
}

// ─── Humidity + AQI chart ─────────────────────────────────────────────────────

function HumidityAqiChart({ points }: { points: AnalyzeHeatPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  const hasHum = points.some(p => p.humidity != null && p.humidity > 0);
  const hasAqi = points.some(p => p.aqi != null && p.aqi > 0);
  if (!hasHum || points.length < 2) return null;

  const W = 820; const H = 155; const PL = 44; const PR = 24; const PT = 14; const PB = 28;
  const cW = W - PL - PR; const cH = H - PT - PB;
  const maxD = Math.max(...points.map(p => p.distance_from_origin_m ?? 0));
  const xs = (m: number) => PL + ((m ?? 0) / Math.max(maxD, 1)) * cW;
  const ys = (v: number, mn = 0, mx = 100) => PT + cH - ((v - mn) / (mx - mn || 1)) * cH;
  const humVals = points.map(p => p.humidity ?? 0);
  const aqiVals = hasAqi ? points.map(p => p.aqi ?? 0) : null;
  const aqiMax = aqiVals ? Math.max(150, Math.ceil(Math.max(...aqiVals) / 50) * 50) : 150;
  const humPts = points.map((_, i) => ({ x: xs(points[i].distance_from_origin_m ?? 0), y: ys(humVals[i]) }));
  const aqiPts = aqiVals ? points.map((_, i) => ({ x: xs(points[i].distance_from_origin_m ?? 0), y: ys(aqiVals[i], 0, aqiMax) })) : null;
  const humLine = bezier(humPts);
  const humArea = humLine + ` L${humPts.at(-1)!.x.toFixed(1)} ${(PT+cH).toFixed(1)} L${PL} ${(PT+cH).toFixed(1)} Z`;
  const aqiLine = aqiPts ? bezier(aqiPts) : null;
  const aqiArea = aqiLine && aqiPts ? aqiLine + ` L${aqiPts.at(-1)!.x.toFixed(1)} ${(PT+cH).toFixed(1)} L${PL} ${(PT+cH).toFixed(1)} Z` : null;

  return (
    <div style={{ position: "relative" }}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="humFill2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>
          {aqiArea && <linearGradient id="aqiFill2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4A000" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#D4A000" stopOpacity="0" />
          </linearGradient>}
        </defs>
        {[0,25,50,75,100].map(t => (
          <g key={t}>
            <line x1={PL} x2={PL+cW} y1={ys(t)} y2={ys(t)} stroke="#EBE8E3" strokeWidth={0.6} strokeDasharray="4,4" />
            <text x={PL-7} y={ys(t)+4} textAnchor="end" fontSize={9} fill="#9A948E">{t}%</text>
          </g>
        ))}
        {aqiArea && (
          <>
            <path d={aqiArea} fill="url(#aqiFill2)" />
            <motion.path d={aqiLine!} fill="none" stroke="#D4A000" strokeWidth={1.5} strokeDasharray="5,3" opacity={0.6}
              initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : {}} transition={{ duration: 1.3, delay: 0.2 }} />
          </>
        )}
        <path d={humArea} fill="url(#humFill2)" />
        <motion.path d={humLine} fill="none" stroke="#0ea5e9" strokeWidth={2.2} strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={inView ? { pathLength: 1 } : {}} transition={{ duration: 1.1 }} />
        {points.map((_, i) => {
          const { x, y } = humPts[i];
          return <g key={i} onMouseEnter={() => setHover(i)} style={{ cursor: "crosshair" }}>
            <circle cx={x} cy={y} r={12} fill="transparent" />
            <circle cx={x} cy={y} r={hover===i ? 5 : 3} fill="#0ea5e9" stroke="#fff" strokeWidth={1.5} />
          </g>;
        })}
        <line x1={PL} y1={PT} x2={PL} y2={PT+cH} stroke="#EBE8E3" strokeWidth={1} />
        <line x1={PL} y1={PT+cH} x2={PL+cW} y2={PT+cH} stroke="#EBE8E3" strokeWidth={1} />
        {[0,0.25,0.5,0.75,1].map(f => {
          const idx = Math.round(f*(points.length-1));
          return <text key={f} x={xs(points[idx].distance_from_origin_m??0)} y={H-2} textAnchor="middle" fontSize={9} fill="#9A948E">{((points[idx].distance_from_origin_m??0)/1000).toFixed(0)}km</text>;
        })}
        {hover !== null && (() => {
          const p = points[hover]; const { x, y } = humPts[hover];
          const tx = x > W-140 ? x-132 : x+10; const ty = Math.max(PT+4, y-48);
          return (
            <g>
              <line x1={x} y1={PT} x2={x} y2={PT+cH} stroke="#0ea5e9" strokeWidth={1} strokeDasharray="3,2" opacity={0.4} />
              <rect x={tx} y={ty} width={120} height={p.aqi != null ? 50 : 34} rx={8} fill="#fff" stroke="#0ea5e9" strokeWidth={1} filter="drop-shadow(0 2px 8px rgba(0,0,0,0.05))" />
              <text x={tx+9} y={ty+15} fontSize={10} fontWeight="700" fill="#0ea5e9">Humidity {Math.round(p.humidity ?? 0)}%</text>
              {p.aqi != null && <text x={tx+9} y={ty+29} fontSize={9} fill={p.aqi>100 ? "#DC2626" : "#D4A000"}>AQI {Math.round(p.aqi)}{p.aqi>150 ? " · Unhealthy" : p.aqi>100 ? " · Sensitive" : ""}</text>}
              {p.eta && <text x={tx+9} y={ty+(p.aqi!=null?42:27)} fontSize={9} fill="#9A948E">ETA {fmtTime(p.eta)}</text>}
            </g>
          );
        })()}
      </svg>
      <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#9A948E" }}>
          <span style={{ width: 20, height: 3, background: "#0ea5e9", borderRadius: 2, display: "inline-block" as const }} />Humidity (%)
        </span>
        {hasAqi && <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#9A948E" }}>
          <span style={{ width: 20, height: 0, borderBottom: "2px dashed rgba(212,160,0,0.55)", display: "inline-block" as const }} />AQI
        </span>}
      </div>
    </div>
  );
}

// ─── Cooling stop type helpers ────────────────────────────────────────────────

const STOP_META: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  shade:       { color: "#0EA472", bg: "rgba(14,164,114,0.07)",  border: "rgba(14,164,114,0.20)",  icon: <Leaf style={{ width: 13, height: 13 }} />,      label: "Shaded area" },
  indoor:      { color: "#8B5CF6", bg: "rgba(139,92,246,0.07)",  border: "rgba(139,92,246,0.20)",  icon: <Building2 style={{ width: 13, height: 13 }} />,  label: "Indoor stop" },
  water:       { color: "#06B6D4", bg: "rgba(6,182,212,0.07)",   border: "rgba(6,182,212,0.20)",   icon: <Droplets style={{ width: 13, height: 13 }} />,   label: "Hydration stop" },
  gas_station: { color: "#D4A000", bg: "rgba(212,160,0,0.07)",   border: "rgba(212,160,0,0.20)",   icon: <Fuel style={{ width: 13, height: 13 }} />,       label: "Gas station" },
  hospital:    { color: "#DC2626", bg: "rgba(220,38,38,0.07)",   border: "rgba(220,38,38,0.20)",   icon: <HeartPulse style={{ width: 13, height: 13 }} />, label: "Medical facility" },
};

// ─── Segment table ─────────────────────────────────────────────────────────────

function SegmentTable({ points, unitF }: { points: AnalyzeHeatPoint[]; unitF: boolean }) {
  const [sortByRisk, setSortByRisk] = useState(false);
  const [expanded, setExpanded] = useState(false);
  if (!points.length) return null;
  const rows = sortByRisk
    ? [...points].sort((a,b)=>(RISK_ORDER[b.risk_level?.toUpperCase()]||0)-(RISK_ORDER[a.risk_level?.toUpperCase()]||0))
    : points;
  const displayed = expanded ? rows : rows.slice(0, 12);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: "#9A948E" }}>Showing {displayed.length} of {rows.length} waypoints</span>
        <button onClick={() => setSortByRisk(v => !v)} style={{
          padding: "4px 12px", borderRadius: 8, cursor: "pointer", fontSize: 10, fontWeight: 700,
          border: `1px solid ${sortByRisk ? "rgba(249,115,22,0.3)" : "#EBE8E3"}`,
          background: sortByRisk ? "rgba(249,115,22,0.07)" : "#FAF8F2",
          color: sortByRisk ? "#F97316" : "#9A948E",
        }}>
          {sortByRisk ? "⬆ BY RISK" : "SORT BY RISK"}
        </button>
      </div>
      <div style={{ overflowX: "auto", borderRadius: 14, border: "1px solid #EBE8E3" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#FAF8F2", borderBottom: "2px solid #EBE8E3" }}>
              {["Km", "ETA", `Temp ${unitF?"°F":"°C"}`, "Heat Idx", "Humidity", "UV", "AQI", "Risk"].map(h => (
                <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: "#9A948E", whiteSpace: "nowrap" as const }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((p, i) => {
              const { hex, bg } = riskColor(p.risk_level);
              const isHigh = (RISK_ORDER[p.risk_level?.toUpperCase()]||0) >= 3;
              return (
                <tr key={i} style={{ borderBottom: "1px solid #F4F1ED", background: isHigh ? bg : i%2===0 ? "#fff" : "#FDFCFA" }}>
                  <td style={{ padding: "9px 12px", fontWeight: 600, color: "#6B6560" }}>{p.distance_from_origin_m!=null ? (p.distance_from_origin_m/1000).toFixed(1) : "—"}</td>
                  <td style={{ padding: "9px 12px", color: "#6B6560", whiteSpace: "nowrap" as const }}>{p.eta ? fmtTime(p.eta) : "—"}</td>
                  <td style={{ padding: "9px 12px", fontWeight: 700, color: isHigh ? hex : "#1C1917" }}>{disp(p.temperature, unitF)}°</td>
                  <td style={{ padding: "9px 12px", color: "#6B6560" }}>{p.heat_index!=null ? `${disp(p.heat_index, unitF)}°` : "—"}</td>
                  <td style={{ padding: "9px 12px", color: "#6B6560" }}>{p.humidity!=null ? `${Math.round(p.humidity)}%` : "—"}</td>
                  <td style={{ padding: "9px 12px", color: "#6B6560" }}>{p.uv_index!=null ? Math.round(p.uv_index) : "—"}</td>
                  <td style={{ padding: "9px 12px", color: "#6B6560" }}>{p.aqi!=null ? Math.round(p.aqi) : "—"}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 9, fontWeight: 800, background: `${hex}12`, color: hex }}>{p.risk_level ?? "—"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > 12 && (
        <button onClick={() => setExpanded(v => !v)} style={{ display: "flex", alignItems: "center", gap: 6, margin: "10px auto 0", padding: "6px 16px", borderRadius: 10, border: "1px solid #EBE8E3", background: "#fff", fontSize: 11, fontWeight: 600, color: "#6B6560", cursor: "pointer" }}>
          {expanded ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
          {expanded ? "Show less" : `Show ${rows.length-12} more waypoints`}
        </button>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function HeatIntelTab({
  heatPoints, recommendation, departureHours, shownDepartureTime = null, riskScore = null,
  origin, destination, routeName, routeDistance, routeDuration,
  riskLevel, riskMetrics, unitF = false, weatherWeightPct = 70,
}: HeatIntelTabProps) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const unit = unitF ? "°F" : "°C";
  const convert = (c: number) => disp(c, unitF);

  const maxTemp  = riskMetrics?.max_temperature  != null ? convert(riskMetrics.max_temperature)  : null;
  const maxHI    = riskMetrics?.max_heat_index   != null ? convert(riskMetrics.max_heat_index)   : null;
  const maxHumid = riskMetrics?.max_humidity     != null ? Math.round(riskMetrics.max_humidity)  : null;
  const maxAqi   = riskMetrics?.max_aqi          != null ? Math.round(riskMetrics.max_aqi)       : null;
  const maxUv    = riskMetrics?.max_uv_index     != null && riskMetrics.max_uv_index > 0 ? Math.round(riskMetrics.max_uv_index * 10) / 10 : null;


  const highRiskKm = (() => {
    const hi = heatPoints.filter(p => (RISK_ORDER[p.risk_level?.toUpperCase()]||0) >= 3);
    if (hi.length < 2) return null;
    return ((hi.at(-1)!.distance_from_origin_m??0) - (hi[0].distance_from_origin_m??0)) / 1000;
  })();

  const LEVEL_SCORE: Record<string, number> = { EXTREME: 90, VERY_HIGH: 75, HIGH: 55, MEDIUM: 35, MODERATE: 35, LOW: 14 };
  const overallScore = riskScore != null
    ? Math.round(riskScore)
    : (recommendation?.alerts?.length
        ? Math.min(100, Math.max(...recommendation.alerts.map(a => a.risk_score).filter(s => s > 0)))
        : null)
      ?? LEVEL_SCORE[riskLevel?.toUpperCase()]
      ?? (heatPoints.length > 0 ? Math.round(heatPoints.reduce((s, p) => s + p.temperature, 0) / heatPoints.length) : 20);

  const { hex: levelHex, bg: levelBg, border: levelBorder } = riskColor(riskLevel);
  const coolingStops = recommendation?.cooling_stops ?? [];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 28px 80px", display: "flex", flexDirection: "column", gap: 18, fontFamily: "var(--font-body)", color: "#1C1917" }}>

      {/* ── Hero banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        style={{
          borderRadius: 24, overflow: "hidden",
          background: "linear-gradient(135deg,#1C1917 0%,#292524 60%,#1C1917 100%)",
          color: "#fff", position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, borderRadius: "50%", background: "rgba(249,115,22,0.06)", pointerEvents: "none" }} />
        <div style={{ height: 4, background: "linear-gradient(90deg,#F97316,#EA580C,#D4A000)" }} />

        <div style={{ padding: "28px 32px", display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Brain style={{ width: 12, height: 12, color: "#F97316", flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.55)" }}>
                Heat Intelligence Report
              </span>
              <span style={{ fontSize: 9, padding: "2px 9px", borderRadius: 999, fontWeight: 800, background: levelBg, color: levelHex, border: `1px solid ${levelBorder}`, marginLeft: 2 }}>
                {riskLevel || "—"}
              </span>
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: 26, letterSpacing: "-0.025em", margin: "0 0 6px", color: "#fff", lineHeight: 1.2 }}>
              {origin} <span style={{ color: "#F97316" }}>→</span> {destination}
            </h1>
            {recommendation?.headline && (
              <p style={{ margin: "0 0 14px", fontSize: 14, color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>
                {recommendation.headline}
              </p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {[
                { icon: <MapPin style={{ width: 10, height: 10 }} />, text: routeName || "Primary Route" },
                { icon: <TrendingUp style={{ width: 10, height: 10 }} />, text: routeDistance },
                { icon: <Clock style={{ width: 10, height: 10 }} />, text: routeDuration },
              ].filter(m => m.text).map((m, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.07)", padding: "4px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)" }}>
                  {m.icon}{m.text}
                </span>
              ))}
            </div>
            {recommendation && <DecisionBadge decision={recommendation.decision} />}
          </div>

          {/* Risk score circle */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <div style={{ position: "relative", width: 100, height: 100 }}>
              <svg viewBox="0 0 100 100" style={{ width: 100, height: 100, transform: "rotate(-90deg)" }}>
                <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={10} />
                <motion.circle cx="50" cy="50" r="38" fill="none" stroke={levelHex} strokeWidth={10}
                  strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 38}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 38 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 38 * (1 - overallScore / 100) }}
                  transition={{ duration: 1.1, delay: 0.2, ease: "easeOut" }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 900, fontSize: 26, color: "#fff", lineHeight: 1 }}>{overallScore}</span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", marginTop: 2 }}>RISK</span>
              </div>
            </div>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Score / 100</span>
          </div>
        </div>
      </motion.div>

      {/* ── KPI row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 }}>
        {maxTemp != null && (
          <StatCard icon={<Thermometer style={{ width: 15, height: 15 }} />} label="Peak Temperature"
            value={maxTemp} unit={unit} sub="Along entire route"
            color={maxTemp > (unitF ? 100 : 38) ? "#DC2626" : "#F97316"} delay={0.06} />
        )}
        {maxHI != null && (
          <StatCard icon={<Activity style={{ width: 15, height: 15 }} />} label="Max Heat Index"
            value={maxHI} unit={unit} sub="Feels-like peak"
            color="#DC2626" delay={0.10} />
        )}
        {highRiskKm != null && (
          <StatCard icon={<Zap style={{ width: 15, height: 15 }} />} label="High-Risk Distance"
            value={Math.round(highRiskKm)} unit=" km" sub="Danger zone span"
            color="#F97316" delay={0.14} />
        )}
        {maxHumid != null && (
          <StatCard icon={<Droplets style={{ width: 15, height: 15 }} />} label="Max Humidity"
            value={maxHumid} unit="%" sub="Relative humidity"
            color="#0ea5e9" delay={0.18} />
        )}
        {maxAqi != null && (
          <StatCard icon={<Wind style={{ width: 15, height: 15 }} />} label="Peak AQI"
            value={maxAqi} sub="Air quality index"
            color={maxAqi > 100 ? "#DC2626" : "#D4A000"} delay={0.22} />
        )}
        {maxUv != null && (
          <StatCard icon={<Zap style={{ width: 15, height: 15 }} />} label="Peak UV Index"
            value={maxUv} sub="Solar exposure"
            color={maxUv >= 8 ? "#DC2626" : maxUv >= 6 ? "#F97316" : "#D4A000"} delay={0.26} />
        )}
      </div>

      {/* ── Temperature profile ── */}
      {heatPoints.length >= 2 && (
        <Card
          title="Temperature Profile Along Route"
          sub={`Hover waypoints to inspect · dashed = heat index · thresholds at ${unitF ? "90°F / 105°F" : "32°C / 40°C"}`}
          icon={<Activity style={{ width: 14, height: 14 }} />}
          accent="linear-gradient(90deg,#F97316,#DC2626)"
          delay={0.12}
        >
          <TempChart points={heatPoints} unitF={unitF} />
        </Card>
      )}

      {/* ── Temperature vs AI Comparison ── */}
      {departureHours.length > 0 && (
        <Card
          title="Temperature × AI Comparison"
          sub="Every departure hour tested — temperature reading alongside AI verdict and delta from optimal"
          icon={<Gauge style={{ width: 14, height: 14 }} />}
          accent="linear-gradient(90deg,#6D28A0,#8B5CF6)"
          delay={0.15}
        >
          <TempVsAITable hours={departureHours} recommendation={recommendation} unitF={unitF} weightPct={weatherWeightPct} shownDepartureTime={shownDepartureTime} />
        </Card>
      )}

      {/* ── Exposure map ── */}
      {heatPoints.length > 0 && (
        <Card
          title="Heat Exposure Map"
          sub={`${heatPoints.length} waypoints mapped · hover segments for details`}
          icon={<Zap style={{ width: 14, height: 14 }} />}
          accent="linear-gradient(90deg,#0EA472,#D4A000,#DC2626)"
          delay={0.18}
        >
          <ExposureStrip points={heatPoints} unitF={unitF} />
        </Card>
      )}

      {/* ── Humidity + AQI ── */}
      {heatPoints.some(p => p.humidity != null && (p.humidity as number) > 0) && heatPoints.length >= 2 && (
        <Card
          title="Humidity & Air Quality"
          sub="Relative humidity · AQI where available · hover to inspect"
          icon={<Droplets style={{ width: 14, height: 14 }} />}
          accent="linear-gradient(90deg,#0ea5e9,#06B6D4)"
          delay={0.20}
        >
          <HumidityAqiChart points={heatPoints} />
        </Card>
      )}

      {/* ── AI Advisory ── */}
      {recommendation && (
        <Card
          title="AI Heat Advisory"
          sub="Full analysis from the AI route advisor — decision rationale and key risk factors"
          icon={<Brain style={{ width: 14, height: 14 }} />}
          accent="linear-gradient(90deg,#F97316,#EA580C)"
          delay={0.22}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <DecisionBadge decision={recommendation.decision} />
              {recommendation.reason && (
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.75, color: "#44403C", flex: 1, minWidth: 200 }}>
                  {recommendation.reason}
                </p>
              )}
            </div>

            {recommendation.key_factors?.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#9A948E", marginBottom: 8 }}>
                  Key Factors
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {recommendation.key_factors.map((f, i) => (
                    <span key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, padding: "4px 12px", borderRadius: 8, background: "#FAF8F2", border: "1px solid #EBE8E3", color: "#44403C" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#F97316", display: "inline-block", flexShrink: 0 }} />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {recommendation.safety_tip && (
              <div style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 14, background: "rgba(212,160,0,0.06)", border: "1px solid rgba(212,160,0,0.2)" }}>
                <Shield style={{ width: 15, height: 15, color: "#D4A000", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#B98900", marginBottom: 4 }}>Fleet Advisory</div>
                  <span style={{ fontSize: 12, lineHeight: 1.7, color: "#44403C" }}>{recommendation.safety_tip}</span>
                </div>
              </div>
            )}

            {(recommendation.alerts?.length ?? 0) > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#9A948E", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                  <AlertTriangle style={{ width: 10, height: 10, color: "#DC2626" }} />
                  {recommendation.alerts!.length} Critical Segment{recommendation.alerts!.length > 1 ? "s" : ""}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {recommendation.alerts!.slice(0,5).map((a, i) => {
                    const { hex, bg, border } = riskColor(a.risk_level);
                    return (
                      <div key={i} style={{ display: "flex", gap: 12, padding: "11px 14px", borderRadius: 12, background: bg, border: `1px solid ${border}` }}>
                        <AlertTriangle style={{ width: 14, height: 14, color: hex, flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#1C1917", marginBottom: 3, lineHeight: 1.4 }}>{a.message}</div>
                          <div style={{ display: "flex", gap: 8, fontSize: 10, color: "#9A948E", flexWrap: "wrap" as const }}>
                            {a.risk_score > 0 && <span>Score {a.risk_score}/100</span>}
                            {a.distance_km > 0 && <span>{a.distance_km.toFixed(0)} km</span>}
                            {a.eta_time && <span>ETA {fmtTime(a.eta_time)}</span>}
                          </div>
                        </div>
                        {a.temperature > 0 && (
                          <div style={{ flexShrink: 0, textAlign: "right" as const }}>
                            <Thermometer style={{ width: 11, height: 11, color: hex }} />
                            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 15, color: hex }}>{convert(a.temperature)}{unit}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Smart Stop Suggester ── */}
      {coolingStops.length > 0 && (
        <Card
          title={`Smart Stop Suggester — ${coolingStops.length} Cooling Stop${coolingStops.length !== 1 ? "s" : ""}`}
          sub="AI-matched stops within 20 km of high-heat zones · prioritised by type: shade > indoor > water > gas station"
          icon={<Snowflake style={{ width: 14, height: 14 }} />}
          accent="linear-gradient(90deg,#06B6D4,#0ea5e9)"
          delay={0.24}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
            {coolingStops.map((stop, i) => {
              const meta = STOP_META[stop.type] ?? { color: "#9A948E", bg: "rgba(154,148,142,0.07)", border: "rgba(154,148,142,0.20)", icon: <MapPin style={{ width: 13, height: 13 }} />, label: "Stop" };
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 + i * 0.06, duration: 0.22 }}
                  style={{ padding: "16px", borderRadius: 16, background: meta.bg, border: `1px solid ${meta.border}` }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${meta.color}16`, border: `1px solid ${meta.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: meta.color }}>
                      {meta.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 13, color: "#1C1917", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                          {stop.name}
                        </span>
                        {stop.distance_km > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, flexShrink: 0, background: `${meta.color}14`, padding: "2px 7px", borderRadius: 6 }}>
                            {stop.distance_km.toFixed(0)} km
                          </span>
                        )}
                      </div>
                      <span style={{ display: "inline-block", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: `${meta.color}12`, color: meta.color, letterSpacing: "0.04em", marginBottom: 6 }}>
                        {meta.label.toUpperCase()}
                      </span>
                      {stop.eta_time && (
                        <div style={{ fontSize: 10, color: "#6B6560", marginBottom: 5, display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock style={{ width: 9, height: 9 }} />
                          Arrive ~{fmtTime(stop.eta_time)}
                        </div>
                      )}
                      {stop.message && (
                        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.65, color: "#44403C" }}>{stop.message}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          {coolingStops.some(s => s.lat != null && s.lon != null) && (
            <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 10, background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.18)", fontSize: 11, color: "#0e7490", display: "flex", alignItems: "center", gap: 6 }}>
              <Snowflake style={{ width: 12, height: 12, flexShrink: 0 }} />
              These stops appear as 🧊 pins on the map — switch to the Results tab to see them.
            </div>
          )}
        </Card>
      )}

      {/* ── Waypoint intelligence table ── */}
      {heatPoints.length > 0 && (
        <Card
          title="Waypoint Intelligence"
          sub={`${heatPoints.length} data points · full weather readings per segment`}
          icon={<TrendingUp style={{ width: 14, height: 14 }} />}
          accent="linear-gradient(90deg,#1C1917,#44403C)"
          delay={0.28}
        >
          <SegmentTable points={heatPoints} unitF={unitF} />
        </Card>
      )}

      {!recommendation && heatPoints.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9A948E" }}>
          <Brain style={{ width: 36, height: 36, margin: "0 auto 12px", display: "block", opacity: 0.3 }} />
          <p style={{ fontSize: 14, margin: 0 }}>Run an analysis to load heat intelligence data.</p>
        </div>
      )}

      <div style={{ height: 12 }} />
    </div>
  );
}
