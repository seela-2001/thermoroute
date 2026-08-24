
import { MapPin, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LocationInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  suggestions: Array<{ city: string; state: string; original: { lat: number; lon: number; name: string; city: string; state: string } }>;
  onSuggestionSelect: (city: { city: string; state: string }, original: { lat: number; lon: number; name: string; city: string; state: string }) => void;
  showSuggestions: boolean;
  onSuggestionsToggle: (show: boolean) => void;
}

export function LocationInput({
  label,
  placeholder,
  value,
  onChange,
  onClear,
  suggestions,
  onSuggestionSelect,
  showSuggestions,
  onSuggestionsToggle,
}: LocationInputProps) {
  return (
    <div className="relative">
      <label className="text-sm font-semibold text-slate-700 mb-2 block uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTimeout(() => onSuggestionsToggle(false), 200)}
          className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-900 placeholder:text-slate-400"
        />
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={onClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto"
          >
            {suggestions.map((city, index) => (
              <motion.button
                key={`${city.city}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onMouseDown={() => {
                  onSuggestionSelect({ city: city.city, state: city.state }, city.original);
                  onSuggestionsToggle(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-100 last:border-0"
              >
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-900">{city.city}</span>
                <span className="text-slate-400">{city.state}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
