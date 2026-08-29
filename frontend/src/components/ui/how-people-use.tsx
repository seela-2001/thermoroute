'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Sun, Map, Users } from 'lucide-react';

interface UseCase {
    icon: React.ReactNode;
    category: string;
    quote: string;
    description: string;
    cta: string;
}

const cases: UseCase[] = [
    {
        icon: <Truck className="w-5 h-5" />,
        category: 'Fleet Dispatchers',
        quote: '"How do I get my crew through Phoenix in August?"',
        description:
            'Your drivers are heading into triple-digit heat. ThermoDispatch maps the heat index at every mile, identifies the hottest segments, and tells you which departure window keeps your crew in the safest temperature range. No guesswork.just a clear answer before the wheels turn.',
        cta: 'Plan the coolest route now.',
    },
    {
        icon: <Sun className="w-5 h-5" />,
        category: 'Long-Haul Drivers',
        quote: '"Should I drive through the desert at noon or wait until evening?"',
        description:
            'That stretch of I-10 through the Sonoran Desert hits 115°F at 2pm but drops to 95°F by 8pm. ThermoDispatch scores every departure hour in your window and shows you the temperature difference at each point along the route.so you can decide whether waiting is worth it.',
        cta: 'See the heat by departure time.',
    },
    {
        icon: <Map className="w-5 h-5" />,
        category: 'Road Trip Planners',
        quote: '"We\'re driving from Dallas to LA.when\'s the best time to leave?"',
        description:
            'A summer road trip through West Texas and New Mexico can mean 6 hours of intense sun exposure if you leave at the wrong time. ThermoDispatch analyzes the full corridor, picks the coolest departure window, and highlights cooling stops along the way so you arrive refreshed.',
        cta: 'Find your coolest departure window.',
    },
    {
        icon: <Users className="w-5 h-5" />,
        category: 'Safety Managers',
        quote: '"Which route keeps my outdoor crew at lower heat risk today?"',
        description:
            'When two routes cover the same distance, the difference in heat exposure can be significant. ThermoDispatch compares routes not just by time but by heat index, UV, humidity, and air quality.and recommends the one that minimizes heat stress on your team throughout the day.',
        cta: 'Compare routes by heat risk.',
    },
];

export function HowPeopleUse() {
    const [active, setActive] = useState(0);
    const current = cases[active];

    return (
        <section className="w-full bg-white py-16 md:py-24 border-t border-gray-100">
            <div className="mx-auto max-w-6xl px-4">
                {/* Header */}
                <div className="mb-12 text-center">
                    <span className="inline-block rounded-full bg-orange-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-orange-500 mb-4">
                        Real use cases
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-3">
                        How people actually use this
                    </h2>
                    <p className="text-gray-500 text-base max-w-xl mx-auto">
                        Real problems. Real solutions.
                    </p>
                </div>

                <div className="grid md:grid-cols-5 gap-8 items-start">
                    {/* Tabs */}
                    <div className="md:col-span-2 flex flex-col gap-2">
                        {cases.map((c, i) => (
                            <button
                                key={i}
                                onClick={() => setActive(i)}
                                className={`flex items-center gap-3 w-full text-left px-4 py-3.5 rounded-xl transition-all duration-150 ${
                                    active === i
                                        ? 'bg-orange-50 border border-orange-200 text-orange-600'
                                        : 'border border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                }`}
                            >
                                <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${active === i ? 'bg-orange-100 text-orange-500' : 'bg-gray-100 text-gray-400'}`}>
                                    {c.icon}
                                </span>
                                <span className="font-semibold text-sm">{c.category}</span>
                            </button>
                        ))}
                    </div>

                    {/* Content panel */}
                    <div className="md:col-span-3">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={active}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                className="bg-gray-50 rounded-2xl border border-gray-100 p-8"
                            >
                                <p className="text-lg md:text-xl font-semibold text-gray-900 mb-4 leading-snug">
                                    {current.quote}
                                </p>
                                <p className="text-gray-500 leading-relaxed mb-6">
                                    {current.description}
                                </p>
                                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-500">
                                    {current.cta}
                                </span>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
}
