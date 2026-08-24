import { Bot, Zap, Shield, Thermometer, Clock, Check, AlertTriangle } from 'lucide-react';
import type { AnalyzedRoute } from '@/services/routeApi';
import { formatDuration, formatTemperature } from '@/lib';

interface AIReasoningCardProps {
  route: AnalyzedRoute;
  routes: AnalyzedRoute[];
  selectedRouteId: string;
}

export function AIReasoningCard({ route, routes, selectedRouteId }: AIReasoningCardProps) {
  const isSelected = route.id === selectedRouteId;

  if (!route || !route.risk) {
    return (
      <div className="rounded-xl border-2 border-slate-200 bg-white overflow-hidden h-full p-3">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-900">AI Reasoning</h3>
        </div>
        <div className="text-[9px] text-slate-500 mt-2">Route data not available</div>
      </div>
    );
  }

  const reasoning = generateAIReasoning(route, routes, isSelected);

  return (
    <div className="rounded-xl border-2 overflow-hidden h-full flex flex-col">
      <div className={`p-3 border-b ${isSelected ? 'border-purple-200' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <Bot className={`w-4 h-4 ${isSelected ? 'text-purple-600' : 'text-slate-400'}`} />
          <h3 className="text-xs font-bold text-slate-900">AI Reasoning</h3>
          {isSelected && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-bold rounded-full">
              RECOMMENDED
            </span>
          )}
        </div>
      </div>

      <div className="p-3 space-y-2.5 flex-1 overflow-auto">
        {reasoning.recommendation && (
          <div className="flex items-start gap-2">
            <Zap className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-500" />
            <div>
              <div className="text-[10px] font-semibold text-slate-900">
                {reasoning.recommendation}
              </div>
              <div className="text-[9px] text-slate-600">
                {reasoning.recommendationReason}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2">
          <Shield className="w-3 h-3 mt-0.5 flex-shrink-0 text-orange-500" />
          <div>
            <div className="text-[10px] font-semibold text-slate-900">
              Risk Level: {route.risk.level.toLowerCase()}
            </div>
            <div className="text-[9px] text-slate-600">
              {reasoning.riskAnalysis}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Thermometer className="w-3 h-3 mt-0.5 flex-shrink-0 text-orange-500" />
          <div>
            <div className="text-[10px] font-semibold text-slate-900">
              Weather Impact
            </div>
            <div className="text-[9px] text-slate-600">
              {reasoning.weatherImpact}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Clock className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-500" />
          <div>
            <div className="text-[10px] font-semibold text-slate-900">
              Route Efficiency
            </div>
            <div className="text-[9px] text-slate-600">
              {reasoning.routeEfficiency}
            </div>
          </div>
        </div>

        {reasoning.keyPoints.length > 0 && (
          <div className="pt-1.5 border-t border-slate-200">
            <div className="text-[10px] font-semibold text-slate-900 mb-1">Key Points</div>
            {reasoning.keyPoints.map((point, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-[9px] text-slate-700">
                <Check className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        )}

        {reasoning.warning && (
          <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-[9px] text-amber-800">{reasoning.warning}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function generateAIReasoning(route: AnalyzedRoute, allRoutes: AnalyzedRoute[], isSelected: boolean) {
  const riskLevel = route.risk?.level?.toLowerCase() || 'unknown';
  const riskScore = route.risk?.score || 0;
  const maxTemp = route.risk?.metrics?.max_temperature || route.heat_data?.[0]?.temperature || 0;
  const heatIndex = route.risk?.metrics?.max_heat_index || route.heat_data?.[0]?.heat_index || 0;
  const durationMin = route.duration_min || 0;
  const distanceKm = route.distance_km || 0;

  const routeIndex = allRoutes.findIndex(r => r.id === route.id);
  const avgRiskScore = allRoutes.length > 0
    ? allRoutes.reduce((sum, r) => sum + (r.risk?.score || 0), 0) / allRoutes.length
    : 0;

  let recommendation = '';
  let recommendationReason = '';

  if (isSelected) {
    if (riskScore < avgRiskScore) {
      recommendation = 'Recommended - Lowest Risk';
      recommendationReason = `This route has the lowest risk score (${riskScore}) among all options.`;
    } else if (riskLevel === 'low' || riskLevel === 'moderate') {
      recommendation = 'Safe to Travel';
      recommendationReason = `Current conditions are favorable with ${riskLevel} risk level.`;
    } else {
      recommendation = 'Proceed with Caution';
      recommendationReason = 'Elevated heat risk detected. Monitor conditions carefully.';
    }
  } else {
    const lowerRiskRoute = allRoutes.find(r => (r.risk?.score || 0) < (route.risk?.score || 0));
    if (lowerRiskRoute) {
      recommendation = 'Alternative Route';
      recommendationReason = `Higher risk than ${String.fromCharCode(65 + allRoutes.indexOf(lowerRiskRoute))}. Consider safer options.`;
    } else {
      recommendation = 'Viable Option';
      recommendationReason = 'Similar risk levels to other available routes.';
    }
  }

  const riskAnalysis = {
    low: `Risk score of ${riskScore} indicates safe travel conditions. No significant heat-related concerns.`,
    moderate: `Moderate risk level. Stay hydrated and take regular breaks during extended travel.`,
    high: `High risk detected. Consider traveling during cooler hours if possible.`,
    very_high: `Very high risk. Postpone travel if not essential or take extended precautions.`,
    extreme: `Extreme risk. Strongly recommend postponing travel until conditions improve.`,
  }[riskLevel] || 'Unknown risk level.';

  let weatherImpact = '';
  const heatIndexF = (heatIndex * 9/5) + 32;
  if (heatIndexF > 113) {
    weatherImpact = `Heat index of ${formatTemperature(heatIndex, 'C')} feels significantly hotter than actual temperature. Take extra precautions.`;
  } else if (heatIndexF > 90) {
    weatherImpact = `Heat index of ${formatTemperature(heatIndex, 'C')} may cause discomfort during prolonged exposure.`;
  } else {
    weatherImpact = `Comfortable conditions with heat index of ${formatTemperature(heatIndex, 'C')}.`;
  }

  const avgDistance = allRoutes.length > 0
    ? allRoutes.reduce((sum, r) => sum + (r.distance_km || 0), 0) / allRoutes.length
    : 0;
  const avgDuration = allRoutes.length > 0
    ? allRoutes.reduce((sum, r) => sum + (r.duration_min || 0), 0) / allRoutes.length
    : 0;

  let routeEfficiency = '';
  if (distanceKm <= avgDistance && durationMin <= avgDuration) {
    routeEfficiency = `Shortest route with ${distanceKm.toFixed(1)}km distance and ${formatDuration(durationMin)} duration.`;
  } else if (distanceKm <= avgDistance * 1.1) {
    routeEfficiency = `Slightly longer route but offers better safety trade-offs.`;
  } else {
    routeEfficiency = `Longer route at ${distanceKm.toFixed(1)}km with ${formatDuration(durationMin)} duration.`;
  }

  const keyPoints: string[] = [];

  if (riskLevel === 'low' || riskLevel === 'moderate') {
    keyPoints.push('Favorable weather conditions for travel');
  }

  if ((route.pois?.length || 0) > 0) {
    keyPoints.push(`${route.pois.length} points of interest available along route`);
  }

  if ((route.risk?.critical_segments?.length || 0) === 0) {
    keyPoints.push('No high-risk segments detected');
  }

  if (heatIndex > 35) {
    keyPoints.push('Monitor heat index throughout journey');
  }

  let warning = '';
  if (riskLevel === 'high' || riskLevel === 'very_high' || riskLevel === 'extreme') {
    warning = 'Heat advisory in effect. Carry extra water, use air conditioning, and avoid prolonged outdoor exposure.';
  } else if (riskLevel === 'moderate' && heatIndex > 35) {
    warning = 'Stay hydrated and take breaks every 1-2 hours.';
  }

  return {
    recommendation,
    recommendationReason,
    riskAnalysis,
    weatherImpact,
    routeEfficiency,
    keyPoints,
    warning,
  };
}
