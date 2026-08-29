"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Zap, Flame, Building2 } from "lucide-react"
import { Link } from "react-router-dom"

const PLANS = [
  {
    name: "Starter",
    Icon: Zap,
    description: "For solo dispatchers getting started with heat-safe routing.",
    price: { monthly: 0, yearly: 0 },
    features: [
      "10 route analyses per month",
      "Basic heat risk scoring",
      "Standard departure recommendations",
      "Public weather data",
      "Email support",
    ],
    cta: "Get started free",
    href: "/plan",
    featured: false,
  },
  {
    name: "Fleet Pro",
    Icon: Flame,
    description: "For growing fleets that cannot afford heat-related downtime.",
    price: { monthly: 49, yearly: 490 },
    features: [
      "Unlimited route analyses",
      "Multi-stop routing (up to 5 stops)",
      "FortyGuard live heat intelligence",
      "Real-time traffic + heat overlay",
      "UV index & AQI monitoring",
      "Cooling stop recommendations",
      "Priority support",
    ],
    cta: "Start free trial",
    href: "/plan",
    featured: true,
  },
  {
    name: "Enterprise",
    Icon: Building2,
    description: "For large organizations that need custom scale and control.",
    price: { monthly: 199, yearly: 1990 },
    features: [
      "Everything in Fleet Pro",
      "Unlimited fleet size",
      "Full API access",
      "Custom jurisdiction rules",
      "SSO & team management",
      "Dedicated account manager",
      "SLA guarantee",
    ],
    cta: "Contact sales",
    href: "/contact",
    featured: false,
  },
]

const AnimatedDigit = ({ digit, index }: { digit: string; index: number }) => (
  <div className="relative overflow-hidden inline-block min-w-[0.6ch] text-center">
    <AnimatePresence mode="wait">
      <motion.span
        key={digit}
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -16, opacity: 0 }}
        transition={{ duration: 0.25, delay: index * 0.04, ease: [0.4, 0, 0.2, 1] }}
        className="block"
      >
        {digit}
      </motion.span>
    </AnimatePresence>
  </div>
)

const AnimatedPrice = ({ value }: { value: number }) => (
  <div className="flex items-center">
    {value === 0
      ? <span>Free</span>
      : value.toString().split("").map((d, i) => (
          <AnimatedDigit key={`${value}-${i}`} digit={d} index={i} />
        ))
    }
  </div>
)

export function PricingTable() {
  const [yearly, setYearly] = useState(false)

  return (
    <div className="w-full">
      {/* Header */}
      <motion.div
        className="text-center mb-12 space-y-4"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          Start free. Scale as your fleet grows. No hidden fees.
        </p>

        {/* Toggle */}
        <motion.div
          className="inline-flex items-center bg-gray-100 rounded-full p-1 mt-2"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <button
            onClick={() => setYearly(false)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              !yearly ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              yearly ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Yearly
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold">
              Save 16%
            </span>
          </button>
        </motion.div>
      </motion.div>

      {/* Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
        }}
      >
        {PLANS.map((plan) => (
          <motion.div
            key={plan.name}
            variants={{ hidden: { opacity: 0, y: 20, scale: 0.96 }, visible: { opacity: 1, y: 0, scale: 1 } }}
            className="relative"
          >
            {plan.featured && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-gray-900 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-md">
                  Most Popular
                </span>
              </div>
            )}

            <div
              className={`relative h-full flex flex-col rounded-2xl border-2 p-7 transition-all duration-300 ${
                plan.featured
                  ? "border-gray-900 bg-gray-900 text-white shadow-2xl"
                  : "border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:shadow-md"
              }`}
            >
              {/* Plan header */}
              <div className="mb-6">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4 ${
                  plan.featured ? "bg-white/10" : "bg-gray-100"
                }`}>
                  <plan.Icon className={`w-5 h-5 ${plan.featured ? "text-orange-400" : "text-gray-600"}`} />
                </div>
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className={`text-sm ${plan.featured ? "text-gray-300" : "text-gray-500"}`}>
                  {plan.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1 text-4xl font-bold">
                  {plan.price.monthly > 0 && <span>$</span>}
                  <AnimatedPrice value={yearly ? Math.round(plan.price.yearly / 12) : plan.price.monthly} />
                  {plan.price.monthly > 0 && (
                    <span className={`text-base font-normal ${plan.featured ? "text-gray-400" : "text-gray-400"}`}>
                      /mo
                    </span>
                  )}
                </div>
                {yearly && plan.price.yearly > 0 && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-xs mt-1 ${plan.featured ? "text-gray-400" : "text-gray-400"}`}
                  >
                    ${plan.price.yearly} billed annually · save ${plan.price.monthly * 12 - plan.price.yearly}
                  </motion.p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.featured ? "text-orange-400" : "text-gray-400"}`} />
                    <span className={`text-sm ${plan.featured ? "text-gray-200" : "text-gray-600"}`}>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                to={plan.href}
                className={`block w-full text-center py-3 px-6 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  plan.featured
                    ? "bg-white text-gray-900 hover:bg-gray-100"
                    : "border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
