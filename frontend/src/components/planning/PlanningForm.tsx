import { useState, useEffect } from "react";
import { X, Loader2, ChevronDown, Home } from "lucide-react";
import thermoLogo from "@/components/ui/images/642e6491-fdc6-4250-bf22-1af5448a877b.png";
import { motion, AnimatePresence } from "framer-motion";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { MascotCharacter } from "@/components/ui/MascotCharacter";

const ANALYSIS_PHRASES = [
  "Scanning heat exposure along your route...",
  "Building route alternatives...",
  "Scoring departure windows...",
  "Analyzing traffic conditions...",
  "Calculating heat risk per segment...",
];

interface RecentTrip {
  origin: string;
  destination: string;
  date: string;
  riskLabel?: string;
  riskColor?: string;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  destinationState?: string;
}

interface PlanningFormProps {
  origin: string;
  onOriginChange: (v: string) => void;
  onOriginSelect: (loc: { name: string; lat: number; lng: number; state?: string }) => void;
  destination: string;
  onDestinationChange: (v: string) => void;
  onDestinationSelect: (loc: { name: string; lat: number; lng: number; state?: string }) => void;
  departureRangeHours: number;
  onDepartureRangeChange: (v: number) => void;
  stepMinutes: number;
  onStepMinutesChange: (v: number) => void;
  weatherWeightPct: number;
  onWeatherWeightChange: (v: number) => void;
  trafficAware: boolean;
  onTrafficAwareChange: (v: boolean) => void;
  passengerTypes: string[];
  onPassengerTypesChange: (v: string[]) => void;
  isSubmitting: boolean;
  showSuccess?: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onNavigateHome: () => void;
}

