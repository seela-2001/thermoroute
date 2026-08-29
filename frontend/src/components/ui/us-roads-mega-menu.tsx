'use client';

import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Road {
    name: string;
    label: string;
    originLat: number;
    originLng: number;
    destinationLat: number;
    destinationLng: number;
    origin: string;
    destination: string;
    destinationState: string;
}

const col1: Road[] = [
    { name: 'I-5', label: 'Seattle → San Diego', origin: 'Seattle, WA', destination: 'San Diego, CA', originLat: 47.6062, originLng: -122.3321, destinationLat: 32.7157, destinationLng: -117.1611, destinationState: 'CA' },
    { name: 'I-8', label: 'San Diego → Tucson', origin: 'San Diego, CA', destination: 'Tucson, AZ', originLat: 32.7157, originLng: -117.1611, destinationLat: 32.2226, destinationLng: -110.9747, destinationState: 'AZ' },
    { name: 'I-10 West', label: 'Los Angeles → Phoenix', origin: 'Los Angeles, CA', destination: 'Phoenix, AZ', originLat: 34.0522, originLng: -118.2437, destinationLat: 33.4484, destinationLng: -112.0740, destinationState: 'AZ' },
    { name: 'I-10 East', label: 'Houston → Jacksonville', origin: 'Houston, TX', destination: 'Jacksonville, FL', originLat: 29.7604, originLng: -95.3698, destinationLat: 30.3322, destinationLng: -81.6557, destinationState: 'FL' },
    { name: 'I-15', label: 'San Diego → Salt Lake City', origin: 'San Diego, CA', destination: 'Salt Lake City, UT', originLat: 32.7157, originLng: -117.1611, destinationLat: 40.7608, destinationLng: -111.8910, destinationState: 'UT' },
    { name: 'I-25', label: 'Albuquerque → Denver', origin: 'Albuquerque, NM', destination: 'Denver, CO', originLat: 35.0844, originLng: -106.6504, destinationLat: 39.7392, destinationLng: -104.9903, destinationState: 'CO' },
    { name: 'I-80 West', label: 'San Francisco → Salt Lake City', origin: 'San Francisco, CA', destination: 'Salt Lake City, UT', originLat: 37.7749, originLng: -122.4194, destinationLat: 40.7608, destinationLng: -111.8910, destinationState: 'UT' },
    { name: 'PCH', label: 'San Francisco → Los Angeles', origin: 'San Francisco, CA', destination: 'Los Angeles, CA', originLat: 37.7749, originLng: -122.4194, destinationLat: 34.0522, destinationLng: -118.2437, destinationState: 'CA' },
];

const col2: Road[] = [
    { name: 'I-35', label: 'Dallas → Minneapolis', origin: 'Dallas, TX', destination: 'Minneapolis, MN', originLat: 32.7767, originLng: -96.7970, destinationLat: 44.9778, destinationLng: -93.2650, destinationState: 'MN' },
    { name: 'I-40', label: 'Albuquerque → Oklahoma City', origin: 'Albuquerque, NM', destination: 'Oklahoma City, OK', originLat: 35.0844, originLng: -106.6504, destinationLat: 35.4676, destinationLng: -97.5164, destinationState: 'OK' },
    { name: 'I-44', label: 'Oklahoma City → St. Louis', origin: 'Oklahoma City, OK', destination: 'St. Louis, MO', originLat: 35.4676, originLng: -97.5164, destinationLat: 38.6270, destinationLng: -90.1994, destinationState: 'MO' },
    { name: 'I-45', label: 'Galveston → Dallas', origin: 'Galveston, TX', destination: 'Dallas, TX', originLat: 29.3013, originLng: -94.7977, destinationLat: 32.7767, destinationLng: -96.7970, destinationState: 'TX' },
    { name: 'I-70', label: 'Denver → Kansas City', origin: 'Denver, CO', destination: 'Kansas City, MO', originLat: 39.7392, originLng: -104.9903, destinationLat: 39.0997, destinationLng: -94.5786, destinationState: 'MO' },
    { name: 'I-80 East', label: 'Chicago → Cleveland', origin: 'Chicago, IL', destination: 'Cleveland, OH', originLat: 41.8781, originLng: -87.6298, destinationLat: 41.4993, destinationLng: -81.6944, destinationState: 'OH' },
    { name: 'I-90', label: 'Chicago → Minneapolis', origin: 'Chicago, IL', destination: 'Minneapolis, MN', originLat: 41.8781, originLng: -87.6298, destinationLat: 44.9778, destinationLng: -93.2650, destinationState: 'MN' },
    { name: 'I-94', label: 'Chicago → Minneapolis', origin: 'Chicago, IL', destination: 'Minneapolis, MN', originLat: 41.8781, originLng: -87.6298, destinationLat: 44.9778, destinationLng: -93.2650, destinationState: 'MN' },
    { name: 'Route 66', label: 'Chicago → Los Angeles', origin: 'Chicago, IL', destination: 'Los Angeles, CA', originLat: 41.8781, originLng: -87.6298, destinationLat: 34.0522, destinationLng: -118.2437, destinationState: 'CA' },
];

