'use client';

import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Footer({ className }: { className?: string }) {
    return (
        <footer className={cn('w-full border-t border-gray-200 bg-gray-50 py-4', className)}>
            <div className="mx-auto max-w-6xl px-4">
                <div className="flex flex-col items-center justify-between gap-2 md:flex-row">
                    <p className="text-xs text-gray-500">
                        © 2026 ThermoDispatch.
                    </p>
                    <div className="flex gap-4">
                        <Link
                            to="/privacy"
                            className="text-xs text-gray-500 transition-colors hover:text-gray-700"
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            to="/terms"
                            className="text-xs text-gray-500 transition-colors hover:text-gray-700"
                        >
                            Terms
                        </Link>
                        <Link
                            to="/contact"
                            className="text-xs text-gray-500 transition-colors hover:text-gray-700"
                        >
                            Contact
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}