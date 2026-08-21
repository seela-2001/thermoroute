'use client';
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import { useScroll } from '@/components/ui/use-scroll';
import { createPortal } from 'react-dom';
import logo from '@/components/ui/images/642e6491-fdc6-4250-bf22-1af5448a877b.png';

export function Header() {
    const [open, setOpen] = React.useState(false);
    const scrolled = useScroll(10);

    const links = [
        {
            label: 'Features',
            href: '#',
        },
        {
            label: 'Pricing',
            href: '#',
        },
        {
            label: 'Blog',
            href: '#',
        },
    ];

    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    return (
        <header
            className={cn('sticky top-0 z-50 w-full border-b border-gray-200', {
                'bg-white/95 supports-[backdrop-filter]:bg-white/50 backdrop-blur-lg':
                    scrolled,
            })}
        >
            <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4">
                <Link to="/" className="rounded-md p-1 ">
                    <img src={logo} alt="Logo" className="h-18 w-auto" />
                </Link>
                <div className="hidden items-center gap-2 md:flex">
                    {links.map((link) => (
                        <a key={link.label} className="hover:bg-gray-100 rounded-md px-4 py-2 text-sm font-medium" href={link.href}>
                            {link.label}
                        </a>
                    ))}
                    <Button>Get Started</Button>
                </div>
                <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setOpen(!open)}
                    className="md:hidden"
                    aria-expanded={open}
                    aria-controls="mobile-menu"
                    aria-label="Toggle menu"
                >
                    <MenuToggleIcon open={open} className="size-5" duration={300} />
                </Button>
            </nav>
            <MobileMenu open={open} className="flex flex-col justify-between gap-2">
                <div className="grid gap-y-2">
                    {links.map((link) => (
                        <a
                            key={link.label}
                            className="hover:bg-gray-100 rounded-md justify-start px-4 py-2 text-sm font-medium"
                            href={link.href}
                        >
                            {link.label}
                        </a>
                    ))}
                </div>
                <div className="flex flex-col gap-2">
                    <Button variant="outline" className="w-full">
                        Sign In
                    </Button>
                    <Button className="w-full">Get Started</Button>
                </div>
            </MobileMenu>
        </header>
    );
}

type MobileMenuProps = React.ComponentProps<'div'> & {
    open: boolean;
};

function MobileMenu({ open, children, className, ...props }: MobileMenuProps) {
    if (!open || typeof window === 'undefined') return null;

    return createPortal(
        <div
            id="mobile-menu"
            className={cn(
                'bg-white/95 supports-[backdrop-filter]:bg-white/50 backdrop-blur-lg',
                'fixed top-14 right-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden border-y border-gray-200 md:hidden',
            )}
        >
            <div
                data-slot={open ? 'open' : 'closed'}
                className={cn(
                    'data-[slot=open]:animate-in data-[slot=open]:zoom-in-97 ease-out',
                    'size-full p-4',
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        </div>,
        document.body,
    );
}
