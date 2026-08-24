import { motion } from 'framer-motion';
import { Clock, Thermometer, Shield, Coffee, CheckCircle, Sparkles } from 'lucide-react';
import type { AnalyzedRoute } from '@/services/routeApi';
import { getRiskColorClasses, formatDuration, formatDistance, formatTemperature } from '@/lib';

interface RouteCardProps {
  route: AnalyzedRoute;
  index: number;
  isSelected: boolean;
  isRecommended: boolean;
  color: { primary: string; secondary: string };
  onClick: () => void;
}

export function RouteCard({
  route,
  index,
  isSelected,
  isRecommended,
  color,
  onClick,
}: RouteCardProps) {
  const riskColor = getRiskColorClasses(route.risk?.level || 'low');
  const riskColorClass = `${riskColor.text} ${riskColor.bg} ${riskColor.border}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
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
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              isSelected ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {String.fromCharCode(65 + index)}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 flex items-center gap-1">
              {isRecommended && <Sparkles className="w-3 h-3 text-purple-600" />}
              Route {String.fromCharCode(65 + index)}
            </div>
            {isRecommended && <span className="text-xs text-purple-600 font-medium">Recommended</span>}
          </div>
        </div>
        {isSelected && <CheckCircle className="w-5 h-5 text-purple-600" />}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="text-center p-1.5 bg-gray-50 rounded-lg">
          <Clock className="w-3 h-3 text-gray-500 mx-auto mb-0.5" />
          <p className="text-xs font-semibold text-gray-900">{formatDuration(route.duration_min)}</p>
          <p className="text-[9px] text-gray-500">Duration</p>
        </div>
        <div className="text-center p-1.5 bg-gray-50 rounded-lg">
          <Thermometer className="w-3 h-3 text-gray-500 mx-auto mb-0.5" />
          <p className="text-xs font-semibold text-gray-900">
            {formatTemperature(route.risk?.metrics?.max_temperature || 0, 'C')}
          </p>
          <p className="text-[9px] text-gray-500">Max Heat</p>
        </div>
        <div className="text-center p-1.5 rounded-lg">
          <Shield className="w-3 h-5 text-gray-500 mx-auto mb-0.5" />
          <p className={`text-xs font-semibold ${riskColor.text}`}>
            {route.risk?.level || 'N/A'}
          </p>
          <p className="text-[9px] text-gray-500">Risk</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{formatDistance(route.distance_km)}</span>
        <span className="flex items-center gap-1">
          {route.pois?.length || 0} stops
          <Coffee className="w-3 h-3" />
        </span>
      </div>

      <div className="mt-2 h-1.5 rounded-full bg-purple-400" />
    </motion.div>
  );
}
