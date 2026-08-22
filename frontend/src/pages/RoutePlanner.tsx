/**
 * ThermoDispatch Route Planner
 *
 * The main route planning experience with heat risk intelligence,
 * camera inspection, and departure time optimization.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, MapPin, Search, X, Clock,
  Thermometer, Shield, Camera, Route as RouteIcon, Sparkles, Check,
  ChevronRight, AlertTriangle, Sun, Wind, Eye, Navigation,
  Play, Pause, RefreshCw, Info, CameraOff, ZoomIn,
  ZoomOut, Maximize2, Map as MapIcon
} from 'lucide-react';
import {
  mockRoutes,
  mockDepartureOptions,
  mockRecommendation,
  getRouteById,
  formatDistance,
  formatDuration,
  formatTime,
  getRiskColor,
  getRiskBgColor,
  getRiskTextColor,
  cameras,
  getCameraById,
  formatStopTime,
  getStopTypeInfo,
  getTripStrategyDescription,
  getTripLengthCategory,
} from '@/data/mockRoutes';
import type { Route, Camera as CameraType, DepartureOption } from '@/types/route';
import { CameraPreview } from '@/components/cameras/CameraPreview';

// Popular cities for autocomplete
const popularCities = [
  { city: 'Houston', state: 'TX', lat: 29.7604, lon: -95.3698 },
  { city: 'Dallas', state: 'TX', lat: 32.7767, lon: -96.7970 },
  { city: 'Austin', state: 'TX', lat: 30.2672, lon: -97.7431 },
  { city: 'San Antonio', state: 'TX', lat: 29.4241, lon: -98.4936 },
  { city: 'Fort Worth', state: 'TX', lat: 32.7555, lon: -97.3308 },
  { city: 'El Paso', state: 'TX', lat: 31.7619, lon: -106.4850 },
  { city: 'Phoenix', state: 'AZ', lat: 33.4484, lon: -112.0740 },
  { city: 'Las Vegas', state: 'NV', lat: 36.1699, lon: -115.1398 },
  { city: 'Los Angeles', state: 'CA', lat: 34.0522, lon: -118.2437 },
];

type ViewState = 'landing' | 'loading' | 'results';

export function RoutePlanner() {
  // State
  const [viewState, setViewState] = useState<ViewState>('landing');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('route-a');
  const [selectedDepartureHour, setSelectedDepartureHour] = useState(0);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [showAllStops, setShowAllStops] = useState(false);
  const [expandedTripPlan, setExpandedTripPlan] = useState(false);

  const selectedRoute = getRouteById(selectedRouteId) || mockRoutes[0];
  const selectedDeparture = mockDepartureOptions[selectedDepartureHour];

  // Filter cities for autocomplete
  const filterCities = (query: string) => {
    if (!query) return [];
    return popularCities.filter(
      (c) =>
        c.city.toLowerCase().includes(query.toLowerCase()) ||
        `${c.city}, ${c.state}`.toLowerCase().includes(query.toLowerCase())
    );
  };

  // Handle city selection
  const handleSelectCity = (city: typeof popularCities[0], isOrigin: boolean) => {
    if (isOrigin) {
      setOrigin(`${city.city}, ${city.state}`);
      setShowOriginSuggestions(false);
    } else {
      setDestination(`${city.city}, ${city.state}`);
      setShowDestSuggestions(false);
    }
  };

  // Handle route planning
  const handlePlanRoute = () => {
    if (!origin || !destination) return;
    setViewState('loading');
    // Simulate API call with delay
    setTimeout(() => {
      setViewState('results');
    }, 2500);
  };

  // Reset to landing
  const handleReset = () => {
    setViewState('landing');
    setSelectedRouteId('route-a');
    setSelectedDepartureHour(0);
    setSelectedCameraId(null);
  };

  // Render functions
  const renderLandingView = () => (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-800 hover:text-slate-600 transition-colors">
            <RouteIcon className="w-6 h-6" />
            <span className="font-semibold text-lg">ThermoDispatch</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Home</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6">
              Plan Smarter.
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                Drive Safer.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
              Find the best route and the safest time to travel through heat-aware route intelligence.
            </p>
          </motion.div>
        </div>

        {/* Route Planner Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 p-8">
            <div className="space-y-6">
              {/* Origin Input */}
              <div className="relative">
                <label className="text-sm font-semibold text-slate-700 mb-2 block uppercase tracking-wide">
                  From
                </label>
                <div className="relative">
                  <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="City or address"
                    value={origin}
                    onChange={(e) => {
                      setOrigin(e.target.value);
                      setShowOriginSuggestions(true);
                    }}
                    onFocus={() => setShowOriginSuggestions(true)}
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400"
                  />
                  {origin && (
                    <button
                      onClick={() => setOrigin('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                {showOriginSuggestions && filterCities(origin).length > 0 && (
                  <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                    {filterCities(origin).map((city) => (
                      <button
                        key={city.city}
                        onClick={() => handleSelectCity(city, true)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-100 last:border-0"
                      >
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-900">{city.city}</span>
                        <span className="text-slate-400">{city.state}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Swap Button */}
              <div className="flex justify-center -my-2 relative z-10">
                <button className="w-10 h-10 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center hover:border-blue-500 hover:text-blue-500 transition-all shadow-lg">
                  <ArrowRight className="w-5 h-5 rotate-90" />
                </button>
              </div>

              {/* Destination Input */}
              <div className="relative">
                <label className="text-sm font-semibold text-slate-700 mb-2 block uppercase tracking-wide">
                  To
                </label>
                <div className="relative">
                  <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="City or address"
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      setShowDestSuggestions(true);
                    }}
                    onFocus={() => setShowDestSuggestions(true)}
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400"
                  />
                  {destination && (
                    <button
                      onClick={() => setDestination('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                {showDestSuggestions && filterCities(destination).length > 0 && (
                  <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                    {filterCities(destination).map((city) => (
                      <button
                        key={city.city}
                        onClick={() => handleSelectCity(city, false)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-100 last:border-0"
                      >
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-900">{city.city}</span>
                        <span className="text-slate-400">{city.state}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Plan Route Button */}
              <button
                onClick={handlePlanRoute}
                disabled={!origin || !destination}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl hover:shadow-slate-900/20"
              >
                <RouteIcon className="w-5 h-5" />
                Plan Route
              </button>
            </div>
          </div>

          {/* Popular Routes */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500 mb-3">Popular routes</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { from: 'Houston', to: 'Dallas', label: 'Short (3h 42m)' },
                { from: 'Houston', to: 'Oklahoma City', label: 'Medium (7h 48m)' },
                { from: 'Houston', to: 'El Paso', label: 'Long (10h 12m)' },
              ].map((route) => (
                <button
                  key={`${route.from}-${route.to}`}
                  onClick={() => {
                    setOrigin(`${route.from}, TX`);
                    if (route.to === 'Oklahoma City') {
                      setDestination('Oklahoma City, OK');
                    } else if (route.to === 'El Paso') {
                      setDestination('El Paso, TX');
                    } else {
                      setDestination('Dallas, TX');
                    }
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all"
                >
                  {route.from} → {route.to}
                  <span className="ml-1 text-xs text-slate-400">({route.label})</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );

  // Loading View
  const renderLoadingView = () => (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md mx-auto text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-8"
        >
          <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <RouteIcon className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Analyzing Your Trip</h2>
          <p className="text-slate-600">Finding the safest route and time</p>
        </motion.div>

        <div className="space-y-4 text-left">
          {[
            { text: 'Finding available routes...', delay: 0 },
            { text: 'Analyzing road conditions...', delay: 0.2 },
            { text: 'Locating traffic cameras...', delay: 0.4 },
            { text: 'Checking heat conditions...', delay: 0.6 },
            { text: 'Comparing the next 12 hours...', delay: 0.8 },
            { text: 'Finding the best departure time...', delay: 1 },
          ].map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: step.delay }}
              className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                {index < 5 ? (
                  <Check className="w-4 h-4 text-blue-600" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                )}
              </div>
              <span className={`text-sm ${index < 5 ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {step.text}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  // Results View
  const renderResultsView = () => (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="hidden md:flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-900">{origin}</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <span className="font-semibold text-slate-900">{destination}</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Recommendation & Routes */}
          <div className="lg:col-span-1 space-y-6">
            {/* Recommendation Card */}
            <RecommendationCard
              route={selectedRoute}
              departure={selectedDeparture}
              onSelectRoute={setSelectedRouteId}
            />

            {/* Route Options */}
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Alternative Routes
              </h3>
              <div className="space-y-2">
                {mockRoutes.map((route) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    selected={selectedRouteId === route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    selectedDeparture={selectedDeparture}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Middle Column - Map */}
          <div className="lg:col-span-2 space-y-6">
            {/* Route Map */}
            <RouteMap
              routes={mockRoutes}
              selectedRouteId={selectedRouteId}
              selectedCameraId={selectedCameraId}
              onCameraClick={setSelectedCameraId}
              showAllStops={showAllStops}
              selectedRoute={selectedRoute}
              onToggleShowAllStops={() => setShowAllStops(!showAllStops)}
            />

            {/* Trip Plan - Only shown for medium+ trips */}
            {selectedRoute.tripPlan && selectedRoute.tripPlan.stopStrategy !== 'none' && (
              <TripPlanSection
                tripPlan={selectedRoute.tripPlan}
                route={selectedRoute}
                expanded={expandedTripPlan}
                onToggleExpand={() => setExpandedTripPlan(!expandedTripPlan)}
                showAllStops={showAllStops}
                onToggleShowAllStops={() => setShowAllStops(!showAllStops)}
              />
            )}

            {/* 12-Hour Heat Timeline */}
            <HeatRiskTimeline
              routes={mockRoutes}
              selectedRouteId={selectedRouteId}
              selectedHour={selectedDepartureHour}
              onHourSelect={setSelectedDepartureHour}
            />

            {/* Cameras Panel */}
            <CamerasPanel
              cameras={selectedRoute.cameras}
              selectedCameraId={selectedCameraId}
              onCameraSelect={setSelectedCameraId}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence mode="wait">
        {viewState === 'landing' && renderLandingView()}
        {viewState === 'loading' && renderLoadingView()}
        {viewState === 'results' && renderResultsView()}
      </AnimatePresence>

      {/* Camera Preview Modal */}
      <CameraPreview
        camera={getCameraById(selectedCameraId || '') || null}
        onClose={() => setSelectedCameraId(null)}
      />
    </>
  );
}

// Recommendation Card Component
function RecommendationCard({
  route,
  departure,
  onSelectRoute,
}: {
  route: Route;
  departure: DepartureOption;
  onSelectRoute: (id: string) => void;
}) {
  const tripLength = getTripLengthCategory(route.duration);
  const showStops = tripLength !== 'short';
  const tripPlan = route.tripPlan;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-6 border-2 ${
        route.isRecommended
          ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200'
          : 'bg-white border-slate-200'
      }`}
    >
      {route.isRecommended && (
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-blue-900">Best Option</span>
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">{route.name}</h2>
        <p className="text-slate-600">{route.description}</p>
      </div>

      {/* Trip summary with stops for long trips */}
      <div className={`p-4 rounded-xl mb-4 ${getRiskBgColor(departure.riskLevel)}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold text-slate-900">
            {formatDuration(route.duration)} · {formatDistance(route.distance)}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${getRiskBgColor(departure.riskLevel)} ${getRiskTextColor(departure.riskLevel)}`}>
            {departure.riskLevel.toUpperCase()} RISK
          </span>
        </div>

        {/* Stop summary for long trips */}
        {showStops && tripPlan && tripPlan.recommendedStops.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200/50">
            <div className="flex items-center gap-2 text-sm">
              <Navigation className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-slate-700">
                {tripPlan.recommendedStops.length} recommended stop{tripPlan.recommendedStops.length !== 1 ? 's' : ''}
              </span>
              {tripPlan.summary.estimatedTotalStopTime > 0 && (
                <span className="text-slate-500">
                  (~{formatDuration(tripPlan.summary.estimatedTotalStopTime)} total)
                </span>
              )}
            </div>

            {/* Quick stop preview for medium+ trips */}
            {tripPlan.recommendedStops.slice(0, 3).map((stop, idx) => {
              const stopInfo = getStopTypeInfo(stop.type);
              return (
                <div key={stop.id} className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                  <span className="font-mono text-slate-400">
                    {formatStopTime(stop.estimatedArrivalTime).split(' into')[0]}
                  </span>
                  <span>→</span>
                  <span className={stopInfo.color}>{stopInfo.icon} {stopInfo.label}</span>
                  {stop.isHeatAware && (
                    <span className="text-amber-600 font-medium">(Heat-aware)</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Departure info */}
      <div className={`p-3 rounded-xl ${getRiskBgColor(departure.riskLevel)} mb-4`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Departure</span>
          <div className="flex items-center gap-2">
            {departure.recommended ? (
              <Play className="w-4 h-4 text-emerald-600" fill="currentColor" />
            ) : (
              <Clock className="w-4 h-4 text-amber-600" />
            )}
            <span className="text-lg font-bold text-slate-900">{departure.time}</span>
          </div>
        </div>
        {departure.reason && (
          <p className="text-sm text-slate-600 mt-1">{departure.reason}</p>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-600">
        <span className="flex items-center gap-1.5">
          <RouteIcon className="w-4 h-4" />
          {formatDistance(route.distance)}
        </span>
        <span className="flex items-center gap-1.5">
          <Camera className="w-4 h-4" />
          {route.cameras.length} cameras
        </span>
      </div>
    </motion.div>
  );
}

// Route Card Component
function RouteCard({
  route,
  selected,
  onClick,
  selectedDeparture,
}: {
  route: Route;
  selected: boolean;
  onClick: () => void;
  selectedDeparture: DepartureOption;
}) {
  const heatRisk = route.heatRisk[selectedDeparture.hourOffset];

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        selected
          ? 'bg-white border-blue-500 shadow-md'
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-semibold text-slate-900">{route.name}</h4>
          <p className="text-sm text-slate-500">{route.description}</p>
        </div>
        {route.isRecommended && (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
            BEST
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm">
        <span className="text-slate-600">{formatDistance(route.distance)}</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-600">{formatDuration(route.duration)}</span>
        <span className="text-slate-600">·</span>
        <span className={`flex items-center gap-1 ${getRiskTextColor(heatRisk.riskLevel)}`}>
          <Thermometer className="w-3.5 h-3.5" />
          {heatRisk.temperature}°F
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {route.highways.map((hwy, i) => (
          <span
            key={i}
            className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded"
          >
            {hwy}
          </span>
        ))}
      </div>
    </motion.button>
  );
}

// Route Map Component
function RouteMap({
  routes,
  selectedRouteId,
  selectedCameraId,
  onCameraClick,
  showAllStops,
  selectedRoute,
  onToggleShowAllStops,
}: {
  routes: Route[];
  selectedRouteId: string;
  selectedCameraId: string | null;
  onCameraClick: (id: string | null) => void;
  showAllStops: boolean;
  selectedRoute: Route;
  onToggleShowAllStops: () => void;
}) {
  const tripPlan = selectedRoute.tripPlan;
  const stopsToShow = (showAllStops ? tripPlan?.allStops : tripPlan?.recommendedStops) || [];
  const hasStops = stopsToShow.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
    >
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <MapIcon className="w-5 h-5" />
          Route Map
          {hasStops && (
            <span className="text-sm font-normal text-slate-500">
              · {stopsToShow.length} stop{stopsToShow.length !== 1 ? 's' : ''}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {tripPlan && tripPlan.stopStrategy !== 'none' && (
            <button
              onClick={onToggleShowAllStops}
              className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
              style={{
                backgroundColor: showAllStops ? '#f1f5f9' : 'transparent',
                color: showAllStops ? '#0f172a' : '#64748b',
              }}
            >
              <Navigation className="w-3.5 h-3.5" />
              {showAllStops ? 'Fewer stops' : 'All stops'}
            </button>
          )}
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ZoomIn className="w-4 h-4 text-slate-600" />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ZoomOut className="w-4 h-4 text-slate-600" />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <Maximize2 className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Map Visualization */}
      <div className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200">
        {/* Simplified SVG Map */}
        <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(148, 163, 184, 0.3)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="800" height="400" fill="url(#grid)" />

          {/* Alternative routes (faded) */}
          {routes.filter(r => r.id !== selectedRouteId).map((route) => (
            <g key={route.id} opacity="0.3">
              <path
                d={`M ${100 + (route.id === 'route-b' ? 50 : 150)} ${350} Q ${400 + (route.id === 'route-b' ? 30 : -30)} ${200} ${700 + (route.id === 'route-b' ? -30 : 30)} ${50}`}
                fill="none"
                stroke={getRiskColor(route.currentRisk)}
                strokeWidth="4"
                strokeDasharray="8 4"
                strokeLinecap="round"
              />
            </g>
          ))}

          {/* Selected route */}
          <g>
            <path
              d={`M 100 ${350} Q 400 ${200} 700 ${50}`}
              fill="none"
              stroke={getRiskColor(routes.find(r => r.id === selectedRouteId)?.currentRisk || 'low')}
              strokeWidth="6"
              strokeLinecap="round"
              className="drop-shadow-lg"
            />
          </g>

          {/* Stop markers (along the route) */}
          {hasStops && stopsToShow.map((stop, i) => {
            const progress = stop.distanceFromOrigin / selectedRoute.distance;
            const x = 100 + progress * 600;
            const y = 350 - progress * 300;
            const stopInfo = getStopTypeInfo(stop.type);

            return (
              <g
                key={stop.id}
                transform={`translate(${x}, ${y})`}
                className="cursor-pointer"
                style={{ opacity: showAllStops && !stop.isRecommended ? 0.5 : 1 }}
              >
                <circle
                  r={stop.isRecommended ? 10 : 6}
                  fill={stop.isHeatAware ? '#f59e0b' : '#3b82f6'}
                  stroke="white"
                  strokeWidth={stop.isRecommended ? 3 : 2}
                  className="drop-shadow-md"
                />
                {stop.isRecommended && (
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {stopInfo.icon}
                  </text>
                )}
              </g>
            );
          })}

          {/* Origin marker */}
          <g transform="translate(100, 350)">
            <circle r="12" fill="#3b82f6" stroke="white" strokeWidth="3" className="drop-shadow-lg" />
            <text x="0" y="4" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">A</text>
          </g>

          {/* Destination marker */}
          <g transform="translate(700, 50)">
            <circle r="12" fill="#ef4444" stroke="white" strokeWidth="3" className="drop-shadow-lg" />
            <text x="0" y="4" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">B</text>
          </g>

          {/* Camera markers */}
          {routes.find(r => r.id === selectedRouteId)?.cameras.map((camera, i) => (
            <g
              key={camera.id}
              transform={`translate(${150 + i * 50}, ${300 - i * 22})`}
              className="cursor-pointer"
              onClick={() => onCameraClick(selectedCameraId === camera.id ? null : camera.id)}
            >
              <circle
                r={selectedCameraId === camera.id ? 12 : 8}
                fill={selectedCameraId === camera.id ? '#3b82f6' : '#64748b'}
                stroke="white"
                strokeWidth={selectedCameraId === camera.id ? 3 : 2}
                className="drop-shadow-md transition-all"
              />
              <text
                x="0"
                y="3"
                textAnchor="middle"
                fill="white"
                fontSize={selectedCameraId === camera.id ? "10" : "8"}
              >
                📷
              </text>
            </g>
          ))}
        </svg>

        {/* Camera Preview Popup */}
        {selectedCameraId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-4 right-4 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-10 w-48"
          >
            <button
              onClick={() => onCameraClick(null)}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="bg-slate-100 rounded-lg aspect-video mb-2 flex items-center justify-center">
              <Camera className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-900 truncate">
              {cameras.find(c => c.id === selectedCameraId)?.name}
            </p>
            <p className="text-xs text-slate-500">
              {cameras.find(c => c.id === selectedCameraId)?.roadName}
            </p>
          </motion.div>
        )}

        {/* Map Legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-slate-600">Low Risk</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-slate-600">Moderate</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-slate-600">High Risk</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-slate-600">Extreme</span>
          </div>
          {hasStops && (
            <>
              <div className="border-t border-slate-200 my-1" />
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-slate-600">Recommended Stop</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-slate-600">Heat-Aware Stop</span>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Heat Risk Timeline Component
function HeatRiskTimeline({
  routes,
  selectedRouteId,
  selectedHour,
  onHourSelect,
}: {
  routes: Route[];
  selectedRouteId: string;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
    >
      <div className="p-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Thermometer className="w-5 h-5" />
          12-Hour Heat Risk Forecast
        </h3>
      </div>

      <div className="p-6">
        {/* Timeline */}
        <div className="relative mb-6">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 rounded-full" />
          <div className="flex justify-between relative">
            {mockDepartureOptions.map((option, index) => {
              const isSelected = index === selectedHour;
              const isRecommended = option.recommended;
              const riskColor = getRiskColor(option.riskLevel);

              return (
                <button
                  key={index}
                  onClick={() => onHourSelect(index)}
                  className={`relative flex flex-col items-center gap-2 group`}
                >
                  {/* Dot */}
                  <div
                    className={`w-5 h-5 rounded-full border-4 transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 scale-125'
                        : isRecommended
                          ? 'border-blue-500 bg-white'
                          : 'border-slate-300 bg-white hover:border-slate-400'
                    }`}
                    style={{
                      borderColor: isSelected ? undefined : isRecommended ? '#3b82f6' : riskColor,
                      backgroundColor: isSelected ? undefined : isRecommended ? '#3b82f6' : 'white',
                    }}
                  />

                  {/* Time label */}
                  <span className={`text-xs font-medium whitespace-nowrap ${
                    isSelected ? 'text-slate-900' : 'text-slate-500'
                  }`}>
                    {option.time}
                  </span>

                  {/* Risk indicator */}
                  <span
                    className={`text-xs font-bold ${
                      isSelected ? getRiskTextColor(option.riskLevel) : 'text-slate-400'
                    }`}
                  >
                    {option.temperature}°
                  </span>

                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                    {option.riskLevel.toUpperCase()} RISK
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Route comparison */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Route Comparison</h4>
          <div className="space-y-3">
            {routes.map((route) => {
              const isSelected = route.id === selectedRouteId;
              const heatRisk = route.heatRisk[selectedHour];

              return (
                <div
                  key={route.id}
                  onClick={() => onHourSelect(selectedHour)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                      {route.name}
                    </span>
                    <span className={`text-sm font-bold ${getRiskTextColor(heatRisk.riskLevel)}`}>
                      {heatRisk.temperature}°F
                    </span>
                  </div>

                  {/* Mini risk bar */}
                  <div className="flex gap-0.5">
                    {route.heatRisk.map((point, i) => (
                      <div
                        key={i}
                        className="h-2 rounded-full flex-1 transition-all"
                        style={{
                          backgroundColor: i === selectedHour ? getRiskColor(point.riskLevel) : `${getRiskColor(point.riskLevel)}40`,
                        }}
                      />
                    ))}
                  </div>

                  <div className="flex justify-between mt-2 text-xs text-slate-500">
                    <span>Now</span>
                    <span>+12 Hours</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Cameras Panel Component
function CamerasPanel({
  cameras,
  selectedCameraId,
  onCameraSelect,
}: {
  cameras: CameraType[];
  selectedCameraId: string | null;
  onCameraSelect: (id: string | null) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
    >
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Traffic Cameras
          <span className="text-sm font-normal text-slate-500">
            ({cameras.length} along route)
          </span>
        </h3>
      </div>

      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {cameras.map((camera) => (
          <button
            key={camera.id}
            onClick={() => onCameraSelect(selectedCameraId === camera.id ? null : camera.id)}
            className={`relative rounded-xl overflow-hidden border-2 transition-all ${
              selectedCameraId === camera.id
                ? 'border-blue-500 ring-2 ring-blue-500/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Camera thumbnail */}
            <div className={`aspect-video bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center ${
              selectedCameraId === camera.id ? 'from-blue-100 to-blue-200' : ''
            }`}>
              <Camera
                className={`w-8 h-8 ${selectedCameraId === camera.id ? 'text-blue-500' : 'text-slate-400'}`}
              />
            </div>

            {/* Camera info */}
            <div className="p-2 text-left">
              <p className="text-xs font-medium text-slate-900 truncate">
                {camera.name}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {camera.roadName}
              </p>
            </div>

            {/* Status indicator */}
            <div
              className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                camera.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />

            {selectedCameraId === camera.id && (
              <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                <Eye className="w-8 h-8 text-blue-500" />
              </div>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// Trip Plan Section Component
function TripPlanSection({
  tripPlan,
  route,
  expanded,
  onToggleExpand,
  showAllStops,
  onToggleShowAllStops,
}: {
  tripPlan: { tripDuration: number; stopStrategy: string; recommendedStops: any[]; allStops: any[]; summary: any };
  route: Route;
  expanded: boolean;
  onToggleExpand: () => void;
  showAllStops: boolean;
  onToggleShowAllStops: () => void;
}) {
  const hours = Math.floor(tripPlan.tripDuration / 60);
  const mins = tripPlan.tripDuration % 60;
  const stopsToShow = showAllStops ? tripPlan.allStops : tripPlan.recommendedStops;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
    >
      <div
        className="p-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              Trip Plan
              <span className="text-sm font-normal text-slate-500">
                {hours}h {mins}m · {tripPlan.summary.totalStops} stop{tripPlan.summary.totalStops !== 1 ? 's' : ''}
              </span>
            </h3>
            <p className="text-sm text-slate-500">
              {tripPlan.stopStrategy === 'structured' && 'Structured plan for your long trip'}
              {tripPlan.stopStrategy === 'recommended' && 'Strategic stops recommended'}
              {tripPlan.stopStrategy === 'optional' && 'Optional stops available'}
            </p>
          </div>
        </div>
        <ChevronRight
          className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6">
              {/* Trip Timeline */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

                {/* Departure */}
                <div className="flex items-start gap-4 pb-8 relative">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center z-10 flex-shrink-0">
                    <Play className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">Depart now</span>
                      <span className="text-sm text-slate-500">({route.origin.name})</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {route.heatRisk[0]?.temperature}°F · {route.heatRisk[0]?.riskLevel.toUpperCase()} RISK
                    </p>
                  </div>
                </div>

                {/* Stops */}
                {stopsToShow.map((stop, index) => {
                  const stopInfo = getStopTypeInfo(stop.type);
                  const isLastStop = index === stopsToShow.length - 1;

                  return (
                    <div key={stop.id} className="flex items-start gap-4 pb-8 relative">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center z-10 flex-shrink-0 ${
                          stop.isHeatAware
                            ? 'bg-amber-500'
                            : stop.isRecommended
                              ? 'bg-blue-500'
                              : 'bg-slate-300'
                        }`}
                      >
                        <span className="text-white text-sm">{stopInfo.icon}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">{stop.name}</span>
                          {stop.isRecommended && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                              Recommended
                            </span>
                          )}
                          {stop.isHeatAware && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full flex items-center gap-1">
                              <Sun className="w-3 h-3" />
                              Heat-aware
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                          <span>{stopInfo.label}</span>
                          <span>·</span>
                          <span>{formatStopTime(stop.estimatedArrivalTime)}</span>
                          <span>·</span>
                          <span>{Math.round(stop.distanceFromOrigin)} mi from start</span>
                        </div>
                        {stop.description && (
                          <p className="text-sm text-slate-600 mt-1">{stop.description}</p>
                        )}
                        {stop.services && stop.services.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {stop.services.map((service: string) => (
                              <span
                                key={service}
                                className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded"
                              >
                                {service}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Destination */}
                <div className="flex items-start gap-4 relative">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center z-10 flex-shrink-0">
                    <span className="text-white text-sm font-bold">🏁</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">Arrive</span>
                      <span className="text-sm text-slate-500">({route.destination.name})</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      Total: {formatDuration(tripPlan.tripDuration + tripPlan.summary.estimatedTotalStopTime)} including stops
                    </p>
                  </div>
                </div>
              </div>

              {/* Stop summary */}
              {tripPlan.summary.estimatedTotalStopTime > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Estimated stop time:</span>
                    <span className="font-semibold text-slate-900">
                      {formatDuration(tripPlan.summary.estimatedTotalStopTime)}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-2 text-sm text-slate-500">
                    {tripPlan.summary.fuelStops > 0 && (
                      <span>⛽ {tripPlan.summary.fuelStops} fuel stop{tripPlan.summary.fuelStops !== 1 ? 's' : ''}</span>
                    )}
                    {tripPlan.summary.mealStops > 0 && (
                      <span>🍽️ {tripPlan.summary.mealStops} meal stop{tripPlan.summary.mealStops !== 1 ? 's' : ''}</span>
                    )}
                    {tripPlan.summary.restStops > 0 && (
                      <span>🛑 {tripPlan.summary.restStops} rest stop{tripPlan.summary.restStops !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Toggle button */}
              {!showAllStops && tripPlan.allStops.length > tripPlan.recommendedStops.length && (
                <button
                  onClick={onToggleShowAllStops}
                  className="w-full mt-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  View all {tripPlan.allStops.length} stops →
                </button>
              )}
              {showAllStops && (
                <button
                  onClick={onToggleShowAllStops}
                  className="w-full mt-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Show recommended stops only →
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
