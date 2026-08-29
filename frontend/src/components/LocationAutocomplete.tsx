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
  disabled = false,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const GEOAPIFY_API_KEY =
    import.meta.env.VITE_GEOAPIFY_API_KEY || "REMOVED_SECRET";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showSuggestions || value.trim().length < 2) return;

    const debounceTimer = setTimeout(async () => {
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
        if (!response.ok) throw new Error("Failed to fetch locations");

        const data = (await response.json()) as { features?: GeoapifyFeature[] };
        if (data.features && data.features.length > 0) {
          setSuggestions(
            data.features.map((f) => ({
              formatted: f.properties.formatted,
              lat: f.properties.lat,
              lon: f.properties.lon,
              city: f.properties.city,
              country: f.properties.country,
              state: f.properties.state,
              stateCode: f.properties.state_code,
            }))
          );
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
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
      state: suggestion.stateCode || suggestion.state,
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
        <MapPin
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 z-10"
          style={{ color: "var(--color-accent)" }}
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          placeholder={placeholder}
          style={{
            width: "100%",
            height: 52,
            paddingLeft: 44,
            paddingRight: 36,
            background: "var(--color-surface)",
            border: "1.5px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: 15,
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-body)",
            outline: "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--color-accent)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.12)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--color-border)";
            e.currentTarget.style.boxShadow = "none";
          }}
          className="disabled:opacity-60 disabled:cursor-not-allowed"
        />
        {value && !disabled && !loading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full transition-colors"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--color-base)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--color-accent)" }} />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 z-50 overflow-hidden max-h-64 overflow-y-auto"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-high)",
          }}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-3 text-left transition-all duration-150 group"
              style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(249,115,22,0.06)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <div className="flex items-start gap-3">
                <MapPin
                  className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 transition-colors"
                  style={{ color: "var(--color-text-muted)" }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[14px] font-medium truncate"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {suggestion.formatted}
                  </p>
                  <p
                    className="text-[12px] truncate mt-0.5"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {[suggestion.city, suggestion.state, suggestion.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showSuggestions && value.length >= 2 && suggestions.length === 0 && !loading && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 px-4 py-3 z-50"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-high)",
          }}
        >
          <p className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>
            No locations found
          </p>
        </div>
      )}
    </div>
  );
}
