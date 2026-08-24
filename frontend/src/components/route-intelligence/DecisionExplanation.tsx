
import { motion } from 'framer-motion';
import { Check, AlertTriangle, Clock, Info } from 'lucide-react';
import type { Route, Recommendation } from '@/types/route';

interface DecisionExplanationProps {
  route: Route;
  recommendation: Recommendation;
}

export function DecisionExplanation({ route, recommendation }: DecisionExplanationProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-500" />
          {recommendation.action === 'leave_now' ? 'Why Leave Now?' : 'Why Wait?'}
        </h3>
      </div>

      <div className="p-6 space-y-4">
        {recommendation.reasoning.map((reason, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{reason}</p>
          </motion.div>
        ))}

        {recommendation.action === 'wait' && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-900">Current Heat Risk is High</p>
                <p className="text-sm text-amber-700 mt-1">
                  Waiting {recommendation.departureHourOffset} hours will reduce heat exposure significantly.
                </p>
              </div>
            </div>
          </div>
        )}

        {recommendation.alternatives && recommendation.alternatives.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-sm font-semibold text-slate-700 mb-3">Other Considerations</p>
            {recommendation.alternatives.map((alt, index) => (
              <div key={index} className="flex items-start gap-3 mb-2 last:mb-0">
                <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">
                      Route {String.fromCharCode(65 + index)}
                    </span>
                    {': '}{alt.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
