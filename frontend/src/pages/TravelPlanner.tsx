import { useState } from "react";
import { ArrowRight, Search, X, Clock, Shield, Camera, Route, ChevronRight, Sparkles, Thermometer, MapPin, Fuel, Coffee, Hospital, CheckCircle, Zap, Bot, Eye, Navigation, DollarSign, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AnalyzedRoute, RouteAnalysisRequest } from "@/services/routeApi";
import { analyzeRoute, geocodeCity } from "@/services/routeApi";
import { RouteMap, routeColors } from "@/components/route-planner/RouteMap";

const popularCities = [
  { city: "New York", state: "NY", lat: 40.7128, lon: -74.0060 },
  { city: "Los Angeles", state: "CA", lat: 34.0522, lon: -118.2437 },
  { city: "Chicago", state: "IL", lat: 41.8781, lon: -87.6298 },
  { city: "Houston", state: "TX", lat: 29.7604, lon: -95.3698 },
  { city: "Phoenix", state: "AZ", lat: 33.4484, lon: -112.0740 },
  { city: "Philadelphia", state: "PA", lat: 39.9526, lon: -75.1652 },
];

interface HourlyForecast {
  hourOffset: number;
  time: Date;
  temperature: number;
  heatIndex: number;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  isRecommended: boolean;
  reason: string;
}

interface RoutePOI {
  id: string;
  type: 'fuel' | 'rest' | 'medical' | 'dining';
  name: string;
  lat: number;
  lon: number;
}

