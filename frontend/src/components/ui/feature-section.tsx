'use client';

// import React from 'react';
import { Check } from 'lucide-react';

export function FeatureSection() {
  return (
    <section className="w-full bg-white py-16 md:py-14">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:gap-16">
          {/* Left Column */}
          <div className="flex flex-col gap-6 md:w-1/2">
            {/* Eyebrow */}
            <p className="text-xs font-semibold tracking-widest text-indigo-600 uppercase">
              WHAT IT DOES BEST
            </p>

            {/* Headline */}
            <h2 className="text-2xl font-bold leading-tight text-gray-900 md:text-3xl">
              Know which route keeps<br />
              your crew cooler.
            </h2>

            {/* Description */}
            <p className="text-base leading-relaxed text-gray-600">
              Every route is analyzed for street-level heat exposure, weather conditions, road visibility, and stopping opportunities. ThermoDispatch compares the alternatives and recommends the route that keeps your crew safer and more comfortable.
            </p>

            {/* Feature List */}
            <div className="flex flex-col gap-3">
              {[
                'Street-level heat exposure across every route segment',
                'Hour-by-hour heat risk from departure to arrival',
                'Contextual fuel and rest stops along the journey',
                'Road cameras and weather conditions on relevant segments',
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <p className="text-base text-gray-700">{feature}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6 md:w-1/2">
            {/* Purple Forecast Card */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-5 shadow-lg shadow-indigo-200/50">
              {/* Route Header */}
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">Denver, CO</span>
                <span className="text-gray-400">→</span>
                <span className="text-sm font-medium text-gray-800">Kansas City, MO</span>
              </div>

              {/* Times */}
              <div className="mb-4 flex items-center justify-between text-xs text-gray-600">
                <span>9:30a Wed</span>
                <span>6:06p Wed</span>
              </div>

              {/* Timeline */}
              <div className="mb-4">
                {/* Colored segments bar */}
                <div className="relative mb-2 flex h-3 w-full rounded-full overflow-hidden">
                  {/* Clear segment - green */}
                  <div className="h-full bg-emerald-400" style={{ width: '45%' }} />
                  {/* Caution segment - orange/yellow */}
                  <div className="h-full bg-amber-400" style={{ width: '35%' }} />
                  {/* Severe segment - pink/red */}
                  <div className="h-full bg-rose-500" style={{ width: '20%' }} />
                </div>

                {/* Circular markers */}
                <div className="relative mb-2 h-2">
                  {/* Start marker */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                  {/* Caution transition marker */}
                  <div className="absolute left-[45%] top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-white bg-amber-400" />
                  {/* Severe transition marker */}
                  <div className="absolute left-[80%] top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-white bg-rose-500" />
                  {/* End marker */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                </div>

                {/* Time labels */}
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>1:00p</span>
                  <span>3:00p</span>
                  <span>6:00p</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-sm bg-emerald-400" />
                  <span className="text-gray-600">Clear</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-sm bg-amber-400" />
                  <span className="text-gray-600">Caution</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-sm bg-rose-500" />
                  <span className="text-gray-600">Severe</span>
                </div>
              </div>
            </div>

            {/* Bottom Paragraph */}
            <p className="text-base leading-relaxed text-gray-900">
              <span className="font-semibold">That's the whole trip.</span> Leave at 9:30 and you're in storms by three, near Salina, for two hours - then clear into Kansas City. You didn't read a single number.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}