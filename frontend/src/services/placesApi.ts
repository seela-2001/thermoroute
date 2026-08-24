export interface PlaceSuggestion {
  place_id: string;
  display_name: string;
  lat: number;
  lon: number;
  address: {
    city?: string;
    state?: string;
    country?: string;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function getAutocompleteSuggestions(
  query: string
): Promise<PlaceSuggestion[]> {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/routes/locations/autocomplete/?q=${encodeURIComponent(query)}&limit=5`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.success) {
      return [];
    }

    return data.results.map((item: any) => ({
      place_id: item.formatted || item.name || String(item.lat),
      display_name: item.formatted || item.name,
      lat: item.lat,
      lon: item.lon,
      address: {
        city: item.city,
        state: item.state,
        country: item.country,
      },
    }));
  } catch (error) {
    console.error('Error fetching place suggestions:', error);
    return [];
  }
}

export async function geocodeLocation(
  query: string
): Promise<{ lat: number; lng: number } | null> {
  if (!query) {
    return null;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/routes/locations/autocomplete/?q=${encodeURIComponent(query)}&limit=1`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.success && data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: result.lat,
        lng: result.lon,
      };
    }

    return null;
  } catch (error) {
    console.error('Error geocoding location:', error);
    return null;
  }
}

export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      {
        headers: {
          'User-Agent': 'ThermoRoute/1.0',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.display_name) {
      // Try to get a shorter, more readable location name
      const parts = data.display_name.split(',').slice(0, 3);
      return parts.join(',').trim();
    }

    return null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}
