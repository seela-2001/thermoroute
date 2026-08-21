import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PhoneCall } from "lucide-react";
import bg1 from '@/components/ui/images/background (1).jpg';
import bg2 from '@/components/ui/images/background (2).jpg';
import bg3 from '@/components/ui/images/background (3).jpg';
import bg4 from '@/components/ui/images/background (4).jpg';
import bg5 from '@/components/ui/images/background (5).jpg';
import bg6 from '@/components/ui/images/background (6).jpg';

// ROW 1 - Uses background images 1-2 (duplicated)
const row1Images = [
  bg1, bg2, bg1, bg2, bg1, bg2,
];

// ROW 2 - Uses background images 3-4 (duplicated)
const row2Images = [
  bg3, bg4, bg3, bg4, bg3, bg4,
];

// ROW 3 - Uses background images 5-6 (duplicated)
const row3Images = [
  bg5, bg6, bg5, bg6, bg5, bg6,
];

// ROW 4 - Uses all 6 background images
const row4Images = [
  bg1, bg2, bg3, bg4, bg5, bg6,
];

// Card width variants for visual variety
const cardWidths = ['w-36', 'w-44', 'w-40', 'w-48', 'w-38', 'w-42'];

// Row configuration with local background images and alternating directions
const rows = [
  { images: row1Images, direction: 'left' },
  { images: row2Images, direction: 'right' },
  { images: row3Images, direction: 'left' },
  { images: row4Images, direction: 'right' },
];

// Helper to duplicate images for seamless animation
const createAnimatedSet = (images: string[], count = 3) => {
  const set: string[] = [];
  for (let i = 0; i < count; i++) {
    set.push(...images);
  }
  return set;
};

function Hero() {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["Safer.", "Cooler", "Smarter"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="relative w-full bg-white overflow-hidden">
      {/* Full Hero Background Layer - Image Mosaic */}
      <div className="absolute inset-0 z-0 flex flex-col pointer-events-none overflow-hidden">

        {/* Row 1 - Long-Distance Roads - Moves LEFT */}
        <div className="h-1/4 w-full overflow-hidden">
          <div className="flex animate-scroll-left flex-nowrap h-full">
            {createAnimatedSet(rows[0].images, 4).map((src, index) => (
              <img
                key={`row1-${index}`}
                src={src}
                alt=""
                loading="eager"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className={`flex-shrink-0 h-full ${cardWidths[index % cardWidths.length]} rounded-2xl object-cover opacity-40`}
                style={{ marginRight: '10px' }}
              />
            ))}
          </div>
        </div>

        {/* Row 2 - Extreme Heat - Moves RIGHT */}
        <div className="h-1/4 w-full overflow-hidden">
          <div className="flex animate-scroll-right flex-nowrap h-full">
            {createAnimatedSet(rows[1].images, 4).map((src, index) => (
              <img
                key={`row2-${index}`}
                src={src}
                alt=""
                loading="eager"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className={`flex-shrink-0 h-full ${cardWidths[(index + 1) % cardWidths.length]} rounded-2xl object-cover opacity-40`}
                style={{ marginRight: '10px' }}
              />
            ))}
          </div>
        </div>

        {/* Row 3 - Weather + Road Conditions - Moves LEFT */}
        <div className="h-1/4 w-full overflow-hidden">
          <div className="flex animate-scroll-left flex-nowrap h-full">
            {createAnimatedSet(rows[2].images, 4).map((src, index) => (
              <img
                key={`row3-${index}`}
                src={src}
                alt=""
                loading="eager"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className={`flex-shrink-0 h-full ${cardWidths[(index + 2) % cardWidths.length]} rounded-2xl object-cover opacity-40`}
                style={{ marginRight: '10px' }}
              />
            ))}
          </div>
        </div>

        {/* Row 4 - Routes + Infrastructure - Moves RIGHT */}
        <div className="h-1/4 w-full overflow-hidden">
          <div className="flex animate-scroll-right flex-nowrap h-full">
            {createAnimatedSet(rows[3].images, 4).map((src, index) => (
              <img
                key={`row4-${index}`}
                src={src}
                alt=""
                loading="eager"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className={`flex-shrink-0 h-full ${cardWidths[(index + 3) % cardWidths.length]} rounded-2xl object-cover opacity-40`}
                style={{ marginRight: '10px' }}
              />
            ))}
          </div>
        </div>

        {/* Left Purple Gradient Overlay - Full Height */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-100/60 via-purple-50/40 to-transparent pointer-events-none" />

        {/* Subtle White Fade Overlay */}
        <div className="absolute inset-0 bg-white/20 pointer-events-none" />

        <style>{`
          @keyframes scroll-left {
            0% { transform: translateX(0); }
            100% { transform: translateX(-25%); }
          }

          @keyframes scroll-right {
            0% { transform: translateX(-25%); }
            100% { transform: translateX(0); }
          }

          .animate-scroll-left {
            animation: scroll-left 35s ease-in-out infinite;
          }

          .animate-scroll-right {
            animation: scroll-right 38s ease-in-out infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            .animate-scroll-left,
            .animate-scroll-right {
              animation: none;
            }
          }
        `}</style>
      </div>

      {/* Hero Content - Positioned Above Background */}
      <div className="container mx-auto relative z-10 pointer-events-none">
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">
          <div className="flex gap-4 flex-col pointer-events-auto">
            <h1 className="text-5xl md:text-7xl max-w-2xl tracking-tighter text-center font-regular">
              <span className="text-gray-900">Keep crews moving.</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-semibold"
                    initial={{ opacity: 0, y: "-100" }}
                    transition={{ type: "spring", stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? {
                            y: 0,
                            opacity: 1,
                          }
                        : {
                            y: titleNumber > index ? -150 : 150,
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
            </h1>

            <p className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center">
              When extreme heat disrupts the schedule, ThermoDispatch finds the best recovery plan for crews, routes, and customer commitments.
            </p>
          </div>
          <div className="flex flex-row gap-3 pointer-events-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
              className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors h-11 rounded-md px-8 border border-gray-300 bg-white hover:bg-gray-100"
            >
              Book a demo <PhoneCall className="w-4 h-4 ml-2" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
              className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors h-11 rounded-md px-8 bg-gray-900 text-white hover:bg-gray-800"
            >
              Try it right here
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Hero };
