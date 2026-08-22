import { useState } from "react";
import { ArrowRight, Search, X, Clock, Shield, Camera, Check, Route, ChevronRight, Sparkles, Thermometer, Gauge, MapPin, Calendar } from "lucide-react";

const popularCities = [
  { city: "New York", state: "NY", lat: 40.7128, lon: -74.0060 },
  { city: "Los Angeles", state: "CA", lat: 34.0522, lon: -118.2437 },
  { city: "Chicago", state: "IL", lat: 41.8781, lon: -87.6298 },
  { city: "Houston", state: "TX", lat: 29.7604, lon: -95.3698 },
  { city: "Phoenix", state: "AZ", lat: 33.4484, lon: -112.0740 },
  { city: "Philadelphia", state: "PA", lat: 39.9526, lon: -75.1652 },
];

interface RouteOption {
  id: string;
  name: string;
  highways: string[];
  distance: string;
  time: string;
  riskLevel: "low" | "medium" | "high";
  cameras: number;
  heatTemp: number;
  recommended: boolean;
  stops: string[];
}

const getRouteOptions = (): RouteOption[] => [
  {
    id: "1",
    name: "Recommended Route",
    highways: ["I-95 N", "I-76 W", "PA Turnpike"],
    distance: "245 mi",
    time: "4h 15m",
    riskLevel: "low",
    cameras: 12,
    heatTemp: 88,
    recommended: true,
    stops: ["Rest Area I-95", "Travel Center PA"],
  },
  {
    id: "2",
    name: "Alternative Route",
    highways: ["US-1 N", "US-30 W", "I-76 W"],
    distance: "258 mi",
    time: "4h 45m",
    riskLevel: "medium",
    cameras: 8,
    heatTemp: 92,
    recommended: false,
    stops: ["Gas Station US-1", "Diner Exit 52"],
  },
  {
    id: "3",
    name: "Highway Route",
    highways: ["I-295 N", "NJ Turnpike", "I-95 S"],
    distance: "262 mi",
    time: "4h 30m",
    riskLevel: "high",
    cameras: 15,
    heatTemp: 96,
    recommended: false,
    stops: ["Service Plaza NJ", "Rest Area I-95"],
  },
];

