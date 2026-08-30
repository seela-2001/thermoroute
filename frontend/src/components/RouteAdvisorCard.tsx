import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Clock, Thermometer, Shield, Zap, Sparkles } from "lucide-react";
import type { CriticalAlert, CoolingStop } from "@/services/api";

interface RouteAdvisorCardProps {
  headline: string;
  decision: string;
  reason: string;
  key_factors: string[];
  safety_tip: string;
  alerts?: CriticalAlert[];
  cooling_stops?: CoolingStop[];
}

function DecisionIcon({ decision, size = 20 }: { decision: string; size?: number }) {
  const style = { width: size, height: size, color: "#fff" };
  const d = decision?.toUpperCase();
  if (d?.startsWith("GO")) return <CheckCircle style={style} />;
  if (d === "DELAY") return <AlertTriangle style={style} />;
  return <Clock style={style} />;
}

function getDecisionConfig(decision: string) {
  const d = decision?.toUpperCase();
  if (d?.startsWith("GO"))
    return {
      gradient: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
      glowColor: "rgba(22, 163, 74, 0.22)",
      borderColor: "rgba(22, 163, 74, 0.32)",
      gaugeDefault: 18,
      label: "GOOD TO GO",
    };
  if (d === "DELAY")
    return {
      gradient: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
      glowColor: "rgba(220, 38, 38, 0.22)",
      borderColor: "rgba(220, 38, 38, 0.32)",
      gaugeDefault: 85,
      label: "DELAY ADVISED",
    };
  return {
    gradient: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
    glowColor: "rgba(217, 119, 6, 0.22)",
    borderColor: "rgba(217, 119, 6, 0.32)",
    gaugeDefault: 52,
    label: "CAUTION",
  };
}

function gaugeSegmentColor(score: number): string {
  if (score < 35) return "#22c55e";
  if (score < 65) return "#f59e0b";
  return "#ef4444";
}

const STOP_TYPE_META: Record<string, { label: string; emoji: string; color: string }> = {
  shade:       { label: "Shaded area",     emoji: "🌿", color: "#0EA472" },
  indoor:      { label: "Indoor stop",     emoji: "🏢", color: "#8B5CF6" },
  water:       { label: "Hydration stop",  emoji: "💧", color: "#06B6D4" },
  gas_station: { label: "Gas station",     emoji: "⛽", color: "#D4A000" },
  hospital:    { label: "Medical facility",emoji: "🏥", color: "#DC2626" },
};

