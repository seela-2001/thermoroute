import { motion } from 'framer-motion';
import { Clock, Zap } from 'lucide-react';
import { formatTemperature, formatTime } from '@/lib';

export interface HourlyForecast {
  hourOffset: number;
  time: Date;
  temperature: number;
  heatIndex: number;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  isRecommended: boolean;
  reason: string;
}

interface TimeRiskBarProps {
  forecast: HourlyForecast[];
}

const RISK_BAR_COLORS: Record<HourlyForecast['riskLevel'], string> = {
  low: 'bg-emerald-400',
  medium: 'bg-yellow-400',
  high: 'bg-orange-400',
  extreme: 'bg-red-400',
};

export function TimeRiskBar({ forecast }: TimeRiskBarProps) {
  const recommendedTime = forecast.find((h) => h.isRecommended);

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-4 z-40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-3 h-3 text-purple-600" />
          Next 12 Hours - Risk Forecast
        </h3>
        <span className="text-xs text-gray-500">
          Recommended:{' '}
          <span className="text-purple-600 font-medium">
            {recommendedTime ? formatTime(recommendedTime.time) : '--'}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-12 gap-1">
        {forecast.map((hour, idx) => {
          const riskColorClass = RISK_BAR_COLORS[hour.riskLevel];

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="relative group cursor-pointer"
            >
              <div
                className={`h-16 rounded-t-lg ${riskColorClass} ${
                  hour.isRecommended ? 'ring-2 ring-purple-500 ring-offset-2' : ''
                } transition-all hover:opacity-80`}
              />
              <div className="text-center mt-1">
                <p className="text-[9px] font-semibold text-gray-900">
                  {formatTemperature(hour.temperature, 'F')}
                </p>
                <p className="text-[8px] text-gray-500">
                  {formatTime(hour.time)}
                </p>
              </div>

              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-[10px] rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <p className="font-semibold">{formatTime(hour.time)}</p>
                <p>
                  Temp: {formatTemperature(hour.temperature, 'F')} | Heat Index: {formatTemperature(hour.heatIndex, 'F')}
                </p>
                <p className="mt-1 text-purple-300">{hour.reason}</p>
                {hour.isRecommended && (
                  <p className="mt-1 text-emerald-300 flex items-center gap-1">
                    <Zap className="w-2 h-2" /> Recommended
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-400" />
          <span className="text-[10px] text-gray-600">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-400" />
          <span className="text-[10px] text-gray-600">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-400" />
          <span className="text-[10px] text-gray-600">High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-400" />
          <span className="text-[10px] text-gray-600">Extreme</span>
        </div>
      </div>
    </div>
  );
}
