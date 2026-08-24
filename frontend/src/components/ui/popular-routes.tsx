'use client';


interface Route {
    from: string;
    to: string;
    miles: string;
    time: string;
    stops: string;
}

const routes: Route[] = [
    { from: 'Dallas, TX', to: 'Austin, TX', miles: '182 miles', time: '2h 50m', stops: '3 stops' },
    { from: 'Los Angeles, CA', to: 'Las Vegas, NV', miles: '270 miles', time: '4h 00m', stops: '2 stops' },
    { from: 'Chicago, IL', to: 'Detroit, MI', miles: '281 miles', time: '4h 45m', stops: '4 stops' },
    { from: 'Miami, FL', to: 'Orlando, FL', miles: '235 miles', time: '3h 45m', stops: '3 stops' },
    { from: 'New York, NY', to: 'Boston, MA', miles: '215 miles', time: '3h 45m', stops: '2 stops' },
    { from: 'Calgary, AB', to: 'Banff, AB', miles: '80 miles', time: '1h 20m', stops: '2 stops' },
];

export function PopularRoutes() {
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
                            className="group flex cursor-pointer flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-600 hover:-translate-y-0.5 hover:shadow-md"
                            style={{ transition: 'all 180ms ease' }}
                        >
                            <div className="flex items-center text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-180 ease">
                                {route.from}
                                <span className="mx-2 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all duration-180 ease">→</span>
                                {route.to}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>{route.miles}</span>
                                <span>•</span>
                                <span>{route.time}</span>
                                <span>•</span>
                                <span>{route.stops}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
