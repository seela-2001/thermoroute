import { useState, useEffect, useCallback } from "react";
import { ArrowRight, Route, ChevronRight, MapPin, RefreshCw, X, Camera, CheckCircle, Eye, Navigation, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useCache, withCache } from "@/lib/useCache";
import type { AnalyzedRoute, RouteAnalysisRequest, AutocompleteResult } from "@/services/routeApi";
import { analyzeRoute, searchLocations } from "@/services/routeApi";
import { LocationInput } from "@/components/route-planner/LocationInput";
import { RouteCard } from "@/components/route-planner/RouteCard";
import { TimeRiskBar, type HourlyForecast } from "@/components/route-planner/TimeRiskBar";
import { ReasoningPanel } from "@/components/route-planner/ReasoningPanel";
import { SegmentAnalysis } from "@/components/route-planner/SegmentAnalysis";
import { RouteMap, routeColors } from "@/components/route-planner/RouteMap";
import { formatTemperature, formatTime } from "@/lib";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface RoutePOI {
  id: string;
  type: 'fuel' | 'rest' | 'medical' | 'dining' | 'camera';
  name: string;
  lat: number;
  lon: number;
}

/**
 * Generate hourly forecast from route weather data
 */
function getHourlyForecastFromRoute(route: AnalyzedRoute): HourlyForecast[] {
  const hours: HourlyForecast[] = [];
  const now = new Date();
  const hourlyConditions = route.hourly_conditions || [];

  for (let i = 0; i < 12; i++) {
    const hour = new Date(now.getTime() + i * 60 * 60 * 1000);
    const condition = hourlyConditions[i] || hourlyConditions[0] || {};

    // Temperature from API is in Celsius, convert to display unit
    const tempC = condition.temperature || route.risk?.metrics?.max_temperature || 30;
    const feelsLikeC = condition.feels_like || condition.apparent_temperature || tempC;
    const heatIndexC = condition.heat_index || route.risk?.metrics?.max_heat_index || feelsLikeC;

    // Convert to Fahrenheit for UI
    const tempF = (tempC * 9/5) + 32;
    const heatIndexF = (heatIndexC * 9/5) + 32;

    let riskLevel: HourlyForecast['riskLevel'] = 'low';
    if (heatIndexF > 125) riskLevel = 'extreme';
    else if (heatIndexF > 110) riskLevel = 'high';
    else if (heatIndexF > 95) riskLevel = 'medium';

    const hourOfDay = hour.getHours();
    const isRecommended = (hourOfDay >= 6 && hourOfDay <= 10) || (hourOfDay >= 18 && hourOfDay <= 22);
    const riskNotExtreme = riskLevel !== 'extreme';

    hours.push({
      hourOffset: i,
      time: hour,
      temperature: tempF,
      heatIndex: heatIndexF,
      riskLevel,
      isRecommended: isRecommended && riskNotExtreme,
      reason: riskLevel === 'low' ? 'Optimal travel conditions' :
             riskLevel === 'medium' ? 'Moderate heat risk - stay hydrated' :
             riskLevel === 'high' ? 'High heat risk - consider air conditioning' :
             'Extreme risk - postpone if possible',
    });
  }
  return hours;
}

/**
 * Extract cameras from POI data
 */
function getCamerasFromRoute(route: AnalyzedRoute): RoutePOI[] {
  const cameras: RoutePOI[] = [];
  const pois = route.pois || [];

  pois.forEach((poi, idx) => {
    const type = poi.type?.toLowerCase() || '';
    if (type.includes('rest') || type.includes('camera') || type.includes('service')) {
      cameras.push({
        id: `cam_${poi.id || idx}`,
        type: 'camera',
        name: poi.name || `Rest Stop ${idx + 1}`,
        lat: poi.lat,
        lon: poi.lon,
      });
    }
  });

  return cameras;
}

/**
 * SearchForm component for origin/destination input
 */
