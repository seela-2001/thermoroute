'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

interface FaqItem {
    question: string;
    answer: string;
}

const faqs: FaqItem[] = [
    {
        question: 'What is ThermoDispatch?',
        answer: 'ThermoDispatch is a heat-aware route planning platform built for logistics crews and fleet operators. It analyzes real-time and forecasted temperature, humidity, UV index, and air quality along your route.then recommends the safest departure window and coolest path to your destination.',
    },
    {
        question: 'How does the heat analysis work?',
        answer: 'We sample weather conditions at multiple points along your route for every possible departure time in your window. Each point is evaluated for temperature, heat index, humidity, UV, and precipitation probability. The route is then scored and ranked so you can compare departure times side-by-side and pick the one with the lowest heat exposure.',
    },
    {
        question: 'How accurate is the weather data?',
        answer: 'Weather data is sourced from live forecast APIs with hourly resolution. Forecasts are most reliable within 48–72 hours. For same-day and next-day trips the data is highly accurate; for trips further out, treat the scores as directional guidance rather than exact readings.',
    },
    {
        question: 'What departure window should I choose?',
        answer: 'We recommend a 12-hour window centered around your preferred travel time. This gives ThermoDispatch enough departure slots to find the optimal window.typically early morning or after sunset for hot-weather regions. You can narrow the window if your schedule is fixed.',
    },
    {
        question: 'Can I plan routes with multiple stops?',
        answer: 'Yes. You can add up to 5 intermediate stops between your origin and destination. Each stop is factored into the heat analysis, and the cumulative heat exposure across the full trip is scored for every departure time.',
    },
    {
        question: 'Which regions are supported?',
        answer: 'ThermoDispatch covers the United States only. All heat data, routing, and analysis are built around U.S. locations. Routes or points outside the U.S. are not supported and will return empty results.please keep your origin, destination, and stops within the continental United States.',
    },
    {
        question: 'What does the route gradient on the map show?',
        answer: 'The colored line on the map reflects the heat intensity at each point along your route for the selected departure time. Green means cooler conditions, yellow is moderate, orange is warm, and red flags the hottest segments.so you can see exactly where heat exposure peaks during the drive.',
    },
    {
        question: 'Can I use ThermoDispatch for personal trips, not just fleets?',
        answer: 'Absolutely. Whether you\'re moving a household, driving cross-country with pets, or planning a road trip through the Southwest in July, ThermoDispatch helps you choose the coolest and safest time to leave.no fleet account required.',
    },
];

export function Faq() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="w-full bg-white py-16 md:py-24">
            <div className="mx-auto max-w-3xl px-4">
                {/* Header */}
                <div className="mb-12 text-center">
                    <span className="inline-block rounded-full bg-orange-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-orange-500 mb-4">
                        FAQ
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-3">
                        Frequently asked questions
                    </h2>
                    <p className="text-gray-500 text-base max-w-xl mx-auto">
                        Everything you need to know about heat-aware routing and how ThermoDispatch keeps your crew moving safely.
                    </p>
                </div>

                {/* Accordion */}
                <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    {faqs.map((faq, index) => {
                        const isOpen = openIndex === index;
                        return (
                            <div key={index} className="bg-white">
                                <button
                                    onClick={() => setOpenIndex(isOpen ? null : index)}
                                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-orange-50/40"
                                >
                                    <span className={`text-sm font-semibold leading-snug transition-colors ${isOpen ? 'text-orange-500' : 'text-gray-900'}`}>
                                        {faq.question}
                                    </span>
                                    <span className={`flex-shrink-0 rounded-full p-1 transition-colors ${isOpen ? 'bg-orange-100 text-orange-500' : 'bg-gray-100 text-gray-400'}`}>
                                        {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                                    </span>
                                </button>

                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div
                                            key="content"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.22, ease: 'easeInOut' }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <p className="px-6 pb-5 text-sm leading-relaxed text-gray-500">
                                                {faq.answer}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
