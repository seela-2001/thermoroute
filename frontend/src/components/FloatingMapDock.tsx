import { useState, useEffect } from "react";
import { Clock, Video, Navigation, X, Loader2 } from "lucide-react";



// Types
type ActiveSection = null | "departure" | "cameras" | "stops";

export interface DepartureHourInfo {
  label: string;
  tempValue: number;
  risk: string;
  routeScore?: number | null;
  isBest?: boolean;
}

export interface DockCamera {
  id: string | null;
  name: string;
  lat: number;
  lon: number;
  road_name?: string | null;
  direction?: string | null;
  image_url?: string | null;
  stream_url?: string | null;
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
  onCameraSelect?: (id: string) => void;
  onStopSelect?: (stop: Stop) => void;
  onDepartureHover?: (hour: DepartureHourInfo | null) => void;
  hours?: DepartureHourInfo[];
  hoursLoading?: boolean;
  cameras?: DockCamera[];
  pois?: DockPoi[];
  windowLabel?: string;
}

// --- Departure Section ---

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

  // Clear map heat preview if the section unmounts while hovering
  useEffect(() => () => onHourHover?.(null), []);

  // Prefer backend-provided best departure; fall back to local min-temp
  const bestDeparture = hours && hours.length > 0
    ? (hours.find((h) => h.isBest) ??
      hours.reduce((best, h) => (h.tempValue < best.tempValue ? h : best), hours[0]))
    : null;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "#10b981";
      case "moderate": return "#f59e0b";
      case "high": return "#f97316";
      case "extreme": return "#dc2626";
      default: return "#10b981";
    }
  };

  return (
    <div className="px-4 pb-4 pt-4">
      <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-4">
        {windowLabel || "DEPARTURE WINDOW"}
      </div>

      {/* Timeline with hover tooltips */}
      <div className="relative mb-5">
        {hoursLoading && (
          <div className="flex items-center justify-center gap-2 py-6 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-[12px]">Loading hourly forecast...</span>
          </div>
        )}
        {!hoursLoading && (!hours || hours.length === 0) && (
          <div className="py-6 text-center text-[12px] text-gray-400">
            Hourly forecast unavailable
          </div>
        )}
        {!hoursLoading && bestDeparture && (
          <div className="relative flex items-center justify-between gap-1 overflow-x-auto pt-12 pb-1 -mt-10">
          {hours!.map((hour, idx) => (
            <div
              key={hour.label}
              className="relative flex flex-col items-center z-10 cursor-pointer flex-shrink-0"
              onMouseEnter={() => { setHoveredIdx(idx); onHourHover?.(hour); }}
              onMouseLeave={() => { setHoveredIdx(null); onHourHover?.(null); }}
            >
              {/* Hover tooltip with heat condition for this hour */}
              {hoveredIdx === idx && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                  <div className="bg-gray-900 text-white rounded-lg px-3 py-1.5 shadow-lg whitespace-nowrap flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getRiskColor(hour.risk) }}
                    />
                    <span className="text-[11px] font-semibold">{hour.tempValue}°</span>
                    <span className="text-[11px]" style={{ color: getRiskColor(hour.risk) }}>
                      {hour.risk.toUpperCase()} HEAT
                    </span>
                  </div>
                  <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
                </div>
              )}

              {/* Hour indicator */}
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[11px] font-bold mb-2 transition-all ${
                  hoveredIdx === idx
                    ? 'border-gray-900 text-gray-900 scale-110'
                    : hour.label === bestDeparture.label
                    ? 'border-gray-900 text-gray-900'
                    : 'border-gray-200 text-gray-400'
                }`}
              >
                {hour.tempValue}
              </div>

              {/* Time label */}
              <span className={`text-[9px] font-medium transition-colors ${
                hour.label === bestDeparture.label ? "text-gray-900" : "text-gray-400"
              }`}>
                {hour.label}
              </span>

              {/* Best departure indicator - underline bar beneath the hour */}
              {hour.label === bestDeparture.label && (
                <div className="w-6 h-[3px] rounded-full bg-gray-900 mt-1" />
              )}
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Best Departure Recommendation */}
      <div className="border-t border-gray-100 pt-4">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          BEST DEPARTURE
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[16px] font-semibold text-gray-900">
            {bestDeparture ? bestDeparture.label : '--'}
          </span>
          {bestDeparture?.routeScore != null && (
            <span className="text-[12px] text-gray-500">
              route score {Math.round(bestDeparture.routeScore * 100) / 100} · best balance of heat &amp; time
            </span>
          )}
          {bestDeparture?.routeScore == null && (
            <span className="text-[12px] text-gray-500">coolest window of the day</span>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Cameras Section ---

// --- Camera Feed Popup (centered over the map) ---

function CameraFeedModal({ camera, onClose }: { camera: DockCamera; onClose: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [camera.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const streamUrl = camera.stream_url || undefined;

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[16px] shadow-2xl overflow-hidden w-[calc(100%-32px)] max-w-[720px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <Video className="w-4 h-4 text-gray-500" />
            <span className="text-[14px] font-semibold text-gray-900">
              {camera.name}{camera.road_name ? ` · ${camera.road_name}` : ""}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Close camera view"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feed viewport */}
        <div className="relative aspect-video bg-gray-100 select-none">
          {camera.image_url && !imageFailed ? (
            <img
              src={camera.image_url as string}
              alt={camera.name}
              className="w-full h-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : streamUrl ? (
            <video
              src={streamUrl}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
              <Video className="w-8 h-8 text-gray-300" />
              <p className="text-[13px] font-medium text-gray-500">
                No live preview available for this camera
              </p>
              <p className="text-[11px] text-gray-400">
                {camera.name}
                {camera.road_name ? ` · ${camera.road_name}` : ""}
                {camera.direction ? ` · ${camera.direction}` : ""}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[12px] text-gray-500">
            {camera.id ? `Camera ${camera.id}` : "Traffic camera"} · {camera.lat.toFixed(4)}, {camera.lon.toFixed(4)}
          </span>
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
            Road511
          </span>
        </div>
      </div>
    </div>
  );
}

function CamerasSection({ cameras, onCameraClick }: { cameras: DockCamera[]; onCameraClick?: (camera: DockCamera) => void }) {
  return (
    <div className="px-4 pb-4 pt-4">
      <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-4">
        CAMERAS
      </div>

      {(!cameras || cameras.length === 0) && (
        <div className="py-6 text-center text-[12px] text-gray-400">
          No cameras found along this route
        </div>
      )}

      {/* Camera items */}
      <div className="camera-scroll flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {cameras.map((camera, idx) => (
          <button
            key={camera.id || `camera-${idx}`}
            onClick={() => onCameraClick?.(camera)}
            className={`
              flex-shrink-0 w-[136px] rounded-xl border p-3 text-left transition-all
              border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm
              cursor-pointer group
            `}
          >
            <div className="text-[9px] font-semibold tracking-wide text-gray-400 uppercase mb-1.5">
              {camera.road_name || "Traffic camera"}
            </div>
            <div className="text-[11px] font-semibold text-gray-900 mb-0.5 leading-tight truncate">
              {camera.name}
            </div>
            <div className="text-[10px] text-gray-400 truncate">
              {camera.direction || `${camera.lat.toFixed(3)}, ${camera.lon.toFixed(3)}`}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Stops Section ---

interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

function poiTypeLabel(type: string): string {
  switch (type) {
    case "gas_station": return "Fuel stop";
    case "hospital": return "Hospital";
    case "shade": return "Shade / Park";
    case "water": return "Drinking water";
    case "indoor": return "Indoor stop";
    default: return "Point of interest";
  }
}

function StopsSection({ pois, onStopSelect }: { pois: DockPoi[]; onStopSelect?: (stop: Stop) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (poi: DockPoi) => {
    const id = poi.id || `${poi.lat},${poi.lon}`;
    setSelectedId(id);
    onStopSelect?.({ id, name: poi.name, lat: poi.lat, lng: poi.lon });
  };

  return (
    <div className="px-4 pb-4 pt-4">
      <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-4">
        STOPS
      </div>

      {(!pois || pois.length === 0) && (
        <div className="py-6 text-center text-[12px] text-gray-400">
          No stops found along this route
        </div>
      )}

      {/* Stop items - scrollable list */}
      <div className="dock-scroll-y space-y-2 overflow-y-auto pr-1" style={{ maxHeight: '170px' }}>
        {pois.map((poi, idx) => {
          const id = poi.id || `${poi.lat},${poi.lon}`;
          return (
            <button
              key={poi.id || `poi-${idx}`}
              onClick={() => handleSelect(poi)}
              className={`
                w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all
                ${selectedId === id
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-100 bg-white hover:border-gray-200'
                }
              `}
            >
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-gray-900 mb-0.5 truncate">
                  {poi.name}
                </div>
                <div className="text-[10px] text-gray-500 truncate">
                  {poiTypeLabel(poi.type)}{poi.address ? ` · ${poi.address}` : ""}
                </div>
              </div>
              <div className="text-[10px] text-gray-400 font-medium flex-shrink-0 ml-3">
                {poi.distance != null
                  ? poi.distance >= 1000
                    ? `${(poi.distance / 1000).toFixed(1)} km`
                    : `${Math.round(poi.distance)} m`
                  : ""}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Main Floating Dock Component ---

export function FloatingMapDock({ onCameraSelect, onStopSelect, onDepartureHover, hours, hoursLoading, cameras = [], pois = [], windowLabel }: FloatingMapDockProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);
  const [viewingCamera, setViewingCamera] = useState<DockCamera | null>(null);

  const handleCameraClick = (camera: DockCamera) => {
    setViewingCamera(camera);
    if (camera.id) onCameraSelect?.(camera.id);
  };

  const sections = [
    { id: "departure" as const, label: "Departure", icon: Clock },
    { id: "cameras" as const, label: "Cameras", icon: Video },
    { id: "stops" as const, label: "Stops", icon: Navigation },
  ];

  const toggleSection = (sectionId: ActiveSection) => {
    setActiveSection(activeSection === sectionId ? null : sectionId);
  };

  return (
    <>
    <div
      className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-[1200] w-full px-3 transition-all duration-[280ms] ease-out ${
        activeSection === "departure"
          ? "max-w-[760px]"
          : activeSection === "cameras"
          ? "max-w-[640px]"
          : "max-w-[400px]"
      }`}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div className="flex flex-col items-center">
        {/* Expanded Content Panel - grows upward */}
        <div
          className={`
            bg-white border border-b-0 border-gray-100 shadow-lg rounded-t-[14px] overflow-hidden w-full
            transition-all duration-[280ms] ease-out origin-bottom
            ${activeSection
              ? 'max-h-[280px] opacity-100 translate-y-0'
              : 'max-h-0 opacity-0 translate-y-1 pointer-events-none'
            }
            md:max-h-[280px]
            max-h-[42vh]
          `}
        >
          {activeSection === "departure" && (
            <DepartureSection onHourHover={onDepartureHover} hours={hours} hoursLoading={hoursLoading} windowLabel={windowLabel} />
          )}
          {activeSection === "cameras" && <CamerasSection cameras={cameras} onCameraClick={handleCameraClick} />}
          {activeSection === "stops" && <StopsSection pois={pois} onStopSelect={onStopSelect} />}
        </div>

        {/* Bottom Navigation Dock */}
        <div
          className={`
            bg-white border border-gray-100 shadow-md backdrop-blur-sm bg-white/95
            transition-all duration-[280ms] ease-out
            ${activeSection ? 'rounded-t-none rounded-b-[14px]' : 'rounded-[14px]'}
            w-full
          `}
        >
          <div className="flex">
            {sections.map((section, idx) => {
              const isActive = activeSection === section.id;
              const Icon = section.icon;
              const isLast = idx === sections.length - 1;

              return (
                <button
                  key={section.id}
                  onClick={() => toggleSection(section.id)}
                  className={`
                    flex-1 flex items-center justify-center gap-2 py-3.5
                    transition-all duration-200 relative
                    ${isActive ? 'bg-gray-50' : 'hover:bg-gray-50/60'}
                  `}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${isActive ? 'text-gray-900' : 'text-gray-400'}`}
                  />
                  <span
                    className={`text-[12px] font-medium transition-colors ${
                      isActive ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {section.label}
                  </span>
                  {!isLast && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-px bg-gray-100" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>

    {/* Camera Feed Popup - centered over the map */}
    {viewingCamera && (
      <CameraFeedModal camera={viewingCamera} onClose={() => setViewingCamera(null)} />
    )}
    </>
  );
}

export default FloatingMapDock;
