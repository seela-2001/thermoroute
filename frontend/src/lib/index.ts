/**
 * Centralized Utilities Library
 * Single source of truth for all shared utility functions
 */

// ==================== TYPE DEFINITIONS ====================

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'EXTREME';
export type TemperatureUnit = 'C' | 'F';

// ==================== CONFIGURATION ====================

const CONFIG = {
  temperature: {
    unit: 'F' as TemperatureUnit, // Standardized to Fahrenheit for UI
    conversion: {
      cToF: (c: number) => c * 9/5 + 32,
      fToC: (f: number) => (f - 32) * 5/9,
    },
  },
  distance: {
    kmToMi: 0.621371,
  },
};

// ==================== RISK LEVEL UTILITIES ====================

export const RISK_LEVELS: Record<RiskLevel, number> = {
  LOW: 0,
  MODERATE: 20,
  HIGH: 40,
  VERY_HIGH: 60,
  EXTREME: 80,
};

/**
 * Get risk color as hex string
 */
export function getRiskColor(riskLevel: string): string {
  const level = riskLevel.toUpperCase() as RiskLevel;
  const colorMap: Record<RiskLevel, string> = {
    LOW: '#10b981',
    MODERATE: '#f59e0b',
    HIGH: '#f97316',
    VERY_HIGH: '#ef4444',
    EXTREME: '#7f1d1d',
  };
  return colorMap[level] || '#6b7280';
}

/**
 * Get risk background color class for Tailwind
 */
export function getRiskBgColor(riskLevel: string): string {
  const level = riskLevel.toUpperCase() as RiskLevel;
  const bgMap: Record<RiskLevel, string> = {
    LOW: 'bg-emerald-50',
    MODERATE: 'bg-amber-50',
    HIGH: 'bg-orange-50',
    VERY_HIGH: 'bg-red-50',
    EXTREME: 'bg-red-100',
  };
  return bgMap[level] || 'bg-gray-50';
}

/**
 * Get risk text color class for Tailwind
 */
export function getRiskTextColor(riskLevel: string): string {
  const level = riskLevel.toUpperCase() as RiskLevel;
  const textMap: Record<RiskLevel, string> = {
    LOW: 'text-emerald-700',
    MODERATE: 'text-amber-700',
    HIGH: 'text-orange-700',
    VERY_HIGH: 'text-red-700',
    EXTREME: 'text-red-900',
  };
  return textMap[level] || 'text-gray-700';
}

/**
 * Get complete risk color classes (bg, text, border)
 */
export function getRiskColorClasses(riskLevel: string): {
  bg: string;
  text: string;
  border: string;
  bar: string;
} {
  const level = riskLevel.toUpperCase() as RiskLevel;
  const colorMap: Record<RiskLevel, { bg: string; text: string; border: string; bar: string }> = {
    LOW: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      bar: 'bg-emerald-400',
    },
    MODERATE: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      bar: 'bg-amber-400',
    },
    HIGH: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      bar: 'bg-orange-400',
    },
    VERY_HIGH: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      bar: 'bg-red-400',
    },
    EXTREME: {
      bg: 'bg-red-100',
      text: 'text-red-900',
      border: 'border-red-300',
      bar: 'bg-red-600',
    },
  };
  return colorMap[level] || {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    bar: 'bg-gray-400',
  };
}

/**
 * Get risk bar color class
 */
export function getRiskBarColor(riskLevel: string): string {
  return getRiskColorClasses(riskLevel).bar;
}

// ==================== FORMATTING UTILITIES ====================

/**
 * Format distance (km to miles)
 */
export function formatDistance(km: number, unit: 'mi' | 'km' = 'mi'): string {
  const value = unit === 'mi' ? km * CONFIG.distance.kmToMi : km;
  return `${Math.round(value)} ${unit}`;
}

/**
 * Format duration (minutes to human-readable)
 */
export function formatDuration(minutes: number): string {
  if (!minutes || !isFinite(minutes)) return '--';
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format time to readable string
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format temperature with unit
 */
export function formatTemperature(
  temp: number,
  fromUnit: TemperatureUnit = 'C',
  toUnit: TemperatureUnit = CONFIG.temperature.unit
): string {
  const value = fromUnit === toUnit ? temp :
    fromUnit === 'C' ? CONFIG.temperature.conversion.cToF(temp) :
    CONFIG.temperature.conversion.fToC(temp);
  return `${Math.round(value)}°${toUnit}`;
}

/**
 * Get temperature in configured display unit
 */
export function getDisplayTemperature(celsius: number): number {
  if (CONFIG.temperature.unit === 'F') {
    return CONFIG.temperature.conversion.cToF(celsius);
  }
  return celsius;
}

// ==================== VALIDATION UTILITIES ====================

/**
 * Check if coordinates are valid
 */
export function isValidCoordinates(lat: number | undefined, lon: number | undefined): boolean {
  return (
    lat !== undefined &&
    lon !== undefined &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Check if value is a valid temperature
 */
export function isValidTemperature(temp: number | undefined): boolean {
  return temp !== undefined && !isNaN(temp) && temp >= -50 && temp <= 60;
}

// ==================== CALCULATION UTILITIES ====================

/**
 * Calculate average of numbers
 */
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate percentage (0-100)
 */
export function toPercentage(value: number, max: number): number {
  if (max === 0) return 0;
  return clamp((value / max) * 100, 0, 100);
}

// ==================== STRING UTILITIES ====================

/**
 * Truncate string to max length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

// ==================== ARRAY UTILITIES ====================

/**
 * Chunk array into groups of size n
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Get unique items from array
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

/**
 * Group array by key
 */
export function groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) result[groupKey] = [];
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

// ==================== DELAY UTILITIES ====================

/**
 * Create a promise that resolves after ms
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ==================== GEO UTILITIES ====================

/**
 * Calculate distance between two coordinates in km (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get midpoint between two coordinates
 */
export function getMidpoint(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): { lat: number; lon: number } {
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const bx = Math.cos(lat2Rad) * Math.cos(dLon);
  const by = Math.cos(lat2Rad) * Math.sin(dLon);
  const lat = Math.atan2(
    Math.sin(lat1Rad) + Math.sin(lat2Rad),
    Math.sqrt((Math.cos(lat1Rad) + bx) ** 2 + by ** 2)
  );
  const lon = toRadians(lon1) + Math.atan2(by, Math.cos(lat1Rad) + bx);
  return {
    lat: lat * (180 / Math.PI),
    lon: lon * (180 / Math.PI),
  };
}

// ==================== EXPORT ALL ====================

export default {
  // Risk
  getRiskColor,
  getRiskBgColor,
  getRiskTextColor,
  getRiskColorClasses,
  getRiskBarColor,
  RISK_LEVELS,
  // Formatting
  formatDistance,
  formatDuration,
  formatTime,
  formatDate,
  formatTemperature,
  getDisplayTemperature,
  // Validation
  isValidCoordinates,
  isValidTemperature,
  // Calculation
  average,
  clamp,
  toPercentage,
  // String
  truncate,
  capitalize,
  snakeToCamel,
  camelToSnake,
  // Array
  chunk,
  unique,
  groupBy,
  // Async
  delay,
  debounce,
  throttle,
  // Geo
  calculateDistance,
  getMidpoint,
};