function formatTodayLabel(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function PlanningForm({
  origin,
  onOriginChange,
  onOriginSelect,
  destination,
  onDestinationChange,
  onDestinationSelect,
  departureRangeHours,
  onDepartureRangeChange,
  stepMinutes,
  onStepMinutesChange,
  weatherWeightPct,
  onWeatherWeightChange,
  trafficAware,
  onTrafficAwareChange,
  passengerTypes,
  onPassengerTypesChange,
  isSubmitting,
  showSuccess = false,
  error,
  onSubmit,
  onNavigateHome,
}: PlanningFormProps) {
  const [analysisPhrase, setAnalysisPhrase] = useState(0);
  const [recents, setRecents] = useState<RecentTrip[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("thermoroute_recents") || "[]").slice(0, 3);
    } catch { return []; }
  });
  const [localOriginCoords, setLocalOriginCoords] = useState<{ lat: number; lng: number; state?: string } | null>(null);
  const [localDestCoords, setLocalDestCoords] = useState<{ lat: number; lng: number; state?: string } | null>(null);
  const isFormValid = origin.trim().length > 0 && destination.trim().length > 0;
  const windowCount = Math.floor((departureRangeHours * 60) / stepMinutes);

  const prefLabel =
    weatherWeightPct >= 70 ? "Stay comfortable" :
    weatherWeightPct >= 55 ? "Comfort first" :
    weatherWeightPct <= 30 ? "Arrive sooner" :
    weatherWeightPct <= 45 ? "Speed first" :
    "Balanced";

  useEffect(() => {
    if (!isSubmitting) return;
    const interval = setInterval(() => {
      setAnalysisPhrase((p) => (p + 1) % ANALYSIS_PHRASES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [isSubmitting]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    try {
      const stored: RecentTrip[] = JSON.parse(localStorage.getItem("thermoroute_recents") || "[]");
      const next: RecentTrip = {
        origin,
        destination,
        date: new Date().toISOString(),
        originLat: localOriginCoords?.lat,
        originLng: localOriginCoords?.lng,
        destinationLat: localDestCoords?.lat,
        destinationLng: localDestCoords?.lng,
        destinationState: localDestCoords?.state,
      };
      const deduped = stored.filter(r => !(r.origin === origin && r.destination === destination));
      localStorage.setItem("thermoroute_recents", JSON.stringify([next, ...deduped].slice(0, 6)));
      setRecents([next, ...deduped].slice(0, 3));
    } catch { /* ignore */ }
    onSubmit(e);
  };

  const handleOriginSelect = (loc: { name: string; lat: number; lng: number; state?: string }) => {
    setLocalOriginCoords({ lat: loc.lat, lng: loc.lng, state: loc.state });
    onOriginSelect(loc);
  };

  const handleDestSelect = (loc: { name: string; lat: number; lng: number; state?: string }) => {
    setLocalDestCoords({ lat: loc.lat, lng: loc.lng, state: loc.state });
    onDestinationSelect(loc);
  };

  const selectWrapStyle: React.CSSProperties = {
    position: "relative",
  };

  const selectStyle: React.CSSProperties = {
    width: "100%",
    height: 48,
    padding: "0 36px 0 14px",
    border: "1px solid #E8E4DF",
    borderRadius: 14,
    background: "#FAF8F2",
    color: "#1C1917",
    fontSize: 15,
    fontWeight: 500,
    appearance: "none",
    cursor: "pointer",
    outline: "none",
    fontFamily: "var(--font-body)",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#78716C",
    marginBottom: 8,
    display: "block",
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#FAF8F2",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* ── Sticky header ──────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: "0 28px",
          zIndex: 20,
          background: "rgba(250,248,242,0.96)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid #EBE8E3",
        }}
      >
        <img
          src={thermoLogo}
          alt="ThermoDispatch"
          onClick={onNavigateHome}
          style={{ height: 56, width: "auto", borderRadius: 8, display: "block", cursor: "pointer" }}
        />
        <div style={{ flex: 1 }} />
        <button
          onClick={onNavigateHome}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "1px solid #EBE8E3",
            borderRadius: 10,
            cursor: "pointer",
            padding: "6px 14px",
            fontSize: 14,
            fontWeight: 600,
            color: "#57534E",
            fontFamily: "var(--font-body)",
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#F97316"; e.currentTarget.style.color = "#F97316"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#EBE8E3"; e.currentTarget.style.color = "#57534E"; }}
        >
          <Home size={15} />
          Home
        </button>
      </header>

      {/* ── Main content ────────────────────────────────────────── */}
      <main
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "72px 28px 96px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Hero */}
        <div style={{ maxWidth: 640 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 999,
              background: "rgba(249,115,22,0.08)",
              color: "#C2410C",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.02em",
              marginBottom: 20,
            }}
          >
            Weather-aware routing
          </div>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 800,
              fontSize: 54,
              lineHeight: 1.02,
              letterSpacing: "-0.035em",
              margin: "0 0 14px",
              color: "#1C1917",
            }}
          >
            Leave at the right hour,{" "}
            <span style={{ color: "#F97316" }}>not just the right way.</span>
          </h1>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.55,
              color: "#6B6560",
              margin: 0,
              maxWidth: 520,
            }}
          >
            Enter a trip and ThermoDispatch forecasts the weather at every point along the way, timed
            to when you will actually arrive there. Then it tells you the departure hour and route
            that keep you most comfortable.
          </p>
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              style={{
                marginTop: 24,
                borderRadius: 14,
                padding: "12px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                background: "rgba(220,38,38,0.05)",
                border: "1px solid rgba(220,38,38,0.18)",
              }}
            >
              <X style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, color: "#DC2626" }} />
              <p style={{ fontSize: 13, lineHeight: 1.4, color: "#DC2626", margin: 0 }}>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form card */}
        <form onSubmit={handleSubmit} style={{ marginTop: 40 }}>
          <div
            style={{
              position: "relative",
              background: "#FEFCF8",
              border: "1px solid #EBE8E3",
              borderRadius: 22,
              padding: 26,
              boxShadow: "0 1px 2px rgba(80,50,20,0.05), 0 12px 32px rgba(80,50,20,0.06)",
            }}
          >
            {/* Loading overlay */}
            {isSubmitting && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 22,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 20,
                  background: "rgba(255,255,255,0.97)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  zIndex: 100,
                }}
              >
                <MascotCharacter state="thinking" size={80} />
                <div style={{ textAlign: "center", padding: "0 16px" }}>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={analysisPhrase}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        marginBottom: 6,
                        color: "#1C1917",
                        fontFamily: "var(--font-heading)",
                      }}
                    >
                      {ANALYSIS_PHRASES[analysisPhrase]}
                    </motion.p>
                  </AnimatePresence>
                  <p style={{ fontSize: 12, color: "#9A948E", margin: 0 }}>Analyzing your route</p>
                </div>
                <div
                  style={{
                    width: 192,
                    height: 4,
                    borderRadius: 999,
                    overflow: "hidden",
                    background: "#EBE8E3",
                  }}
                >
                  <motion.div
                    style={{ height: "100%", borderRadius: 999, background: "#F97316" }}
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </div>
            )}

            {/* Success overlay */}
            {/* Success overlay */}
            {showSuccess && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 22,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 20,
                  background: "rgba(255,255,255,0.97)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  zIndex: 100,
                }}
              >
                <MascotCharacter state="happy" size={80} />
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "#0EA472", fontFamily: "var(--font-heading)", margin: 0 }}>
                    Route found
                  </p>
                  <p style={{ fontSize: 12, color: "#9A948E", marginTop: 4 }}>Opening your route now...</p>
                </div>
              </div>
            )}

            {/* Origin / Destination — 2-col grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <label style={{ display: "flex", flexDirection: "column" }}>
                <span style={labelStyle}>Starting from</span>
                <LocationAutocomplete
                  value={origin}
                  onChange={onOriginChange}
                  onLocationSelect={handleOriginSelect}
                  placeholder="Austin, TX"
                  disabled={isSubmitting}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column" }}>
                <span style={labelStyle}>Going to</span>
                <LocationAutocomplete
                  value={destination}
                  onChange={onDestinationChange}
                  onLocationSelect={handleDestSelect}
                  placeholder="Houston, TX"
                  disabled={isSubmitting}
                />
              </label>
            </div>

            {/* Travel day / Departure window / Step — 3-col grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
                marginTop: 16,
              }}
            >
              <label style={{ display: "flex", flexDirection: "column" }}>
                <span style={labelStyle}>Travel day</span>
                <div
                  style={{
                    padding: "14px 16px",
                    border: "1px solid #E8E4DF",
                    borderRadius: 14,
                    background: "#FAF8F2",
                    fontSize: 15,
                    fontWeight: 500,
                    color: "#6B6560",
                  }}
                >
                  {formatTodayLabel()}
                </div>
              </label>

              <label style={{ display: "flex", flexDirection: "column" }}>
                <span style={labelStyle}>Departure window</span>
                <div style={selectWrapStyle}>
                  <select
                    value={departureRangeHours}
                    onChange={(e) => onDepartureRangeChange(Number(e.target.value))}
                    disabled={isSubmitting}
                    style={selectStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#F97316";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.10)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#E8E4DF";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <option value={2}>Next 2 hours</option>
                    <option value={6}>Next 6 hours</option>
                    <option value={12}>Next 12 hours</option>
                  </select>
                  <ChevronDown
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 16,
                      height: 16,
                      pointerEvents: "none",
                      color: "#9A948E",
                    }}
                  />
                </div>
              </label>

              <label style={{ display: "flex", flexDirection: "column" }}>
                <span style={labelStyle}>Check every</span>
                <div style={selectWrapStyle}>
                  <select
                    value={stepMinutes}
                    onChange={(e) => onStepMinutesChange(Number(e.target.value))}
                    disabled={isSubmitting}
                    style={selectStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#F97316";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.10)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#E8E4DF";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                  <ChevronDown
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 16,
                      height: 16,
                      pointerEvents: "none",
                      color: "#9A948E",
                    }}
                  />
                </div>
              </label>
            </div>

            {/* Priority slider */}
            <div
              style={{
                marginTop: 22,
                paddingTop: 22,
                borderTop: "1px solid #EBE8E3",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <span style={labelStyle}>What matters more</span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    color: "#F97316",
                    fontWeight: 600,
                  }}
                >
                  {prefLabel}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={weatherWeightPct}
                onChange={(e) => onWeatherWeightChange(Number(e.target.value))}
                disabled={isSubmitting}
                className="heat-slider"
                style={{ width: "100%", accentColor: "#F97316", height: 4 }}
                aria-label="Route priority"
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 8,
                  fontSize: 12,
                  color: "#9A948E",
                }}
              >
                <span>Arrive sooner</span>
                <span>Stay comfortable</span>
              </div>
            </div>

            {/* Traffic toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 18,
                paddingTop: 18,
                borderTop: "1px solid #EBE8E3",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#1C1917" }}>
                  Traffic-aware routing
                </div>
                <div style={{ fontSize: 12, color: "#9A948E", marginTop: 2 }}>
                  Factor live traffic into travel time
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={trafficAware}
                onClick={() => onTrafficAwareChange(!trafficAware)}
                disabled={isSubmitting}
                style={{
                  position: "relative",
                  display: "inline-flex",
                  height: 26,
                  width: 44,
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  flexShrink: 0,
                  padding: 0,
                  background: trafficAware ? "#F97316" : "#D6D3D1",
                  boxShadow: trafficAware ? "0 0 10px rgba(249,115,22,0.25)" : "none",
                  transition: "background 0.2s",
                }}
              >
                <span
                  style={{
                    display: "block",
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                    margin: 3,
                    transition: "transform 0.2s",
                    transform: trafficAware ? "translateX(18px)" : "translateX(0)",
                  }}
                />
              </button>
            </div>

            {/* Passengers */}
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #EBE8E3" }}>
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#78716C", display: "block", marginBottom: 12 }}>
                Traveling with
              </span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                {([
                  { id: "kids",    emoji: "👶", label: "Kids"    },
                  { id: "elderly", emoji: "👴", label: "Elderly" },
                  { id: "pets",    emoji: "🐾", label: "Pets"    },
                ] as const).map(opt => {
                  const active = passengerTypes.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => onPassengerTypesChange(
                        active ? passengerTypes.filter(t => t !== opt.id) : [...passengerTypes, opt.id]
                      )}
                      style={{
                        display: "flex", alignItems: "center", gap: 7,
                        padding: "8px 16px", borderRadius: 10,
                        border: `1.5px solid ${active ? "#F97316" : "#E8E4DF"}`,
                        background: active ? "rgba(249,115,22,0.08)" : "#FAF8F2",
                        color: active ? "#EA580C" : "#57534E",
                        fontSize: 14, fontWeight: 600,
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                        transition: "all 150ms",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{opt.emoji}</span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: 11.5, color: "#9A948E", margin: "9px 0 0" }}>
                We'll tailor rest stops and suggestions to your passengers
              </p>
            </div>

            {/* CTA row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginTop: 24,
                flexWrap: "wrap",
              }}
            >
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                style={{
                  padding: "15px 26px",
                  border: "none",
                  borderRadius: 14,
                  background: isFormValid && !isSubmitting ? "#F97316" : "#D6D3D1",
                  color: "#fff",
                  fontFamily: "var(--font-body)",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: isFormValid && !isSubmitting ? "pointer" : "not-allowed",
                  transition: "background 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  whiteSpace: "nowrap",
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                    Analyzing your route...
                  </>
                ) : (
                  "Find the best departure"
                )}
              </button>
              <span style={{ fontSize: 13, color: "#9A948E" }}>
                {windowCount} departure window{windowCount !== 1 ? "s" : ""} · {departureRangeHours}h range
              </span>
            </div>
          </div>
        </form>

        {/* Recent trips */}
        {recents.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#78716C",
                marginBottom: 14,
              }}
            >
              Recent trips
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 14,
              }}
            >
              {recents.map((r, i) => (
                <div
                  key={i}
                  onClick={() => {
                    onOriginChange(r.origin);
                    onDestinationChange(r.destination);
                    if (r.originLat != null && r.originLng != null) {
                      handleOriginSelect({ name: r.origin, lat: r.originLat, lng: r.originLng });
                    }
                    if (r.destinationLat != null && r.destinationLng != null) {
                      handleDestSelect({ name: r.destination, lat: r.destinationLat, lng: r.destinationLng, state: r.destinationState });
                    }
                  }}
                  style={{
                    padding: 18,
                    border: "1px solid #EBE8E3",
                    borderRadius: 16,
                    background: "#FEFCF8",
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#F97316")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#EBE8E3")}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontWeight: 700,
                      fontSize: 15,
                      letterSpacing: "-0.01em",
                      color: "#1C1917",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {r.origin}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#78716C",
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    → {r.destination}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 14,
                    }}
                  >
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: "rgba(249,115,22,0.08)",
                        color: "#C2410C",
                      }}
                    >
                      Previous trip
                    </span>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 12,
                        color: "#9A948E",
                      }}
                    >
                      {timeAgo(r.date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
