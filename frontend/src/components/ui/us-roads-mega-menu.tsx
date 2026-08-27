'use client';

import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface UsRoadsMenuProps {
    className?: string;
}

const usRoads = [
    { name: 'I-5 Weather', route: '/roads/i-5' },
    { name: 'I-10 Weather', route: '/roads/i-10' },
    { name: 'I-15 Weather', route: '/roads/i-15' },
    { name: 'I-20 Weather', route: '/roads/i-20' },
    { name: 'I-25 Weather', route: '/roads/i-25' },
    { name: 'I-29 Weather', route: '/roads/i-29' },
    { name: 'I-30 Weather', route: '/roads/i-30' },
    { name: 'I-35 Weather', route: '/roads/i-35' },
    { name: 'I-40 Weather', route: '/roads/i-40' },
    { name: 'I-44 Weather', route: '/roads/i-44' },
    { name: 'I-45 Weather', route: '/roads/i-45' },
    { name: 'I-49 Weather', route: '/roads/i-49' },
    { name: 'I-55 Weather', route: '/roads/i-55' },
    { name: 'I-57 Weather', route: '/roads/i-57' },
    { name: 'I-64 Weather', route: '/roads/i-64' },
    { name: 'I-65 Weather', route: '/roads/i-65' },
    { name: 'I-69 Weather', route: '/roads/i-69' },
    { name: 'I-70 Weather', route: '/roads/i-70' },
    { name: 'I-71 Weather', route: '/roads/i-71' },
    { name: 'I-74 Weather', route: '/roads/i-74' },
    { name: 'I-75 Weather', route: '/roads/i-75' },
    { name: 'I-76 Weather', route: '/roads/i-76' },
    { name: 'I-77 Weather', route: '/roads/i-77' },
    { name: 'I-80 Weather', route: '/roads/i-80' },
    { name: 'I-81 Weather', route: '/roads/i-81' },
    { name: 'I-84 Weather', route: '/roads/i-84' },
    { name: 'I-85 Weather', route: '/roads/i-85' },
    { name: 'I-87 Weather', route: '/roads/i-87' },
    { name: 'I-90 Weather', route: '/roads/i-90' },
    { name: 'I-91 Weather', route: '/roads/i-91' },
    { name: 'I-94 Weather', route: '/roads/i-94' },
    { name: 'I-95 Weather', route: '/roads/i-95' },
    { name: 'I-96 Weather', route: '/roads/i-96' },
    { name: 'I-495 Weather', route: '/roads/i-495' },
    { name: 'I-495 East Weather', route: '/roads/i-495-east' },
    { name: 'I-495 West Weather', route: '/roads/i-495-west' },
    { name: 'Route 66 Weather', route: '/roads/route-66' },
    { name: 'Pacific Coast Highway Weather', route: '/roads/pacific-coast-highway' },
    { name: 'I-8 Weather', route: '/roads/i-8' },
    { name: 'I-12 Weather', route: '/roads/i-12' },
    { name: 'I-17 Weather', route: '/roads/i-17' },
    { name: 'I-22 Weather', route: '/roads/i-22' },
    { name: 'I-24 Weather', route: '/roads/i-24' },
    { name: 'I-26 Weather', route: '/roads/i-26' },
    { name: 'I-37 Weather', route: '/roads/i-37' },
    { name: 'I-43 Weather', route: '/roads/i-43' },
    { name: 'I-59 Weather', route: '/roads/i-59' },
    { name: 'I-73 Weather', route: '/roads/i-73' },
    { name: 'I-78 Weather', route: '/roads/i-78' },
    { name: 'I-79 Weather', route: '/roads/i-79' },
    { name: 'I-86 Weather', route: '/roads/i-86' },
    { name: 'I-88 Weather', route: '/roads/i-88' },
    { name: 'I-93 Weather', route: '/roads/i-93' },
    { name: 'I-95 South Weather', route: '/roads/i-95-south' },
] as const;

// Split roads into 3 columns for desktop
const column1 = usRoads.slice(0, 18);
const column2 = usRoads.slice(18, 36);
const column3 = usRoads.slice(36);

export function UsRoadsMegaMenu({ className }: UsRoadsMenuProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isMobileOpen, setIsMobileOpen] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLDivElement>(null);
    const timeoutRef = React.useRef<number | null>(null);

    // Desktop hover handling
    const handleMouseEnter = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 150);
    };

    // Mobile toggle handling
    const handleMobileToggle = () => {
        setIsMobileOpen(!isMobileOpen);
    };

    // Clean up timeout on unmount
    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <>
            {/* Desktop Menu */}
            <div
                ref={triggerRef}
                className="hidden md:block relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <button
                    className={cn(
                        'hover:bg-gray-100 rounded-md px-4 py-2 text-sm font-medium flex items-center gap-1 transition-colors',
                        className
                    )}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                >
                    US ROADS
                    <svg
                        className={cn(
                            'w-4 h-4 transition-transform duration-200',
                            isOpen ? 'rotate-180' : ''
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </button>

                {isOpen && (
                    <div
                        ref={menuRef}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        className="absolute top-full right-0 mt-1 min-w-[450px] bg-white rounded-lg border border-gray-200 shadow-lg z-50 animate-in fade-in-0 zoom-in-95 duration-200"
                    >
                        <div className="p-2 grid grid-cols-3 gap-x-4 gap-y-0.5">
                            {/* Column 1 */}
                            <div className="space-y-0">
                                <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                    Interstate Highways
                                </h3>
                                {column1.map((road) => (
                                    <Link
                                        key={road.name}
                                        to={road.route}
                                        className="block text-xs text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded px-1.5 py-0.5 transition-colors"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        {road.name}
                                    </Link>
                                ))}
                            </div>

                            {/* Column 2 */}
                            <div className="space-y-0">
                                <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                    Regional Routes
                                </h3>
                                {column2.map((road) => (
                                    <Link
                                        key={road.name}
                                        to={road.route}
                                        className="block text-xs text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded px-1.5 py-0.5 transition-colors"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        {road.name}
                                    </Link>
                                ))}
                            </div>

                            {/* Column 3 */}
                            <div className="space-y-0">
                                <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                    Major Corridors
                                </h3>
                                {column3.map((road) => (
                                    <Link
                                        key={road.name}
                                        to={road.route}
                                        className="block text-xs text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded px-1.5 py-0.5 transition-colors"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        {road.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Accordion */}
            <div className="md:hidden w-full">
                <button
                    onClick={handleMobileToggle}
                    className={cn(
                        'hover:bg-gray-100 rounded-md justify-start px-4 py-3 text-sm font-medium flex items-center justify-between w-full transition-colors',
                        className
                    )}
                    aria-expanded={isMobileOpen}
                >
                    <span>US ROADS</span>
                    <svg
                        className={cn(
                            'w-4 h-4 transition-transform duration-200',
                            isMobileOpen ? 'rotate-180' : ''
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </button>

                {isMobileOpen && (
                    <div className="bg-gray-50 rounded-md mt-1 p-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-2 gap-2">
                            {usRoads.map((road) => (
                                <Link
                                    key={road.name}
                                    to={road.route}
                                    className="block text-xs text-gray-700 hover:text-blue-600 hover:bg-white rounded px-2 py-1.5 transition-colors"
                                    onClick={() => setIsMobileOpen(false)}
                                >
                                    {road.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

UsRoadsMegaMenu.displayName = 'UsRoadsMegaMenu';