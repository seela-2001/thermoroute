import { motion } from 'framer-motion';
import { Shield, Navigation } from 'lucide-react';
import type { AnalyzedRoute } from '@/services/routeApi';
import { getRiskColorClasses } from '@/lib';

interface SegmentAnalysisProps {
  route: AnalyzedRoute | null;
}

export function SegmentAnalysis({ route }: SegmentAnalysisProps) {
  if (!route) {
    return (
      <div className="h-64 bg-white border-t border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-purple-600" />
            Segment Analysis
          </h3>
        </div>
        <div className="p-8 text-center text-gray-400">
          <Shield className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Select a route to see segment analysis</p>
        </div>
      </div>
    );
  }

  const criticalSegments = route.risk?.critical_segments || [];

  if (criticalSegments.length === 0) {
    return (
      <div className="h-64 bg-white border-t border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-purple-600" />
            Segment Analysis
          </h3>
        </div>
        <div className="p-8 text-center text-gray-400">
          <Shield className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No critical risk segments detected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64 bg-white border-t border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-purple-600" />
          Segment Analysis
        </h3>
      </div>

      <div className="p-4 space-y-3">
        {criticalSegments.map((segment: any, idx: number) => {
          const riskScore = segment.risk_score || 0;
          const riskLevel = (segment.risk_level || 'unknown').toUpperCase();
          const riskColors = getRiskColorClasses(riskLevel);

          return (
            <motion.div
              key={segment.segment_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-3 rounded-lg border ${riskColors.bg} ${riskColors.border}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">Segment {segment.segment_id}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskColors.bg} ${riskColors.text}`}>
                  {riskLevel}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${riskScore}%` }}
                      className={`h-full ${riskColors.bar}`}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-600">{riskScore.toFixed(0)}%</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