function SearchForm({
  origin,
  setOrigin,
  destination,
  setDestination,
  originSuggestions,
  destSuggestions,
  showOriginSuggestions,
  showDestSuggestions,
  setShowOriginSuggestions,
  setShowDestSuggestions,
  onPlanRoute,
  isLoading,
  apiError,
}: any) {
  const handleOriginSelect = (city: AutocompleteResult) => {
    setOrigin(city.name);
    setShowOriginSuggestions(false);
  };

  const handleDestSelect = (city: AutocompleteResult) => {
    setDestination(city.name);
    setShowDestSuggestions(false);
  };

  const formatSuggestionsForComponent = (cities: AutocompleteResult[]) =>
    cities.map(c => ({ city: c.name, state: c.state || c.state_name || 'TX' }));

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Route className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Plan Your Route</h1>
          <p className="text-sm text-gray-500">AI-powered heat risk analysis for safer travel</p>
        </div>

        <div className="space-y-4">
          <LocationInput
            label="From"
            placeholder="Enter city or address"
            value={origin}
            onChange={setOrigin}
            onClear={() => setOrigin('')}
            suggestions={formatSuggestionsForComponent(originSuggestions)}
            showSuggestions={showOriginSuggestions}
            onSuggestionSelect={handleOriginSelect}
            onSuggestionsToggle={setShowOriginSuggestions}
          />

          <LocationInput
            label="To"
            placeholder="Enter city or address"
            value={destination}
            onChange={setDestination}
            onClear={() => setDestination('')}
            suggestions={formatSuggestionsForComponent(destSuggestions)}
            showSuggestions={showDestSuggestions}
            onSuggestionSelect={handleDestSelect}
            onSuggestionsToggle={setShowDestSuggestions}
          />

          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
              {apiError}
            </div>
          )}

          <button
            onClick={onPlanRoute}
            disabled={isLoading || !origin || !destination}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Analyzing Routes...
              </>
            ) : (
              <>
                <Route className="w-5 h-5" />
                Plan Route
              </>
            )}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            API: {API_BASE_URL} · Routes Analysis · Heat Risk
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading animation component
 */