const col3: Road[] = [
    { name: 'I-20', label: 'Atlanta → Charlotte', origin: 'Atlanta, GA', destination: 'Charlotte, NC', originLat: 33.7490, originLng: -84.3880, destinationLat: 35.2271, destinationLng: -80.8431, destinationState: 'NC' },
    { name: 'I-55', label: 'New Orleans → Chicago', origin: 'New Orleans, LA', destination: 'Chicago, IL', originLat: 29.9511, originLng: -90.0715, destinationLat: 41.8781, destinationLng: -87.6298, destinationState: 'IL' },
    { name: 'I-65', label: 'Mobile → Nashville', origin: 'Mobile, AL', destination: 'Nashville, TN', originLat: 30.6954, originLng: -88.0399, destinationLat: 36.1627, destinationLng: -86.7816, destinationState: 'TN' },
    { name: 'I-75', label: 'Miami → Atlanta', origin: 'Miami, FL', destination: 'Atlanta, GA', originLat: 25.7617, originLng: -80.1918, destinationLat: 33.7490, destinationLng: -84.3880, destinationState: 'GA' },
    { name: 'I-85', label: 'Atlanta → Charlotte', origin: 'Atlanta, GA', destination: 'Charlotte, NC', originLat: 33.7490, originLng: -84.3880, destinationLat: 35.2271, destinationLng: -80.8431, destinationState: 'NC' },
    { name: 'I-95 South', label: 'Miami → Washington DC', origin: 'Miami, FL', destination: 'Washington, DC', originLat: 25.7617, originLng: -80.1918, destinationLat: 38.9072, destinationLng: -77.0369, destinationState: 'DC' },
    { name: 'I-95 North', label: 'Washington DC → Boston', origin: 'Washington, DC', destination: 'Boston, MA', originLat: 38.9072, originLng: -77.0369, destinationLat: 42.3601, destinationLng: -71.0589, destinationState: 'MA' },
    { name: 'I-64', label: 'St. Louis → Richmond', origin: 'St. Louis, MO', destination: 'Richmond, VA', originLat: 38.6270, originLng: -90.1994, destinationLat: 37.5407, destinationLng: -77.4360, destinationState: 'VA' },
];

function roadState(road: Road) {
    return {
        autoSubmit: true,
        origin: road.origin,
        destination: road.destination,
        originLat: road.originLat,
        originLng: road.originLng,
        destinationLat: road.destinationLat,
        destinationLng: road.destinationLng,
        destinationState: road.destinationState,
    };
}

function RoadLink({ road, onClick }: { road: Road; onClick: () => void }) {
    return (
        <Link
            to="/plan"
            state={roadState(road)}
            onClick={onClick}
            className="flex flex-col px-2 py-1.5 rounded hover:bg-gray-50 transition-colors group"
        >
            <span className="text-xs font-semibold text-gray-800 group-hover:text-gray-900">{road.name}</span>
            <span className="text-[10px] text-gray-400 leading-tight">{road.label}</span>
        </Link>
    );
}

export function UsRoadsMegaMenu({ className }: { className?: string }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isMobileOpen, setIsMobileOpen] = React.useState(false);
    const timeoutRef = React.useRef<number | null>(null);

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = window.setTimeout(() => setIsOpen(false), 150);
    };

    React.useEffect(() => {
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, []);

    const close = () => setIsOpen(false);

    return (
        <>
            {/* Desktop */}
            <div className="hidden md:block relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                <button
                    className={cn('hover:bg-gray-100 rounded-md px-4 py-2 text-sm font-medium flex items-center gap-1 transition-colors', className)}
                    aria-expanded={isOpen}
                >
                    US Roads
                    <svg className={cn('w-3.5 h-3.5 transition-transform duration-200', isOpen && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isOpen && (
                    <div
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[560px] bg-white rounded-xl border border-gray-200 shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
                    >
                        <div className="p-4 grid grid-cols-3 gap-x-3">
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">West</p>
                                {col1.map(r => <RoadLink key={r.name} road={r} onClick={close} />)}
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">Midwest</p>
                                {col2.map(r => <RoadLink key={r.name} road={r} onClick={close} />)}
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-2">South & East</p>
                                {col3.map(r => <RoadLink key={r.name} road={r} onClick={close} />)}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile */}
            <div className="md:hidden w-full">
                <button
                    onClick={() => setIsMobileOpen(v => !v)}
                    className={cn('hover:bg-gray-100 rounded-md px-4 py-3 text-sm font-medium flex items-center justify-between w-full transition-colors', className)}
                >
                    <span>US Roads</span>
                    <svg className={cn('w-4 h-4 transition-transform duration-200', isMobileOpen && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isMobileOpen && (
                    <div className="bg-gray-50 rounded-md mt-1 p-3 max-h-64 overflow-y-auto animate-in fade-in-0 slide-in-from-top-2 duration-200">
                        {[...col1, ...col2, ...col3].map(r => (
                            <Link
                                key={`${r.name}-${r.label}`}
                                to="/plan"
                                state={roadState(r)}
                                onClick={() => setIsMobileOpen(false)}
                                className="flex items-center justify-between px-3 py-2 rounded hover:bg-white transition-colors"
                            >
                                <span className="text-xs font-semibold text-gray-800">{r.name}</span>
                                <span className="text-[10px] text-gray-400">{r.label}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
