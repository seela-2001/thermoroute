/**
 * Summary Card Component
 *
 * A prominent card that shows the key decision: WHAT SHOULD I DO?
 * This is the most important information for the user.
 */

import { motion } from 'framer-motion';
import { Play, Clock, Thermometer, Route as RouteIcon, Check, AlertTriangle } from 'lucide-react';
import type { Route, DepartureOption } from '@/types/route';
import { formatDistance, formatDuration, getRiskBgColor, getRiskTextColor } from '@/data/mockRoutes';

interface SummaryCardProps {
  route: Route;
  departure: DepartureOption;
  onRouteSelect?: () => void;
}

export function SummaryCard({ route, departure, onRouteSelect }: SummaryCardProps) {
  const isLeaveNow = departure.recommended && departure.hourOffset === 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-2xl overflow-hidden border-2 ${
        isLeaveNow
          ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
          : departure.riskLevel === 'high' || departure.riskLevel === 'extreme'
            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
            : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200'
      }`}
    >
      {/* Header - WHAT SHOULD I DO? */}
      <div className="p-6 pb-4">
        <h2 className="text-xl font-bold text-slate-900 mb-1">What should I do?</h2>
        <p className="text-slate-600">Based on heat risk analysis and route conditions</p>
      </div>

      {/* Main Action */}
      <div className={`px-6 pb-6 ${getRiskBgColor(departure.riskLevel)}`}>
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            isLeaveNow ? 'bg-emerald-500' : departure.riskLevel === 'high' || departure.riskLevel === 'extreme' ? 'bg-amber-500' : 'bg-blue-500'
          }`}>
            {isLeaveNow ? (
              <Play className="w-7 h-7 text-white" fill="currentColor" />
            ) : (
              <Clock className="w-7 h-7 text-white" />
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">
              {isLeaveNow ? 'Leave Now' : `Wait ${departure.hourOffset} Hours`}
            </h3>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${getRiskBgColor(departure.riskLevel)} ${getRiskTextColor(departure.riskLevel)}`}>
                {departure.riskLevel.toUpperCase()} HEAT RISK
              </span>
              <span className="text-sm text-slate-600">
                Expected: {departure.temperature}°F
              </span>
            </div>
          </div>
        </div>

        {/* Recommendation explanation */}
        <div className="mt-4 p-3 bg-white/60 backdrop-blur-sm rounded-xl">
          <p className="text-sm text-slate-700 leading-relaxed">
            {isLeaveNow
              ? `Current conditions are favorable. Leaving now provides the best balance of heat risk and travel time. ${route.name} is the recommended route.`
              : `Current risk is ${departure.riskLevel}. Waiting ${departure.hourOffset} hours until ${departure.time} will reduce heat exposure significantly.`}
          </p>
        </div>
      </div>

      {/* Route Summary */}
      <div className="p-6 bg-white border-t border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-slate-500 mb-1">Recommended Route</p>
            <h4 className="text-lg font-bold text-slate-900">{route.name}</h4>
            <p className="text-sm text-slate-600">{route.description}</p>
          </div>
          {route.isRecommended && (
            <div className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-full flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              BEST OVERALL
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-slate-50 rounded-xl">
            <RouteIcon className="w-5 h-5 mx-auto text-slate-400 mb-1" />
            <p className="text-lg font-bold text-slate-900">{formatDistance(route.distance)}</p>
            <p className="text-xs text-slate-500">Distance</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-xl">
            <Clock className="w-5 h-5 mx-auto text-slate-400 mb-1" />
            <p className="text-lg font-bold text-slate-900">{formatDuration(route.duration)}</p>
            <p className="text-xs text-slate-500">Travel Time</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-xl">
            <Thermometer className="w-5 h-5 mx-auto text-slate-400 mb-1" />
            <p className="text-lg font-bold text-slate-900">{route.cameras.length}</p>
            <p className="text-xs text-slate-500">Cameras</p>
          </div>
        </div>

        {onRouteSelect && (
          <button
            onClick={onRouteSelect}
            className="mt-4 w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
          >
            View Route Details
          </button>
        )}
      </div>
    </motion.div>
  );
}
