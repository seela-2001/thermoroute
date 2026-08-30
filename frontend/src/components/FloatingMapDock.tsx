import { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  Clock,
  Navigation,
  Loader2,
  MapPin,
  Fuel,
  HeartPulse,
  Leaf,
  Droplets,
  Building2,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CoolingStop } from "@/services/api";

// Types

type ActiveSection = null | "departure" | "stops";

export interface DepartureHourInfo {
  label: string;
  tempValue: number;
  risk: string;
  routeScore?: number | null;
  weatherScore?: number | null;
  isBest?: boolean;
  departureTime?: string;
}

export interface DockPoi {
  id: string | null;
  type: string;
  name: string;
  lat: number;
  lon: number;
  distance?: number | null;
  address?: string | null;
}

interface FloatingMapDockProps {
  onStopSelect?: (stop: Stop) => void;
  onDepartureHover?: (hour: DepartureHourInfo | null) => void;
  hours?: DepartureHourInfo[];
  hoursLoading?: boolean;
  pois?: DockPoi[];
  coolingStops?: CoolingStop[];
  windowLabel?: string;
}

// ─── Departure Section ─────────────────────────────────────────────

function DepartureSection({
  onHourHover,
  hours,
  hoursLoading,
  windowLabel,
}: {
  onHourHover?: (hour: DepartureHourInfo | null) => void;
  hours?: DepartureHourInfo[];
  hoursLoading?: boolean;
  windowLabel?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const onHourHoverRef = useRef(onHourHover);
  useLayoutEffect(() => { onHourHoverRef.current = onHourHover; });
  useEffect(() => () => onHourHoverRef.current?.(null), []);

  const bestDeparture =
    hours && hours.length > 0
      ? hours.find((h) => h.isBest) ??
        hours.reduce((best, h) => (h.tempValue < best.tempValue ? h : best), hours[0])
      : null;

  const getRiskColor = (risk: string): string => {
    switch (risk) {
      case "low":       return "var(--color-safe)";
      case "moderate":  return "var(--color-caution)";
      case "high":      return "var(--color-risk)";
      case "very_high": return "var(--color-critical)";
      case "extreme":   return "var(--color-critical)";
      default:          return "var(--color-safe)";
    }
  };

  const handleHourClick = (idx: number, hour: DepartureHourInfo) => {
    if (selectedIdx === idx) {
      setSelectedIdx(null);
      onHourHover?.(null);
    } else {
      setSelectedIdx(idx);
      onHourHover?.(hour);
    }
  };

  const handleMouseLeave = (idx: number) => {
    setHoveredIdx(null);
    if (selectedIdx !== null && selectedIdx !== idx && hours) {
      onHourHover?.(hours[selectedIdx]);
    } else if (selectedIdx === idx && hours) {
      onHourHover?.(hours[selectedIdx]);
    } else {
      onHourHover?.(null);
    }
  };

  return (
    <div className="px-4 pb-4 pt-4">
      <div
        className="text-[10px] font-semibold tracking-widest uppercase mb-4"
        style={{ color: "var(--color-text-muted)" }}
      >
        {windowLabel || "DEPARTURE WINDOW"}
      </div>

      <div className="relative mb-5">
        {hoursLoading && (
          <div className="flex items-center justify-center gap-2 py-6" style={{ color: "var(--color-text-muted)" }}>
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--color-accent)" }} />
            <span className="text-[12px]">Loading hourly forecast...</span>
          </div>
        )}
        {!hoursLoading && (!hours || hours.length === 0) && (
          <div className="py-6 text-center text-[12px]" style={{ color: "var(--color-text-muted)" }}>
            Hourly forecast unavailable
          </div>
        )}
        {!hoursLoading && bestDeparture && (
          <div className="relative">
            {/* Temperature gradient strip */}
            <div
              className="absolute bottom-0 left-0 right-0 h-1 rounded-full"
              style={{
                background: `linear-gradient(to right, ${
                  hours!.map((h) => {
                    if (h.risk === "low") return "var(--color-safe)";
                    if (h.risk === "moderate") return "var(--color-caution)";
                    if (h.risk === "high") return "var(--color-risk)";
                    return "var(--color-critical)";
                  }).join(", ")
                })`,
                opacity: 0.4,
              }}
            />
          <div className="relative flex items-center justify-between gap-1 overflow-x-auto pt-12 pb-3 -mt-10 scrollbar-hide">
            {hours!.map((hour, idx) => {
              const isBest = hour.label === bestDeparture.label;
              const isHovered = hoveredIdx === idx;
              const isSelected = selectedIdx === idx;
              const showTooltip = isHovered || (isSelected && hoveredIdx === null);
              const riskColor = getRiskColor(hour.risk);
              const isActive = isBest || isHovered || isSelected;

              return (
                <button
                  key={hour.label}
                  className="relative flex flex-col items-center z-10 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                  style={{ borderRadius: "var(--radius-full)" }}
                  onClick={() => handleHourClick(idx, hour)}
                  onMouseEnter={() => {
                    setHoveredIdx(idx);
                    onHourHover?.(hour);
                  }}
                  onMouseLeave={() => handleMouseLeave(idx)}
                  aria-pressed={isSelected}
                  aria-label={`Depart at ${hour.label}, ${hour.tempValue}°C, ${hour.risk} heat`}
                >
                  {/* Tooltip */}
                  <AnimatePresence>
                    {showTooltip && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute -top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                      >
                        <div
                          className="rounded-lg px-3 py-1.5 shadow-xl whitespace-nowrap flex items-center gap-1.5"
                          style={{
                            background: "var(--color-surface)",
                            border: "1px solid var(--color-border)",
                            boxShadow: "var(--shadow-mid)",
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: riskColor }}
                          />
                          <span className="text-[11px] font-semibold" style={{ color: "var(--color-accent)" }}>
                            {hour.tempValue}°
                          </span>
                          <span className="text-[11px] font-medium" style={{ color: riskColor }}>
                            {hour.risk.toUpperCase()}
                          </span>
                        </div>
                        <div
                          className="w-2 h-2 rotate-45 mx-auto -mt-1 border-b border-r"
                          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Hour circle */}
                  <motion.div
                    animate={{ scale: isHovered ? 1.12 : isSelected ? 1.06 : 1 }}
                    transition={{ duration: 0.15 }}
                    className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-[11px] font-bold mb-2"
                    style={{
                      background: isBest
                        ? "rgba(249,115,22,0.08)"
                        : isSelected
                        ? "rgba(249,115,22,0.06)"
                        : "var(--color-base)",
                      borderColor: isBest || isSelected
                        ? "var(--color-accent)"
                        : isHovered
                        ? "var(--color-text-muted)"
                        : "var(--color-border)",
                      color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                      boxShadow:
                        isBest
                          ? "0 0 12px rgba(249,115,22,0.25)"
                          : isSelected
                          ? "0 0 8px rgba(249,115,22,0.15)"
                          : undefined,
                    }}
                  >
                    {hour.tempValue}
                  </motion.div>

                  {/* Time label */}
                  <span
                    className="text-[9px] font-medium"
                    style={{ color: isBest || isSelected ? "var(--color-accent)" : "var(--color-text-muted)" }}
                  >
                    {hour.label}
                  </span>

                  {/* Best / selected indicator */}
                  {(isBest || isSelected) && (
                    <div
                      className="w-6 h-[3px] rounded-full mt-1"
                      style={{ background: "var(--color-accent)", opacity: isSelected && !isBest ? 0.6 : 1 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          </div>
        )}
      </div>

      {/* Best Departure */}
      <div className="border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
        <div
          className="text-[10px] font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--color-text-muted)" }}
        >
          BEST DEPARTURE
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[16px] font-semibold"
            style={{ color: "var(--color-accent)", fontFamily: "var(--font-heading)" }}
          >
            {bestDeparture ? bestDeparture.label : "--"}
          </span>
          <span className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
            best balance of heat &amp; time
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Stops Section ─────────────────────────────────────────────────

interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

function poiTypeLabel(type: string): string {
  switch (type) {
    case "gas_station": return "Fuel stop";
    case "hospital":    return "Hospital";
    case "shade":       return "Shade / Park";
    case "water":       return "Drinking water";
    case "indoor":      return "Indoor stop";
    default:            return "Point of interest";
  }
}

function poiTypeColor(type: string): string {
  switch (type) {
    case "gas_station": return "var(--color-caution)";
    case "hospital":    return "var(--color-critical)";
    case "shade":       return "var(--color-safe)";
    case "water":       return "#06B6D4";
    case "indoor":      return "#8B5CF6";
    default:            return "var(--color-text-muted)";
  }
}

function PoiIcon({ type, color }: { type: string; color: string }) {
  const props = { style: { color, width: 14, height: 14 } };
  switch (type) {
    case "gas_station": return <Fuel {...props} />;
    case "hospital":    return <HeartPulse {...props} />;
    case "shade":       return <Leaf {...props} />;
    case "water":       return <Droplets {...props} />;
    case "indoor":      return <Building2 {...props} />;
    default:            return <MapPin {...props} />;
  }
}

function StopsSection({
  pois,
  coolingStops = [],
  onStopSelect,
}: {
  pois: DockPoi[];
  coolingStops?: CoolingStop[];
  onStopSelect?: (stop: Stop) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (poi: DockPoi) => {
    const id = poi.id || `${poi.lat},${poi.lon}`;
    setSelectedId(id);
    onStopSelect?.({ id, name: poi.name, lat: poi.lat, lng: poi.lon });
  };

  const handleCoolingSelect = (stop: CoolingStop, idx: number) => {
    const id = `ai-stop-${idx}`;
    setSelectedId(id);
    if (stop.lat != null && stop.lon != null) {
      onStopSelect?.({ id, name: stop.name, lat: stop.lat, lng: stop.lon });
    }
  };

  const hasContent = (pois && pois.length > 0) || coolingStops.length > 0;

  return (
    <div className="px-4 pb-4 pt-4">
      {!hasContent && (
        <div className="py-8 flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "var(--color-base)" }}
          >
            <MapPin className="w-5 h-5" style={{ color: "var(--color-text-muted)" }} />
          </div>
          <div className="text-center">
            <p className="text-[13px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
              No stops along this route
            </p>
            <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
              No fuel stops, hospitals, or shade found along this route
            </p>
          </div>
        </div>
      )}

      {/* AI Suggested cooling stops */}
      {coolingStops.length > 0 && (
        <>
          <div
            className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase mb-2"
            style={{ color: "#6366f1" }}
          >
            <Sparkles style={{ width: 10, height: 10 }} />
            AI SUGGESTED
          </div>
          <div className="space-y-1.5 mb-4">
            {coolingStops.map((stop, idx) => {
              const id = `ai-stop-${idx}`;
              const isSelected = selectedId === id;
              return (
                <motion.button
                  key={id}
                  onClick={() => handleCoolingSelect(stop, idx)}
                  whileTap={{ scale: 0.99 }}
                  className="w-full text-left rounded-xl px-3 py-2.5 transition-all"
                  style={{
                    background: isSelected ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.03)",
                    border: isSelected
                      ? "1px solid rgba(99,102,241,0.35)"
                      : "1px solid rgba(99,102,241,0.15)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <Sparkles style={{ width: 11, height: 11, color: "#6366f1", flexShrink: 0 }} />
                    <span
                      className="text-[12px] font-semibold truncate"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {stop.name}
                    </span>
                    {stop.eta_time && (
                      <span
                        className="text-[10px] ml-auto flex-shrink-0"
                        style={{ color: "#6366f1" }}
                      >
                        {(() => { try { return new Date(stop.eta_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); } catch { return stop.eta_time; } })()}
                      </span>
                    )}
                  </div>
                  {stop.message && (
                    <p
                      className="text-[10px] leading-relaxed pl-5"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {stop.message}
                    </p>
                  )}
                </motion.button>
              );
            })}
          </div>
        </>
      )}

      {/* Nearby POIs */}
      {pois && pois.length > 0 && (
        <>
          <div
            className="text-[10px] font-semibold tracking-widest uppercase mb-2"
            style={{ color: "var(--color-text-muted)" }}
          >
            NEARBY
          </div>
          <div className="dock-scroll-y space-y-1.5 overflow-y-auto pr-1" style={{ maxHeight: "170px" }}>
            {pois.map((poi, idx) => {
              const id = poi.id || `${poi.lat},${poi.lon}`;
              const isSelected = selectedId === id;
              const iconColor = poiTypeColor(poi.type);

              return (
                <motion.button
                  key={poi.id || `poi-${idx}`}
                  onClick={() => handleSelect(poi)}
                  whileTap={{ scale: 0.99 }}
                  className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all"
                  style={{
                    background: isSelected ? "rgba(249,115,22,0.04)" : "var(--color-surface)",
                    border: isSelected
                      ? "1px solid rgba(249,115,22,0.25)"
                      : "1px solid var(--color-border)",
                    borderLeft: isSelected ? "3px solid var(--color-accent)" : undefined,
                  }}
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: isSelected ? "rgba(249,115,22,0.06)" : "var(--color-base)" }}
                    >
                      <PoiIcon type={poi.type} color={iconColor} />
                    </div>
                    <div className="min-w-0">
                      <div
                        className="text-[13px] font-semibold mb-0.5 truncate"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {poi.name}
                      </div>
                      <div className="text-[10px] truncate" style={{ color: "var(--color-text-muted)" }}>
                        {poiTypeLabel(poi.type)}
                        {poi.address ? ` · ${poi.address}` : ""}
                      </div>
                    </div>
                  </div>
                  <div
                    className="text-[10px] font-semibold flex-shrink-0 ml-3"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {poi.distance != null
                      ? poi.distance >= 1000
                        ? `${(poi.distance / 1000).toFixed(1)} km`
                        : `${Math.round(poi.distance)} m`
                      : ""}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Floating Dock ────────────────────────────────────────────

export function FloatingMapDock({
  onStopSelect,
  onDepartureHover,
  hours,
  hoursLoading,
  pois = [],
  coolingStops = [],
  windowLabel,
}: FloatingMapDockProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);
  const [isFullExpanded, setIsFullExpanded] = useState(false);

  const sections = [
    { id: "departure" as const, label: "Departure", icon: Clock },
    { id: "stops" as const, label: "Stops", icon: Navigation },
  ];

  const toggleSection = (sectionId: ActiveSection) => {
    if (activeSection === sectionId) {
      setActiveSection(null);
      setIsFullExpanded(false);
    } else {
      setActiveSection(sectionId);
    }
  };

  return (
    <>
      <div
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 w-full px-3 transition-all duration-[280ms] ease-out ${
          activeSection === "departure" ? "max-w-[760px]" : "max-w-[420px]"
        }`}
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          zIndex: "var(--z-dock)" as React.CSSProperties["zIndex"],
        }}
      >
        <div className="flex flex-col items-center">
          {/* Expanded Content Panel */}
          <AnimatePresence>
            {activeSection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-full overflow-hidden rounded-t-2xl"
                style={{
                  background: "rgba(255,255,255,0.97)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  borderTop: "1px solid var(--color-border)",
                  borderLeft: "1px solid var(--color-border)",
                  borderRight: "1px solid var(--color-border)",
                }}
              >
                <div>
                {/* Expand/collapse handle */}
                <div
                  className="flex items-center justify-center py-2 cursor-pointer"
                  style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                  onClick={() => setIsFullExpanded((v) => !v)}
                  role="button"
                  aria-label={isFullExpanded ? "Collapse panel" : "Expand to full height"}
                >
                  {isFullExpanded ? (
                    <ChevronDown className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
                  ) : (
                    <ChevronUp className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
                  )}
                </div>
              </div>
              <div style={{ maxHeight: isFullExpanded ? "85vh" : "42vh", overflowY: "auto" }}>
                  {activeSection === "departure" && (
                    <DepartureSection
                      onHourHover={onDepartureHover}
                      hours={hours}
                      hoursLoading={hoursLoading}
                      windowLabel={windowLabel}
                    />
                  )}
                  {activeSection === "stops" && (
                    <StopsSection pois={pois} coolingStops={coolingStops} onStopSelect={onStopSelect} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Navigation Dock */}
          <div
            className="w-full"
            style={{
              background: "rgba(255,255,255,0.97)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid var(--color-border)",
              borderRadius: activeSection ? "0 0 var(--radius-lg) var(--radius-lg)" : "var(--radius-lg)",
              boxShadow: "var(--shadow-mid)",
            }}
          >
            <div className="flex relative">
              {sections.map((section, idx) => {
                const isActive = activeSection === section.id;
                const Icon = section.icon;
                const isLast = idx === sections.length - 1;

                return (
                  <button
                    key={section.id}
                    onClick={() => toggleSection(section.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 relative transition-all duration-200"
                    style={{ color: isActive ? "var(--color-accent)" : "var(--color-text-muted)" }}
                    onMouseEnter={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-secondary)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)";
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[12px] font-medium">{section.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="dock-active-underline"
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full"
                        style={{ background: "var(--color-accent)" }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    {!isLast && (
                      <div
                        className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-px"
                        style={{ background: "var(--color-border)" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </>
  );
}

export default FloatingMapDock;