export function RouteAdvisorCard({
  headline,
  decision,
  reason,
  key_factors,
  safety_tip,
  alerts,
  cooling_stops,
}: RouteAdvisorCardProps) {
  const cfg = getDecisionConfig(decision);

  const gaugeScore =
    alerts && alerts.length > 0
      ? Math.min(100, Math.max(...alerts.map((a) => a.risk_score)))
      : cfg.gaugeDefault;

  const maxTemp =
    alerts && alerts.length > 0
      ? Math.max(...alerts.map((a) => a.temperature))
      : null;

  const segColor = gaugeSegmentColor(gaugeScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.0, 0.0, 0.2, 1] }}
      className="rounded-2xl overflow-hidden mb-4"
      style={{
        background: "var(--color-surface)",
        border: `1px solid ${cfg.borderColor}`,
        boxShadow: `0 0 0 1px ${cfg.borderColor}, 0 6px 28px ${cfg.glowColor}`,
      }}
    >
      {/* ── Decision banner ── */}
      <div
        style={{
          background: cfg.gradient,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "rgba(255,255,255,0.16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <DecisionIcon decision={decision} size={22} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 3,
            }}
          >
            <Sparkles style={{ width: 10, height: 10, color: "rgba(255,255,255,0.7)" }} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.75)",
                fontFamily: "var(--font-heading)",
              }}
            >
              AI Advisor · {cfg.label}
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 700,
              fontSize: 14,
              color: "#fff",
              lineHeight: 1.3,
            }}
          >
            {headline}
          </div>
        </div>

        {maxTemp != null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "rgba(255,255,255,0.16)",
              borderRadius: 12,
              padding: "6px 12px",
              flexShrink: 0,
            }}
          >
            <Thermometer style={{ width: 14, height: 14, color: "#fff" }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--font-heading)" }}>
              {Math.round(maxTemp)}°F
            </span>
          </div>
        )}
      </div>

      {/* ── Heat risk gauge ── */}
      <div style={{ padding: "14px 20px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 7,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
            }}
          >
            Heat Risk Score
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: segColor, fontFamily: "var(--font-heading)" }}>
            {gaugeScore}
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-muted)" }}>/100</span>
          </span>
        </div>

        {/* Track */}
        <div
          style={{
            height: 8,
            background: "var(--color-base)",
            borderRadius: 99,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Colored zone markers */}
          <div style={{ position: "absolute", inset: 0, display: "flex" }}>
            <div style={{ flex: 35, background: "rgba(34,197,94,0.12)" }} />
            <div style={{ flex: 30, background: "rgba(245,158,11,0.12)" }} />
            <div style={{ flex: 35, background: "rgba(239,68,68,0.12)" }} />
          </div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${gaugeScore}%` }}
            transition={{ duration: 0.9, delay: 0.25, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              background: `linear-gradient(90deg, #22c55e 0%, ${segColor} 100%)`,
              borderRadius: 99,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 4,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: "var(--color-text-muted)",
          }}
        >
          <span>SAFE</span>
          <span>CAUTION</span>
          <span>DANGER</span>
        </div>
      </div>

      {/* ── Reason ── */}
      {reason && (
        <div style={{ padding: "12px 20px 0" }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.65,
              color: "var(--color-text-secondary)",
              fontFamily: "var(--font-body)",
            }}
          >
            {reason}
          </p>
        </div>
      )}

      {/* ── Key factors ── */}
      {key_factors && key_factors.length > 0 && (
        <div style={{ padding: "10px 20px 0", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {key_factors.map((f, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 999,
                background: "var(--color-base)",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border-subtle)",
                fontFamily: "var(--font-body)",
              }}
            >
              {f}
            </span>
          ))}
        </div>
      )}

      {/* ── Safety tip ── */}
      {safety_tip && (
        <div style={{ padding: "10px 20px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 9,
              padding: "10px 14px",
              borderRadius: 14,
              background: "rgba(251,191,36,0.07)",
              border: "1px solid rgba(251,191,36,0.22)",
            }}
          >
            <Shield
              style={{ width: 13, height: 13, color: "#f59e0b", marginTop: 1, flexShrink: 0 }}
            />
            <span
              style={{
                fontSize: 11,
                lineHeight: 1.6,
                color: "var(--color-text-secondary)",
                fontFamily: "var(--font-body)",
              }}
            >
              {safety_tip}
            </span>
          </div>
        </div>
      )}

      {/* ── Critical alerts ── */}
      {alerts && alerts.length > 0 && (
        <div style={{ padding: "12px 20px 16px" }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
              marginBottom: 7,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <AlertTriangle style={{ width: 10, height: 10, color: "var(--color-critical)" }} />
            {alerts.length} Critical Segment{alerts.length !== 1 ? "s" : ""} Detected
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {alerts.map((alert, i) => {
              const isHigh = alert.risk_level === "EXTREME" || alert.risk_level === "HIGH";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "9px 13px",
                    borderRadius: 12,
                    background: isHigh ? "rgba(239,68,68,0.07)" : "rgba(251,191,36,0.07)",
                    border: `1px solid ${isHigh ? "rgba(239,68,68,0.22)" : "rgba(251,191,36,0.22)"}`,
                  }}
                >
                  <Zap
                    style={{
                      width: 12,
                      height: 12,
                      flexShrink: 0,
                      color: isHigh ? "#ef4444" : "#f59e0b",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-secondary)",
                      lineHeight: 1.45,
                      fontFamily: "var(--font-body)",
                      flex: 1,
                    }}
                  >
                    {alert.message}
                  </span>
                  {alert.temperature > 0 && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: isHigh ? "#ef4444" : "#f59e0b",
                        flexShrink: 0,
                        fontFamily: "var(--font-heading)",
                      }}
                    >
                      {Math.round(alert.temperature)}°
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Cooling stops ── */}
      {cooling_stops && cooling_stops.length > 0 && (
        <div style={{ padding: "0 20px 16px" }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "#06B6D4",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            🧊 {cooling_stops.length} Cooling Stop{cooling_stops.length !== 1 ? "s" : ""} Suggested
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {cooling_stops.map((stop, i) => {
              const meta = STOP_TYPE_META[stop.type] ?? { label: "Stop", emoji: "📍", color: "#9A948E" };
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: `${meta.color}08`,
                    border: `1px solid ${meta.color}22`,
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1 }}>{meta.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--color-text-primary)",
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {stop.name}
                      </span>
                      {stop.distance_km > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: meta.color,
                            flexShrink: 0,
                            background: `${meta.color}14`,
                            padding: "2px 7px",
                            borderRadius: 6,
                          }}
                        >
                          {stop.distance_km.toFixed(0)} km
                        </span>
                      )}
                    </div>
                    {stop.message && (
                      <p
                        style={{
                          margin: "3px 0 0",
                          fontSize: 10,
                          lineHeight: 1.55,
                          color: "var(--color-text-secondary)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {stop.message}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!(alerts?.length || cooling_stops?.length) && <div style={{ height: 16 }} />}
    </motion.div>
  );
}
