import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { routesApi } from "@/services/api";
import type { CriticalAlert, CoolingStop } from "@/services/api";
import { toStateCode, mapBackendRoute, buildDepartureHours } from "@/utils/routeUtils";
import type { RouteData } from "@/utils/routeUtils";
import type { DepartureHourInfo } from "@/components/FloatingMapDock";
import { PlanningForm } from "@/components/planning/PlanningForm";
import { MapView } from "@/components/map/MapView";
import "./MapView.css";

function humanizeRouteError(err: unknown): string {
  if (!err || typeof err !== "object") return "Something went wrong. Please try again.";
  const message = "message" in err ? String((err as Error).message) : "";
  const responseData =
    "response" in err
      ? (err as { response?: { data?: { detail?: string; non_field_errors?: string[] } } }).response
          ?.data
      : null;
  const detail = responseData?.detail ?? "";
  const nonField = responseData?.non_field_errors?.[0] ?? "";
  const anyDetail = detail || nonField;
  if (
    anyDetail.includes("departure_start") ||
    anyDetail.includes("timezone") ||
    anyDetail.includes("aware")
  )
    return "There was a problem with the departure time. Please try again.";
  if (message.includes("timeout") || message.includes("408"))
    return "The analysis is taking longer than expected. Please try again in a moment.";
  if (
    message.toLowerCase().includes("network") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ERR_")
  )
    return "Could not reach the server. Check your connection and try again.";
  if (
    message.includes("422") ||
    (responseData && Object.keys(responseData).length > 0 && anyDetail)
  )
    return "Could not plan this route. Try different locations or check your connection.";
  if (message.includes("500") || message.includes("502") || message.includes("503"))
    return "The server is temporarily unavailable. Please try again in a moment.";
  if (message.includes("No routes") || message.includes("no route"))
    return "No route found between these locations. Try different origin and destination.";
  return "Could not analyze this route. Please try again.";
}