export function TravelPlanner() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  const filterCities = (query: string) => {
    if (!query) return [];
    return popularCities.filter(
      (c) =>
        c.city.toLowerCase().includes(query.toLowerCase()) ||
        `${c.city}, ${c.state}`.toLowerCase().includes(query.toLowerCase())
    );
  };

  const handleSelectCity = (city: typeof popularCities[0], isOrigin: boolean) => {
    if (isOrigin) {
      setOrigin(city.city);
      setShowOriginSuggestions(false);
    } else {
      setDestination(city.city);
      setShowDestSuggestions(false);
    }
  };

  const handlePlanRoute = () => {
    if (!origin || !destination) {
      return;
    }
    setShowResults(true);
    setSelectedRoute("1");
  };

  const routeOptions = showResults ? getRouteOptions() : [];
  const recommendedRoute = routeOptions.find(r => r.recommended);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {!showResults ? (
        /* Input View */
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-lg">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2 tracking-tight">
              Plan your route
            </h1>
            <p className="text-gray-500 mb-8">
              Get AI-powered route recommendations based on weather, traffic, and safety
            </p>

            <div className="space-y-4">
              {/* From */}
              <div className="relative">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">From</label>
                <Search className="w-5 h-5 absolute left-4 top-[2.1rem] text-gray-400" />
                <input
                  type="text"
                  placeholder="City or address"
                  value={origin}
                  onChange={(e) => {
                    setOrigin(e.target.value);
                    setShowOriginSuggestions(true);
                  }}
                  onFocus={() => setShowOriginSuggestions(true)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                />
                {origin && (
                  <button onClick={() => setOrigin("")} className="absolute right-4 top-[2.1rem] text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                )}
                {showOriginSuggestions && filterCities(origin).length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
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

              {/* To */}
              <div className="relative">
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">To</label>
                <Search className="w-5 h-5 absolute left-4 top-[2.1rem] text-gray-400" />
                <input
                  type="text"
                  placeholder="City or address"
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    setShowDestSuggestions(true);
                  }}
                  onFocus={() => setShowDestSuggestions(true)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                />
                {destination && (
                  <button onClick={() => setDestination("")} className="absolute right-4 top-[2.1rem] text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                )}
                {showDestSuggestions && filterCities(destination).length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
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

              <button
                onClick={handlePlanRoute}
                className="w-full bg-black text-white py-3.5 rounded-xl font-medium hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
              >
                <Route className="w-5 h-5" />
                Find Routes
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="min-h-screen">
          {/* Top Bar */}
          <div className="bg-white border-b border-gray-100">
            <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
              <button onClick={() => { setShowResults(false); setSelectedRoute(null); }} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowRight className="w-5 h-5 mr-2 rotate-180" />
                Back
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span className="font-medium text-gray-900">{origin}</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <span className="font-medium text-gray-900">{destination}</span>
              </div>
              <div className="w-16"></div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto p-6">
            {/* AI Recommendation Card */}
            {recommendedRoute && (
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-violet-100">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">AI Recommended</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Based on today's weather forecast of {recommendedRoute.heatTemp}°F peak temperature,
                      this route offers the best balance of shade coverage, traffic conditions, and safety.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-4">
                  <div className="bg-white/60 rounded-xl p-3 text-center backdrop-blur-sm">
                    <Clock className="w-4 h-4 mx-auto text-violet-600 mb-1" />
                    <p className="text-lg font-semibold text-gray-900">{recommendedRoute.time}</p>
                    <p className="text-xs text-gray-500">Duration</p>
                  </div>
                  <div className="bg-white/60 rounded-xl p-3 text-center backdrop-blur-sm">
                    <Thermometer className="w-4 h-4 mx-auto text-orange-500 mb-1" />
                    <p className="text-lg font-semibold text-gray-900">{recommendedRoute.heatTemp}°F</p>
                    <p className="text-xs text-gray-500">Peak Heat</p>
                  </div>
                  <div className="bg-white/60 rounded-xl p-3 text-center backdrop-blur-sm">
                    <Shield className="w-4 h-4 mx-auto text-green-600 mb-1" />
                    <p className="text-lg font-semibold text-green-600">Low</p>
                    <p className="text-xs text-gray-500">Risk Level</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedRoute(recommendedRoute.id)}
                  className={`mt-5 w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                    selectedRoute === recommendedRoute.id
                      ? "bg-violet-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  {selectedRoute === recommendedRoute.id ? (
                    <>
                      <Check className="w-5 h-5" />
                      Selected Route
                    </>
                  ) : (
                    <>
                      Select this Route
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Route Summary for Selected */}
            {selectedRoute && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm">
                <h4 className="text-sm font-medium text-gray-500 mb-4">Route Details</h4>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Route</span>
                    <span className="text-sm font-medium text-gray-900">{routeOptions.find(r => r.id === selectedRoute)?.name}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Highways</span>
                    <span className="text-sm font-medium text-gray-900">{routeOptions.find(r => r.id === selectedRoute)?.highways.join(" → ")}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Distance</span>
                    <span className="text-sm font-medium text-gray-900">{routeOptions.find(r => r.id === selectedRoute)?.distance}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Cameras</span>
                    <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-gray-400" />
                      {routeOptions.find(r => r.id === selectedRoute)?.cameras} available
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">Stops</span>
                    <span className="text-sm font-medium text-gray-900">{routeOptions.find(r => r.id === selectedRoute)?.stops.join(", ")}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Other Routes */}
            <h4 className="text-sm font-medium text-gray-500 mb-3">Alternative Routes</h4>
            <div className="space-y-2">
              {routeOptions.filter(r => !r.recommended).map((route) => (
                <div
                  key={route.id}
                  onClick={() => setSelectedRoute(route.id)}
                  className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
                    selectedRoute === route.id ? "border-black ring-1 ring-black/5" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{route.name}</p>
                      <p className="text-sm text-gray-500 mt-1">{route.highways.join(" → ")}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Clock className="w-4 h-4" />
                        {route.time}
                      </span>
                      <span className={`flex items-center gap-1 ${
                        route.riskLevel === 'low' ? 'text-green-600' : route.riskLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        <Thermometer className="w-4 h-4" />
                        {route.heatTemp}°F
                      </span>
                      {selectedRoute === route.id && <Check className="w-5 h-5 text-black" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}