export function TravelPlanner() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [originCoords, setOriginCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [analyzedRoutes, setAnalyzedRoutes] = useState<AnalyzedRoute[]>([]);
  const [recommendedRouteId, setRecommendedRouteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<any>(null);
  const [selectedCamera, setSelectedCamera] = useState<RoutePOI | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[]>([]);

  const filterCities = (query: string) => {
    if (!query) return [];
    return popularCities.filter(
      (c) =>
        c.city.toLowerCase().includes(query.toLowerCase()) ||
        `${c.city}, ${c.state}`.toLowerCase().includes(query.toLowerCase())
    );
  };

  const handleSelectCity = (city: typeof popularCities[0], isOrigin: boolean) => {
    const coords = { lat: city.lat, lon: city.lon };
    if (isOrigin) {
      setOrigin(city.city);
      setOriginCoords(coords);
      setShowOriginSuggestions(false);
    } else {
      setDestination(city.city);
      setDestCoords(coords);
      setShowDestSuggestions(false);
    }
  };

  const handlePlanRoute = async () => {
    if (!origin || !destination || !originCoords || !destCoords) {
      return;
    }

    setIsLoading(true);

    try {
      const request: RouteAnalysisRequest = {
        origin_lat: originCoords.lat,
        origin_lng: originCoords.lon,
        destination_lat: destCoords.lat,
        destination_lng: destCoords.lon,
      };

      const response = await analyzeRoute(request);

      if (response.status === 'success' && response.routes) {
        setAnalyzedRoutes(response.routes);
        setRecommendedRouteId(response.recommended_route_id || response.routes[0]?.id || null);
        setSelectedRouteId(response.recommended_route_id || response.routes[0]?.id || null);
        setHourlyForecast(generateHourlyForecastFromRoute(response.routes[0] || response.routes[0]));
      }

      setShowResults(true);
    } catch (error) {
      console.error('Failed to analyze routes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  function generateHourlyForecastFromRoute(route: AnalyzedRoute | undefined): HourlyForecast[] {
    if (!route) return [];

    const hours: HourlyForecast[] = [];
    const now = new Date();
    const hourlyConditions = route.hourly_conditions || [];

    for (let i = 0; i < 12; i++) {
      const hour = new Date(now.getTime() + i * 60 * 60 * 1000);
      const condition = hourlyConditions[i] || hourlyConditions[0] || {};

      const temp = condition.temperature || route.risk?.metrics?.max_temperature || 85;
      const feelsLike = condition.feels_like || condition.apparent_temperature || temp;
      const heatIndex = condition.heat_index || route.risk?.metrics?.max_heat_index || feelsLike;

      let riskLevel: HourlyForecast['riskLevel'] = 'low';
      if (heatIndex > 125) riskLevel = 'extreme';
      else if (heatIndex > 110) riskLevel = 'high';
      else if (heatIndex > 95) riskLevel = 'medium';

      const hourOfDay = hour.getHours();
      const isRecommended = (hourOfDay >= 6 && hourOfDay <= 10) || (hourOfDay >= 18 && hourOfDay <= 22);
      const riskNotExtreme = riskLevel !== 'extreme';

      hours.push({
        hourOffset: i,
        time: hour,
        temperature: temp,
        heatIndex,
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

  const getRouteColor = (index: number) => routeColors[index % routeColors.length];

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'extreme': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPOIIcon = (type: string) => {
    switch (type) {
      case 'fuel': return <Fuel className="w-4 h-4" />;
      case 'rest': return <Coffee className="w-4 h-4" />;
      case 'medical': return <Hospital className="w-4 h-4" />;
      case 'dining': return <DollarSign className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const getPOIColor = (type: string) => {
    switch (type) {
      case 'fuel': return 'bg-blue-500 text-blue-50';
      case 'rest': return 'bg-green-500 text-green-50';
      case 'medical': return 'bg-red-500 text-red-50';
      case 'dining': return 'bg-amber-500 text-amber-50';
      default: return 'bg-gray-500 text-gray-50';
    }
  };

  const getRiskSegmentColor = (riskScore: number) => {
    if (riskScore >= 0.7) return 'p-3 rounded-lg border border-red-200 bg-red-50';
    if (riskScore >= 0.4) return 'p-3 rounded-lg border border-orange-200 bg-orange-50';
    return 'p-3 rounded-lg border border-gray-200 bg-gray-50';
  };

  const getRiskSegmentTextColor = (riskScore: number) => {
    if (riskScore >= 0.7) return 'text-red-600 bg-red-100';
    if (riskScore >= 0.4) return 'text-orange-600 bg-orange-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getRiskSegmentBarColor = (riskScore: number) => {
    if (riskScore >= 0.7) return 'bg-red-500';
    if (riskScore >= 0.4) return 'bg-orange-500';
    return 'bg-gray-400';
  };

  const selectedRoute = analyzedRoutes.find(r => r.id === selectedRouteId);
  const routeCameras = selectedRoute?.pois?.filter(poi =>
    poi.type?.toLowerCase().includes('rest') ||
    poi.type?.toLowerCase().includes('camera') ||
    poi.type?.toLowerCase().includes('service')
  ).map((poi, idx) => ({
    id: `cam_${idx}`,
    type: 'rest' as const,
    name: poi.name || `Rest Stop ${idx + 1}`,
    lat: poi.lat,
    lon: poi.lon,
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {!showResults ? (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Route className="w-8 h-8 text-purple-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Plan Your Route</h1>
              <p className="text-sm text-gray-500">AI-powered heat risk analysis for safer travel</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">From</label>
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="City or address"
                    value={origin}
                    onChange={(e) => {
                      setOrigin(e.target.value);
                      setShowOriginSuggestions(true);
                    }}
                    onFocus={() => setShowOriginSuggestions(true)}
                    className="w-full pl-12 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                  />
                  {origin && (
                    <button onClick={() => setOrigin("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  )}
                  {showOriginSuggestions && filterCities(origin).length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filterCities(origin).map((city) => (
                        <button
                          key={city.city}
                          onClick={() => handleSelectCity(city, true)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100 last:border-0"
                        >
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">{city.city}</span>
                          <span className="text-gray-400">{city.state}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="relative">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">To</label>
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="City or address"
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      setShowDestSuggestions(true);
                    }}
                    onFocus={() => setShowDestSuggestions(true)}
                    className="w-full pl-12 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                  />
                  {destination && (
                    <button onClick={() => setDestination("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  )}
                  {showDestSuggestions && filterCities(destination).length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filterCities(destination).map((city) => (
                        <button
                          key={city.city}
                          onClick={() => handleSelectCity(city, false)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100 last:border-0"
                        >
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">{city.city}</span>
                          <span className="text-gray-400">{city.state}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handlePlanRoute}
                disabled={isLoading || !origin || !destination}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                Powered by GLM-4 AI · Heat Risk Analysis · Real-time Cameras
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
              <button
                onClick={() => setShowResults(false)}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
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
            <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Route className="w-4 h-4 text-purple-600" />
                  Route Options
                </h2>
                <p className="text-xs text-gray-500 mt-1">{analyzedRoutes.length} routes available</p>
              </div>

              <div className="p-3 space-y-2">
                {analyzedRoutes.map((route, index) => {
                  const isRecommended = route.id === recommendedRouteId;
                  const isSelected = route.id === selectedRouteId;
                  const color = getRouteColor(index);
                  const riskColor = getRiskColor(route.risk?.level || 'low');

                  return (
                    <motion.div
                      key={route.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setSelectedRouteId(route.id)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border-2 ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-200'
                          : isRecommended
                            ? 'border-purple-200 bg-purple-50/30 hover:border-purple-300'
                            : 'border-gray-100 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isSelected ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {String.fromCharCode(65 + index)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                              {isRecommended && <Sparkles className="w-3 h-3 text-purple-600" />}
                              Route {String.fromCharCode(65 + index)}
                            </div>
                            {isRecommended && (
                              <span className="text-xs text-purple-600 font-medium">Recommended</span>
                            )}
                          </div>
                        </div>
                        {isSelected && <CheckCircle className="w-5 h-5 text-purple-600" />}
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="text-center p-1.5 bg-gray-50 rounded-lg">
                          <Clock className="w-3 h-3 text-gray-500 mx-auto mb-0.5" />
                          <p className="text-xs font-semibold text-gray-900">{Math.round(route.duration_min / 60)}h</p>
                          <p className="text-[9px] text-gray-500">Duration</p>
                        </div>
                        <div className="text-center p-1.5 bg-gray-50 rounded-lg">
                          <Thermometer className="w-3 h-3 text-gray-500 mx-auto mb-0.5" />
                          <p className="text-xs font-semibold text-gray-900">{Math.round(route.risk?.metrics?.max_temperature || 90)}°F</p>
                          <p className="text-[9px] text-gray-500">Max Heat</p>
                        </div>
                        <div className="text-center p-1.5 rounded-lg">
                          <Shield className="w-3 h-5 text-gray-500 mx-auto mb-0.5" />
                          <p className={`text-xs font-semibold ${riskColor.split(' ')[0]}`}>{route.risk?.level || 'N/A'}</p>
                          <p className="text-[9px] text-gray-500">Risk</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{(route.distance_km * 0.621371).toFixed(0)} mi</span>
                        <span className="flex items-center gap-1">
                          {route.pois?.length || 0} stops
                          <Coffee className="w-3 h-3" />
                        </span>
                      </div>

                      <div className={`mt-2 h-1.5 rounded-full ${isRecommended ? 'bg-gradient-to-r from-purple-500 to-purple-400' : color.primary}`} />
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 flex flex-col bg-gray-100">
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

              <div className="h-64 bg-white border-t border-gray-200 overflow-y-auto">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-purple-600" />
                    Segment Analysis
                  </h3>
                </div>

                {selectedRoute && selectedRoute.risk?.critical_segments && selectedRoute.risk.critical_segments.length > 0 ? (
                  <div className="p-4 space-y-3">
                    {selectedRoute.risk.critical_segments.map((segment: any, idx: number) => (
                      <motion.div
                        key={segment.segment_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={getRiskSegmentColor(segment.risk_score)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">Segment {segment.segment_id}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRiskSegmentTextColor(segment.risk_score)}`}>
                            {segment.risk_level}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${segment.risk_score * 100}%` }}
                                className={`h-full ${getRiskSegmentBarColor(segment.risk_score)}`}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-gray-600">{(segment.risk_score * 100).toFixed(0)}%</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-400">
                    <Shield className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">No critical risk segments detected</p>
                  </div>
                )}
              </div>
            </div>

            <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
              <div className="border-b border-gray-100">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-purple-600" />
                    AI Reasoning
                    <span className="ml-auto text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">GLM-4</span>
                  </h2>
                </div>

                <div className="p-4">
                  {aiReasoning ? (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-semibold text-gray-900">Recommendation</span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{aiReasoning.recommendation}</p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-orange-500" />
                          <span className="text-xs font-semibold text-gray-900">Risk Analysis</span>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-600">Overall Risk</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getRiskColor(aiReasoning.riskAnalysis.overallRisk)}`}>
                              {aiReasoning.riskAnalysis.overallRisk}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">Max Heat Index</span>
                            <span className="text-xs font-semibold text-gray-900">{aiReasoning.riskAnalysis.maxHeatIndex}°F</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-blue-500" />
                          <span className="text-xs font-semibold text-gray-900">Key Factors</span>
                        </div>
                        <div className="space-y-2">
                          {aiReasoning.reasoning.map((point: string, idx: number) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="flex items-start gap-2"
                            >
                              <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-gray-700">{point}</p>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <div className="flex items-center gap-2 mb-1">
                          <Thermometer className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-semibold text-gray-900">Weather Impact</span>
                        </div>
                        <p className="text-xs text-gray-700">{aiReasoning.weatherImpact}</p>
                      </div>

                      {aiReasoning.alternativeOptions && aiReasoning.alternativeOptions.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Route className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-semibold text-gray-900">Alternatives</span>
                          </div>
                          <div className="space-y-2">
                            {aiReasoning.alternativeOptions.map((alt: any, idx: number) => (
                              <div key={idx} className="bg-gray-50 rounded-lg p-2.5">
                                <p className="text-xs text-gray-700">{alt.reason}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Bot className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-xs">AI analysis loading...</p>
                    </div>
                  )}
                </div>
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
                  {routeCameras.map((camera) => (
                    <motion.button
                      key={camera.id}
                      onClick={() => setSelectedCamera(camera)}
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
                  ))}
                </div>
              </div>
            </div>
          </div>

          {selectedCamera && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                onClick={() => setSelectedCamera(null)}
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
                      <h3 className="font-semibold text-gray-900">{selectedCamera.name}</h3>
                    </div>
                    <button
                      onClick={() => setSelectedCamera(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
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
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Location</p>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedCamera.lat.toFixed(4)}, {selectedCamera.lon.toFixed(4)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Status</p>
                          <p className="text-sm font-medium text-emerald-600">Active</p>
                        </div>
                      </div>
                    </div>

                    <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      View Full Feed
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          )}
        </>
      )}
    </div>
  );
}
