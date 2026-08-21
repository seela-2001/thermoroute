'use client';

import { cn } from '@/lib/utils';

interface UseCase {
  category: string;
  title: string;
  description: string;
  bottomText: string;
  featured?: boolean;
}

const useCases: UseCase[] = [
  {
    category: 'COMMUTERS',
    title: '"Should I leave early tomorrow?"',
    description: 'Save your commute. Each morning, glance at conditions. Winter storm overnight? You\'ll see it. Construction starting today? You\'ll know. No manual checking—get alerted when conditions turn bad.',
    bottomText: 'Pin your route once, check conditions forever.',
  },
  {
    category: 'WEEKEND TRIPS',
    title: '"What time should we leave Saturday?"',
    description: 'That mountain pass looks clear at 8am but gets icy by 2pm. Or vice versa—mornings fog clears by noon. See conditions timed to when you\'ll actually be there, not just "weather at destination."',
    bottomText: 'Leave at the right time. Arrive safely.',
  },
  {
    category: 'VISITING FAMILY',
    title: '"Is the drive to Mom\'s okay this weekend?"',
    description: 'Save the route to your parents, in-laws, or kids at college. Before holiday trips, check conditions in one tap. Accidents, construction, and weather—all in one view.',
    bottomText: 'Subscribe to alerts. We\'ll warn you when it matters.',
  },
  {
    category: 'SKIP THE AIRPORT',
    title: '"Flights are $800. What can we drive to?"',
    description: 'With rising fuel and airfare costs, the best vacations are closer than you think. Find amazing getaways within driving distance—with weather and road conditions for every mile.',
    bottomText: 'Discover weekend getaways near you →',
    featured: true,
  },
];

interface UseCaseCardProps {
  useCase: UseCase;
}

function UseCaseCard({ useCase }: UseCaseCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border p-5',
        useCase.featured
          ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50'
          : 'border-gray-200 bg-gray-50/50'
      )}
    >
      {/* Category Label */}
      <p className="mb-3 text-[10px] font-semibold tracking-widest text-orange-500 uppercase">
        {useCase.category}
      </p>

      {/* Title */}
      <h3 className="mb-3 text-base font-semibold leading-snug text-gray-900">
        {useCase.title}
      </h3>

      {/* Description */}
      <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-600">
        {useCase.description}
      </p>

      {/* Bottom Text */}
      <p className="text-xs italic text-gray-500">
        {useCase.bottomText}
      </p>
    </div>
  );
}

export function UseCasesSection() {
  return (
    <section className="w-full bg-white py-16 md:py-15">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="mb-10 md:mb-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl lg:text-4xl">
            How People Actually Use This
          </h2>
          <p className="mt-2.5 text-sm text-slate-500 md:text-base">
            Real problems. Real solutions.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {useCases.map((useCase) => (
            <UseCaseCard key={useCase.category} useCase={useCase} />
          ))}
        </div>
      </div>
    </section>
  );
}