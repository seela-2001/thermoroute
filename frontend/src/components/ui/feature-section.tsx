'use client';

import { Check } from 'lucide-react';

export function FeatureSection() {
  return (
    <section className="w-full bg-white py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:gap-16">
          {/* Left Column */}
          <div className="flex flex-col gap-6 md:w-1/2">
            {/* Eyebrow */}
            <p className="text-xs font-semibold tracking-widest text-orange-500 uppercase">
              WHAT IT DOES BEST
            </p>

            {/* Headline */}
            <h2 className="text-2xl font-bold leading-tight text-gray-900 md:text-3xl">
              Know which route keeps<br />
              your crew cooler.
            </h2>

            {/* Description */}
            <p className="text-base leading-relaxed text-gray-600">
              Every route is analyzed for street-level heat exposure, humidity, UV index, and air quality at each mile. ThermoDispatch scores every departure window and recommends the route and time that minimizes heat stress on your crew from start to finish.
            </p>

            {/* Feature List */}
            <div className="flex flex-col gap-3">
              {[
                'Street-level heat index across every route segment',
                'Hour-by-hour heat risk scored for each departure time',
                'Fuel and rest stops identified along the route',
                'POI stops: fuel, hospitals, shade, and cooling spots',
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
                  <p className="text-base text-gray-700">{feature}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6 md:w-1/2">
            {/* Heat Route Card */}
            <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-5 shadow-lg shadow-orange-100/60">
              {/* Route Header */}
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">Phoenix, AZ</span>
                <span className="text-gray-400">→</span>
                <span className="text-sm font-medium text-gray-800">Tucson, AZ</span>
              </div>

              {/* Times */}
              <div className="mb-4 flex items-center justify-between text-xs text-gray-600">
                <span>6:00a Wed</span>
                <span>7:50a Wed</span>
              </div>

              {/* Timeline */}
              <div className="mb-4">
                {/* Colored segments bar */}
                <div className="relative mb-2 flex h-3 w-full rounded-full overflow-hidden">
                  {/* Cool early morning */}
                  <div className="h-full bg-emerald-400" style={{ width: '40%' }} />
                  {/* Warming up */}
                  <div className="h-full bg-amber-400" style={{ width: '35%' }} />
                  {/* Hot segment near Tucson midday */}
                  <div className="h-full bg-orange-500" style={{ width: '25%' }} />
                </div>

                {/* Circular markers */}
                <div className="relative mb-2 h-2">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                  <div className="absolute left-[40%] top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-white bg-amber-400" />
                  <div className="absolute left-[75%] top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-white bg-orange-500" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-white bg-orange-500" />
                </div>

                {/* Time labels */}
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>6:00a</span>
                  <span>7:00a</span>
                  <span>7:50a</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white/70 px-2 py-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Peak temp</p>
                  <p className="text-sm font-bold text-orange-500">102°F</p>
                </div>
                <div className="rounded-lg bg-white/70 px-2 py-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Heat index</p>
                  <p className="text-sm font-bold text-amber-500">108°F</p>
                </div>
                <div className="rounded-lg bg-white/70 px-2 py-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Best window</p>
                  <p className="text-sm font-bold text-emerald-500">5:00a</p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-sm bg-emerald-400" />
                  <span className="text-gray-600">Cool</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-sm bg-amber-400" />
                  <span className="text-gray-600">Warm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-sm bg-orange-500" />
                  <span className="text-gray-600">Hot</span>
                </div>
              </div>
            </div>

            {/* Bottom Paragraph */}
            <p className="text-base leading-relaxed text-gray-900">
              <span className="font-semibold">That's the whole picture.</span> Leave at 6am and you catch the cool stretch before the desert heats up. Wait until 9am and you're driving I-10 at peak UV with a 108°F heat index on your crew. You didn't read a single chart.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
