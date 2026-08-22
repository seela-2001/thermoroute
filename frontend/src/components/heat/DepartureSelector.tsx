/**
 * Departure Selector Component
 *
 * An interactive time selector for choosing when to depart,
 * with visual risk indicators and smart recommendations.
 */

import { motion } from 'framer-motion';
import { Clock, Thermometer, Shield, Check, AlertTriangle } from 'lucide-react';
import type { DepartureOption } from '@/types/route';
import { getRiskColor, getRiskBgColor, getRiskTextColor } from '@/data/mockRoutes';

interface DepartureSelectorProps {
  options: DepartureOption[];
  selectedHour: number;
  onHourSelect: (hour: number) => void;
}

export function DepartureSelector({ options, selectedHour, onHourSelect }: DepartureSelectorProps) {
  const selectedOption = options[selectedHour];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          When Should You Leave?
        </h3>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRiskBgColor(selectedOption.riskLevel)} ${getRiskTextColor(selectedOption.riskLevel)}`}>
          {selectedOption.riskLevel.toUpperCase()} RISK
        </span>
      </div>

      {/* Selected Departure Card */}
      <div className={`p-6 ${getRiskBgColor(selectedOption.riskLevel)}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Best Departure Time</p>
            <div className="flex items-center gap-3">
              {selectedOption.recommended ? (
                <Check className="w-6 h-6 text-emerald-600" />
              ) : (
                <Clock className="w-6 h-6 text-amber-600" />
              )}
              <span className="text-3xl font-bold text-slate-900">{selectedOption.time}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-600 mb-1">Expected Temperature</p>
            <div className="flex items-center gap-2 justify-end">
              <Thermometer className="w-5 h-5 text-orange-500" />
              <span className="text-2xl font-bold text-slate-900">{selectedOption.temperature}°F</span>
            </div>
          </div>
        </div>

        {selectedOption.reason && (
          <div className="flex items-start gap-2 mt-4 p-3 bg-white/60 backdrop-blur-sm rounded-xl">
            {selectedOption.recommended ? (
              <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm text-slate-700">{selectedOption.reason}</p>
          </div>
        )}
      </div>

      {/* Time Options Grid */}
      <div className="p-4">
        <p className="text-sm font-medium text-slate-700 mb-3">Select Departure Time</p>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {options.map((option, index) => {
            const isSelected = index === selectedHour;
            const isRecommended = option.recommended;

            return (
              <button
                key={index}
                onClick={() => onHourSelect(index)}
                className={`relative p-3 rounded-xl border-2 transition-all group ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : isRecommended
                      ? 'border-blue-300 bg-blue-50/50 hover:border-blue-400'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {/* Risk indicator bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                  style={{ backgroundColor: getRiskColor(option.riskLevel) }}
                />

                <div className="flex flex-col items-center gap-1">
                  <span className={`text-xs font-medium ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                    {option.time}
                  </span>
                  <div className="flex items-center gap-1">
                    <Thermometer className={`w-3 h-3 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className={`text-sm font-bold ${getRiskTextColor(option.riskLevel)}`}>
                      {option.temperature}°
                    </span>
                  </div>
                </div>

                {isRecommended && !isSelected && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Risk Legend */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Low Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Moderate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Extreme</span>
          </div>
        </div>
      </div>
    </div>
  );
}