export function RoutePlanner() {
  const navigate = useNavigate();
  const location = useLocation();

  // Capture navigation state once for lazy init
  const navState = location.state as {
    autoSubmit?: boolean;
    origin?: string;
    destination?: string;
    originLat?: number;
    originLng?: number;
    destinationLat?: number;
    destinationLng?: number;
    destinationState?: string;
  } | null;
  const hasAutoSubmit = navState?.autoSubmit === true;

  // Form state — lazily seeded from navigation state when auto-submitting
  const [origin, setOrigin] = useState(() => hasAutoSubmit ? (navState?.origin ?? "") : "");
  const [destination, setDestination] = useState(() => hasAutoSubmit ? (navState?.destination ?? "") : "");
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(
    () => hasAutoSubmit ? { lat: navState!.originLat!, lng: navState!.originLng! } : null
  );
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(
    () => hasAutoSubmit ? { lat: navState!.destinationLat!, lng: navState!.destinationLng! } : null
  );
  const [destinationState, setDestinationState] = useState(
    () => hasAutoSubmit ? (navState?.destinationState ?? "") : ""
  );
  const [departureRangeHours, setDepartureRangeHours] = useState(12);
  const [stepMinutes, setStepMinutes] = useState(60);
  const [weatherWeightPct, setWeatherWeightPct] = useState(70);
  const [trafficAware, setTrafficAware] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Result state
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [recommendedRouteId, setRecommendedRouteId] = useState<string | null>(null);
  const [departureHours, setDepartureHours] = useState<DepartureHourInfo[]>([]);
  const [heatWarning, setHeatWarning] = useState<string | null>(null);
  const [heatLoadingLive, setHeatLoadingLive] = useState(false);
  const [recommendation, setRecommendation] = useState<{
    headline: string;
    decision: string;
    reason: string;
    key_factors: string[];
    safety_tip: string;
    alerts: CriticalAlert[];
    cooling_stops: CoolingStop[];
  } | null>(null);

  const runAnalysis = async (
    oCoords: { lat: number; lng: number },
    dCoords: { lat: number; lng: number },
    dState: string,
    originName: string,
    destName: string,
  ) => {
    setIsSubmitting(true);
    setError(null);
    setHeatLoadingLive(true);
    try {
      const departureStart = new Date();
      const departureEnd = new Date(departureStart.getTime() + departureRangeHours * 60 * 60 * 1000);
      const response = await routesApi.analyze({
        origin_lat: oCoords.lat,
        origin_lng: oCoords.lng,
        destination_lat: dCoords.lat,
        destination_lng: dCoords.lng,
        jurisdiction: toStateCode(dState) || "MN",
        departure_start: departureStart.toISOString(),
        departure_end: departureEnd.toISOString(),
        step_minutes: stepMinutes,
        weather_weight: weatherWeightPct / 100,
        time_weight: 1 - weatherWeightPct / 100,
        traffic_aware: trafficAware,
      });

      const recommendedId =
        response.recommended_route_id ??
        response.best_departure?.recommended_route_id ??
        response.routes[0]?.id ??
        null;

      const routeLetters = ["A", "B", "C", "D", "E"];
      const finalRoutes: RouteData[] = response.routes.map((route, idx) => {
        const mapped = mapBackendRoute(route, originName, destName);
        return {
          ...mapped,
          name: route.name || `Route ${routeLetters[idx] ?? idx + 1}`,
        };
      });

      const recommendedRoute = finalRoutes.find((r) => r.id === recommendedId) ?? finalRoutes[0];

      setRoutes(finalRoutes);
      setRecommendedRouteId(recommendedId);
      setDepartureHours(
        buildDepartureHours(recommendedRoute, response.departure_recommendations, response.best_departure)
      );
      setHeatWarning(
        finalRoutes.some((r) => !r.heatUnavailable)
          ? null
          : "Heat analysis unavailable for this route. No live temperature data was returned."
      );
      setRecommendation(response.recommendation ?? null);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setShowMap(true);
      }, 1300);
    } catch (err) {
      console.error("Error planning route:", err);
      setError(humanizeRouteError(err));
    } finally {
      setHeatLoadingLive(false);
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) return;
    if (!originCoords || !destinationCoords) {
      setError("Please select your origin and destination from the suggestions list.");
      return;
    }
    runAnalysis(originCoords, destinationCoords, destinationState, origin, destination);
  };

  useEffect(() => {
    if (!hasAutoSubmit) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runAnalysis(
      { lat: navState!.originLat!, lng: navState!.originLng! },
      { lat: navState!.destinationLat!, lng: navState!.destinationLng! },
      navState?.destinationState ?? "",
      navState?.origin ?? "",
      navState?.destination ?? ""
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (showMap) {
    return (
      <MapView
        routes={routes}
        recommendedRouteId={recommendedRouteId}
        origin={origin}
        destination={destination}
        originCoords={originCoords}
        departureHours={departureHours}
        isSubmitting={isSubmitting}
        departureRangeHours={departureRangeHours}
        stepMinutes={stepMinutes}
        onBack={() => setShowMap(false)}
        heatWarning={heatWarning}
        onDismissWarning={() => setHeatWarning(null)}
        heatLoadingLive={heatLoadingLive}
        recommendation={recommendation}
      />
    );
  }

  return (
    <PlanningForm
      origin={origin}
      onOriginChange={setOrigin}
      onOriginSelect={(loc) => setOriginCoords({ lat: loc.lat, lng: loc.lng })}
      destination={destination}
      onDestinationChange={setDestination}
      onDestinationSelect={(loc) => {
        setDestinationCoords({ lat: loc.lat, lng: loc.lng });
        setDestinationState(loc.state || "");
      }}
      departureRangeHours={departureRangeHours}
      onDepartureRangeChange={setDepartureRangeHours}
      stepMinutes={stepMinutes}
      onStepMinutesChange={setStepMinutes}
      weatherWeightPct={weatherWeightPct}
      onWeatherWeightChange={setWeatherWeightPct}
      trafficAware={trafficAware}
      onTrafficAwareChange={setTrafficAware}
      isSubmitting={isSubmitting}
      showSuccess={showSuccess}
      error={error}
      onSubmit={handleSubmit}
      onNavigateHome={() => navigate("/")}
    />
  );
}
