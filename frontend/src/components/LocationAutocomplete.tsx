import { useState, useRef, useEffect } from "react";
import { MapPin, Loader2, X } from "lucide-react";

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: { name: string; lat: number; lng: number; state?: string }) => void;
  placeholder?: string;
  disabled?: boolean;
}

interface Suggestion {
  formatted: string;
  lat: number;
  lon: number;
  city?: string;
  country?: string;
  state?: string;
  stateCode?: string;
}

interface GeoapifyFeature {
  properties: {
    formatted: string;
    lat: number;
    lon: number;
    city?: string;
    country?: string;
    state?: string;
    state_code?: string;
  };
}

export function LocationAutocomplete({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Enter location",
  disabled = false
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || "REMOVED_SECRET";

  useEffect(() => {
    // Close suggestions when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Only search if suggestions are visible and value is long enough
    if (!showSuggestions || value.trim().length < 2) return;

    const debounceTimer = setTimeout(async () => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setLoading(true);

      try {
        const response = await fetch(
          `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(value)}&apiKey=${GEOAPIFY_API_KEY}&limit=8&lang=en`,
          { signal: abortControllerRef.current.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch locations");
        }

        const data = (await response.json()) as { features?: GeoapifyFeature[] };

        if (data.features && data.features.length > 0) {
          const results: Suggestion[] = data.features.map((feature) => ({
            formatted: feature.properties.formatted,
            lat: feature.properties.lat,
            lon: feature.properties.lon,
            city: feature.properties.city,
            country: feature.properties.country,
            state: feature.properties.state,
            stateCode: feature.properties.state_code,
          }));
          setSuggestions(results);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error("Error searching locations:", error);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(debounceTimer);
      abortControllerRef.current?.abort();
    };
  }, [value, showSuggestions, GEOAPIFY_API_KEY]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (e.target.value.trim().length >= 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    onChange(suggestion.formatted);
    setShowSuggestions(false);
    onLocationSelect({
      name: suggestion.formatted,
      lat: suggestion.lat,
      lng: suggestion.lon,
      state: suggestion.stateCode || suggestion.state
    });
  };

  const handleClear = () => {
    onChange("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 z-10" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full h-[52px] pl-12 pr-10 border border-gray-300 rounded-[10px] text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 hover:border-gray-400 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.formatted}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {[suggestion.city, suggestion.state, suggestion.country].filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showSuggestions && value.length >= 2 && suggestions.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4">
          <p className="text-sm text-gray-500">No locations found</p>
        </div>
      )}
    </div>
  );
}