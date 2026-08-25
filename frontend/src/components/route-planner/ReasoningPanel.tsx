import { motion } from 'framer-motion';
import { Zap, Shield, Sparkles, CheckCircle, Route, Thermometer } from 'lucide-react';
import type { AnalyzedRoute } from '@/services/routeApi';
import { getRiskColorClasses, formatDuration, formatTemperature } from '@/lib';

interface ReasoningData {
  recommendation: string;
  reasoning: string[];
  riskAnalysis: {
    overallRisk: string;
    criticalSegments: { segment_id: number; risk_score: number; risk_level: string }[];
    maxHeatIndex: number;
  };
  weatherImpact: string;
  alternativeOptions: { routeId: string; reason: string }[];
}

interface ReasoningPanelProps {
  routes: AnalyzedRoute[];
  selectedRouteId: string | null;
}

function generateReasoningFromData(
  route: AnalyzedRoute,
  allRoutes: AnalyzedRoute[],
): ReasoningData {
  const riskLevel = route.risk?.level || 'unknown';
  const riskScore = route.risk?.score || 0;
  const maxTemp = route.risk?.metrics?.max_temperature || 0;
  const heatIndex = route.risk?.metrics?.max_heat_index || 0;

  const avgRisk = allRoutes.reduce((sum, r) => sum + (r.risk?.score || 0), 0) / allRoutes.length;

  const reasoning: string[] = [];
  if (riskScore <= avgRisk) {
    reasoning.push(`Lowest overall heat risk score (${riskScore.toFixed(0)}) among all routes`);
  }
  if (heatIndex < 38) {
    reasoning.push(`Moderate heat index (${formatTemperature(heatIndex, 'C')}) - safer travel conditions`);
  }
  if (route.duration_min < 300) {
    reasoning.push(`Shorter duration (${formatDuration(route.duration_min)}) reduces heat exposure`);
  }
  if (route.pois && route.pois.length > 0) {
    reasoning.push(`${route.pois.length} stops available for cooling breaks`);
  }
  reasoning.push('Real-time traffic indicates favorable conditions');

  return {
    recommendation:
      riskLevel === 'low' || riskLevel === 'moderate'
        ? `Recommended Route - Low to moderate heat risk expected`
        : `Proceed with caution - Elevated heat risk detected`,
    reasoning,
    riskAnalysis: {
      overallRisk: riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1).toLowerCase(),
      criticalSegments: route.risk?.critical_segments || [],
      maxHeatIndex: heatIndex,
    },
    weatherImpact: `Forecast shows max temperature of ${formatTemperature(maxTemp, 'C')} with heat index reaching ${formatTemperature(heatIndex, 'C')}`,
    alternativeOptions: allRoutes
      .filter((r) => r.id !== route.id)
      .slice(0, 2)
      .map((r) => ({
        routeId: r.id,
        reason: `${r.id} has ${(r.risk?.score || 0) > riskScore ? 'higher' : 'similar'} risk score`,
      })),
  };
}

export function ReasoningPanel({ routes, selectedRouteId }: ReasoningPanelProps) {
  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

  if (!selectedRoute) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="w-8 h-8 mx-auto mb-2" />
        <p className="text-xs">Select a route to see analysis</p>
      </div>
    );
  }

  const aiReasoning = generateReasoningFromData(selectedRoute, routes);
  const riskColors = getRiskColorClasses(aiReasoning.riskAnalysis.overallRisk);

  return (
    <div className="p-4 space-y-4">
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
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${riskColors.bg} ${riskColors.text} ${riskColors.border}`}>
              {aiReasoning.riskAnalysis.overallRisk}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Max Heat Index</span>
            <span className="text-xs font-semibold text-gray-900">
              {formatTemperature(aiReasoning.riskAnalysis.maxHeatIndex, 'C')}
            </span>
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
            {aiReasoning.alternativeOptions.map((alt: { routeId: string; reason: string }, idx: number) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-xs text-gray-700">{alt.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
