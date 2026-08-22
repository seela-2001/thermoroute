/**
 * Route Comparison Visualization
 *
 * A sophisticated visualization showing how each route performs
 * across the next 12 hours in terms of heat risk.
 */

import { motion } from 'framer-motion';
import { Thermometer, Clock, Route as RouteIcon, ArrowRight } from 'lucide-react';
import type { Route } from '@/types/route';
import { getRiskColor, getRiskBgColor, getRiskTextColor, formatDuration, formatDistance } from '@/data/mockRoutes';

interface RouteComparisonProps {
  routes: Route[];
  selectedRouteId: string;
  selectedHour: number;
  onRouteSelect: (id: string) => void;
}

export function RouteComparison({ routes, selectedRouteId, selectedHour, onRouteSelect }: RouteComparisonProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <RouteIcon className="w-5 h-5 text-blue-500" />
          Route Comparison
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Compare heat risk across all routes over the next 12 hours
        </p>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Route
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Distance
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Time
              </th>
              {Array.from({ length: 13 }, (_, i) => (
                <th
                  key={i}
                  className={`px-2 py-3 text-center text-xs font-semibold text-slate-600 ${
                    i === selectedHour ? 'bg-blue-100' : ''
                  }`}
                >
                  {i === 0 ? 'Now' : `+${i}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {routes.map((route, routeIndex) => {
              const isSelected = route.id === selectedRouteId;

              return (
                <tr
                  key={route.id}
                  onClick={() => onRouteSelect(route.id)}
                  className={`cursor-pointer transition-all ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Route Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900">{route.name}</p>
                        <p className="text-xs text-slate-500">{route.description}</p>
                      </div>
                      {route.isRecommended && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                          BEST
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Distance */}
                  <td className="px-4 py-3 text-center text-sm text-slate-600">
                    {formatDistance(route.distance)}
                  </td>

                  {/* Duration */}
                  <td className="px-4 py-3 text-center text-sm text-slate-600">
                    {formatDuration(route.duration)}
                  </td>

                  {/* Hourly Risk Cells */}
                  {route.heatRisk.map((point, hourIndex) => {
                    const isSelectedHour = hourIndex === selectedHour;
                    const isSelectedRouteAndHour = isSelected && isSelectedHour;

                    return (
                      <td
                        key={hourIndex}
                        className={`px-2 py-3 text-center ${isSelectedHour ? 'bg-blue-100' : ''}`}
                      >
                        <div
                          className={`inline-flex flex-col items-center justify-center w-10 h-10 rounded-lg transition-all ${
                            isSelectedRouteAndHour ? 'ring-2 ring-blue-500 scale-110' : ''
                          }`}
                          style={{ backgroundColor: `${getRiskColor(point.riskLevel)}20` }}
                        >
                          <span className={`text-xs font-bold ${getRiskTextColor(point.riskLevel)}`}>
                            {point.temperature}°
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="p-4 bg-slate-50 border-t border-slate-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">
              {routes.length}
            </p>
            <p className="text-xs text-slate-500">Routes Available</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">
              {routes.reduce((sum, r) => sum + r.cameras.length, 0)}
            </p>
            <p className="text-xs text-slate-500">Total Cameras</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${getRiskTextColor(routes[0].currentRisk)}`}>
              {routes[0].currentRisk.toUpperCase()}
            </p>
            <p className="text-xs text-slate-500">Current Risk</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">
              {Math.min(...routes.map(r => r.duration))}
            </p>
            <p className="text-xs text-slate-500">Fastest Route</p>
          </div>
        </div>
      </div>
    </div>
  );
}
