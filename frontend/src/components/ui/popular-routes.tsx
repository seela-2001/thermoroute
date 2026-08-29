'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Route {
    from: string;
    to: string;
    distance: string;
    highway: string;
    originLat: number;
    originLng: number;
    destinationLat: number;
    destinationLng: number;
    destinationState: string;
}

const routes: Route[] = [
    { from: 'Dallas, TX', to: 'Austin, TX', distance: '195 mi / 314 km', highway: 'I-35', originLat: 32.7767, originLng: -96.7970, destinationLat: 30.2672, destinationLng: -97.7431, destinationState: 'TX' },
    { from: 'Los Angeles, CA', to: 'Las Vegas, NV', distance: '270 mi / 435 km', highway: 'I-15', originLat: 34.0522, originLng: -118.2437, destinationLat: 36.1699, destinationLng: -115.1398, destinationState: 'NV' },
    { from: 'Chicago, IL', to: 'Detroit, MI', distance: '280 mi / 451 km', highway: 'I-94', originLat: 41.8781, originLng: -87.6298, destinationLat: 42.3314, destinationLng: -83.0458, destinationState: 'MI' },
    { from: 'Miami, FL', to: 'Orlando, FL', distance: '237 mi / 381 km', highway: 'Florida Tpk', originLat: 25.7617, originLng: -80.1918, destinationLat: 28.5383, destinationLng: -81.3792, destinationState: 'FL' },
    { from: 'New York, NY', to: 'Boston, MA', distance: '217 mi / 349 km', highway: 'I-95', originLat: 40.7128, originLng: -74.0060, destinationLat: 42.3601, destinationLng: -71.0589, destinationState: 'MA' },
    { from: 'Phoenix, AZ', to: 'Las Vegas, NV', distance: '285 mi / 459 km', highway: 'US-93', originLat: 33.4484, originLng: -112.0740, destinationLat: 36.1699, destinationLng: -115.1398, destinationState: 'NV' },
];

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

export function PopularRoutes() {
    const navigate = useNavigate();
    const [durations, setDurations] = useState<(string | null)[]>(routes.map(() => null));

    useEffect(() => {
        routes.forEach((route, index) => {
            const url = `${OSRM_BASE}/${route.originLng},${route.originLat};${route.destinationLng},${route.destinationLat}?overview=false`;
            fetch(url)
                .then(r => r.json())
                .then(data => {
                    const seconds = data?.routes?.[0]?.duration;
                    if (typeof seconds === 'number') {
                        setDurations(prev => {
                            const next = [...prev];
                            next[index] = formatDuration(seconds);
                            return next;
                        });
                    }
                })
                .catch(() => {/* keep null — card still renders without time */});
        });
    }, []);

    const handleClick = (route: Route) => {
        navigate('/plan', {
            state: {
                autoSubmit: true,
                origin: route.from,
                destination: route.to,
                originLat: route.originLat,
                originLng: route.originLng,
                destinationLat: route.destinationLat,
                destinationLng: route.destinationLng,
                destinationState: route.destinationState,
            },
        });
    };

    return (
        <section className="w-full bg-gray-50 py-12 md:py-16">
            <div className="mx-auto max-w-6xl px-4">
                <h2 className="mb-2 text-center text-xl font-semibold text-gray-900">
                    Popular Routes
                </h2>
                <p className="mb-8 text-center text-sm text-gray-600">
                    Explore frequently traveled routes.
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {routes.map((route, index) => (
                        <div
                            key={index}
                            onClick={() => handleClick(route)}
                            className="group flex cursor-pointer flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-600 hover:-translate-y-0.5 hover:shadow-md"
                            style={{ transition: 'all 180ms ease' }}
                        >
                            <div className="flex items-center text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-180 ease">
                                {route.from}
                                <span className="mx-2 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-180 ease">→</span>
                                {route.to}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>{route.distance}</span>
                                <span>•</span>
                                <span>{durations[index] ?? '...'}</span>
                                <span>•</span>
                                <span>{route.highway}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