function LoadingView() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md mx-auto text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Route className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Your Trip</h2>
          <p className="text-gray-600">Finding the safest route and time</p>
        </motion.div>

        <div className="space-y-4 text-left">
          {[
            { text: 'Finding available routes...', delay: 0 },
            { text: 'Analyzing road conditions...', delay: 0.2 },
            { text: 'Checking heat conditions...', delay: 0.4 },
            { text: 'Comparing route options...', delay: 0.6 },
          ].map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: step.delay }}
              className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                {index < 3 ? (
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                )}
              </div>
              <span className={`text-sm ${index < 3 ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                {step.text}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Camera card component
 */
const CameraCard = ({ camera, onClick }: { camera: RoutePOI; onClick: () => void }) => (
  <motion.button
    key={camera.id}
    onClick={onClick}
    className="w-full p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all text-left"
  >
    <div className="flex items-start gap-3">
      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
        <Eye className="w-5 h-5 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-1">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs text-emerald-600 font-medium">LIVE</span>
        </div>
        <h4 className="text-xs font-semibold text-gray-900 truncate">{camera.name}</h4>
        <p className="text-[10px] text-gray-500 flex items-center gap-1">
          <MapPin className="w-2 h-2" />
          {camera.lat.toFixed(4)}, {camera.lon.toFixed(4)}
        </p>
      </div>
    </div>
  </motion.button>
);

/**
 * Camera modal component
 */
const CameraModal = ({ camera, onClose }: { camera: RoutePOI; onClose: () => void }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">{camera.name}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Eye className="w-16 h-16 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">Camera Feed</p>
            </div>
          </div>
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white text-xs font-medium">LIVE</span>
          </div>
        </div>

        <div className="p-6">
          <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-medium transition-colors">
            View Full Feed
          </button>
        </div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

/**
 * Main RoutePlanner component
 */
export function RoutePlanner() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [originCoords, setOriginCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [originSuggestions, setOriginSuggestions] = useState<AutocompleteResult[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<AutocompleteResult[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [analyzedRoutes, setAnalyzedRoutes] = useState<AnalyzedRoute[]>([]);
  const [recommendedRouteId, setRecommendedRouteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<RoutePOI | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Debounced autocomplete for origin
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (origin.length >= 2) {
        try {
          const result = await searchLocations(origin, 5);
          if (result.success) {
            setOriginSuggestions(result.results);
            setShowOriginSuggestions(result.results.length > 0);
          } else {
            setOriginSuggestions([]);
            setShowOriginSuggestions(false);
          }
        } catch {
          setOriginSuggestions([]);
          setShowOriginSuggestions(false);
        }
      } else {
        setOriginSuggestions([]);
        setShowOriginSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [origin]);

  // Debounced autocomplete for destination
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (destination.length >= 2) {
        try {
          const result = await searchLocations(destination, 5);
          if (result.success) {
            setDestSuggestions(result.results);
            setShowDestSuggestions(result.results.length > 0);
          } else {
            setDestSuggestions([]);
            setShowDestSuggestions(false);
          }
        } catch {
          setDestSuggestions([]);
            setShowDestSuggestions(false);
          }
        } else {
          setDestSuggestions([]);
          setShowDestSuggestions(false);
        }
      }, 300);

    return () => clearTimeout(timer);
  }, [destination]);

  /**
   * Handle route planning
   */
  const handlePlanRoute = async () => {
    if (!origin || !destination) {
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      // Get coordinates from selected suggestions
      const originLocation = originSuggestions.find(s => s.name === origin);
      const destLocation = destSuggestions.find(s => s.name === destination);

      if (!originLocation || !destLocation) {
        setApiError("Please select a location from the autocomplete suggestions");
        setIsLoading(false);
        return;
      }

      const originCoords = { lat: originLocation.lat, lon: originLocation.lon };
      const destCoords = { lat: destLocation.lat, lon: destLocation.lon };

      setOriginCoords(originCoords);
      setDestCoords(destCoords);

      const cacheKey = `route_${originCoords.lat}_${originCoords.lon}_${destCoords.lat}_${destCoords.lon}`;

      const response = await withCache(cacheKey, async () => {
        const request: RouteAnalysisRequest = {
          origin_lat: originCoords.lat,
          origin_lng: originCoords.lon,
          destination_lat: destCoords.lat,
          destination_lng: destCoords.lon,
        };
        return await analyzeRoute(request);
      }, { ttl: 15 * 60 * 1000 });

      if (response.status === 'success' && response.routes && response.routes.length > 0) {
        setAnalyzedRoutes(response.routes);
        const recommendedId = response.recommended_route_id || response.routes[0].id;
        setRecommendedRouteId(recommendedId);
        setSelectedRouteId(recommendedId);

        const recommendedRoute = response.routes.find(r => r.id === recommendedId) || response.routes[0];
        setHourlyForecast(getHourlyForecastFromRoute(recommendedRoute));
        setShowResults(true);
      } else {
        throw new Error(response.errors?.[0] || "Failed to analyze routes");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to connect to the backend";
      setApiError(errorMessage);
      console.error('Route analysis error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRoute = analyzedRoutes.find(r => r.id === selectedRouteId);
  const routeCameras = selectedRoute ? getCamerasFromRoute(selectedRoute) : [];

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {!showResults ? (
          isLoading ? (
            <LoadingView />
          ) : (
            <SearchForm
              origin={origin}
              setOrigin={setOrigin}
              destination={destination}
              setDestination={setDestination}
              originSuggestions={originSuggestions}
              destSuggestions={destSuggestions}
              showOriginSuggestions={showOriginSuggestions}
              showDestSuggestions={showDestSuggestions}
              setShowOriginSuggestions={setShowOriginSuggestions}
              setShowDestSuggestions={setShowDestSuggestions}
              onPlanRoute={handlePlanRoute}
              isLoading={isLoading}
              apiError={apiError}
            />
          )
        ) : (
          <>
            <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
              <div className="max-w-[100vw] px-4 py-4 flex items-center justify-between">
                <button onClick={() => setShowResults(false)} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                  <ArrowRight className="w-5 h-5 mr-2 rotate-180" />
                  <span className="font-medium">Back</span>
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
                    <MapPin className="w-4 h-4" />
                    <span className="font-medium text-gray-900">{origin}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{destination}</span>
                  </div>
                </div>
                <div className="w-20" />
              </div>
            </div>

            <div className="flex h-[calc(100vh-73px)]">
              <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Route className="w-4 h-4 text-purple-600" />
                    Route Options
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">{analyzedRoutes.length} routes from API</p>
                </div>

                <div className="p-3 space-y-2">
                  {analyzedRoutes.map((route, index) => (
                    <RouteCard
                      key={route.id}
                      route={route}
                      index={index}
                      isSelected={route.id === selectedRouteId}
                      isRecommended={route.id === recommendedRouteId}
                      color={{ primary: routeColors[index % routeColors.length].color, secondary: routeColors[index % routeColors.length].secondary }}
                      onClick={() => setSelectedRouteId(route.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-gray-100 min-w-0">
                <div className="relative flex-1 min-h-0 z-0">
                  <RouteMap
                    routes={analyzedRoutes}
                    selectedRouteId={selectedRouteId}
                    onRouteClick={setSelectedRouteId}
                    origin={originCoords}
                    destination={destCoords}
                    hourlyForecast={hourlyForecast}
                  />
                </div>

                <SegmentAnalysis route={selectedRoute} />
              </div>

              <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0">
                <div className="border-b border-gray-100">
                  <div className="p-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-600" />
                      Route Analysis
                      <span className="ml-auto text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                        Data-Driven
                      </span>
                    </h2>
                  </div>
                  <ReasoningPanel routes={analyzedRoutes} selectedRouteId={selectedRouteId} />
                </div>

                <div>
                  <div className="p-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-purple-600" />
                      Route Cameras
                      <span className="ml-auto text-xs text-gray-500">{routeCameras.length}</span>
                    </h2>
                  </div>

                  <div className="p-3 space-y-2">
                    {routeCameras.length > 0 ? routeCameras.map((camera) => (
                      <CameraCard key={camera.id} camera={camera} onClick={() => setSelectedCamera(camera)} />
                    )) : (
                      <div className="p-4 text-center text-gray-400 text-xs">No cameras available</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {selectedCamera && (
              <CameraModal camera={selectedCamera} onClose={() => setSelectedCamera(null)} />
            )}
          </>
        )}

        {!showResults && selectedCamera && (
          <CameraModal camera={selectedCamera} onClose={() => setSelectedCamera(null)} />
        )}
      </div>
    </ErrorBoundary>
  );
}
