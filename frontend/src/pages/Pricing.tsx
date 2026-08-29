import { Link } from "react-router-dom"
import { Header } from "@/components/ui/header-1"
import { Footer } from "@/components/ui/footer"
import { PricingTable } from "@/components/ui/pricing-table"

export function Pricing() {
  return (
    <div className="w-full min-h-screen bg-white">
      <Header />
      <div className="mx-auto max-w-5xl px-4 py-16 md:py-20">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-12 transition-colors"
        >
          ← Back to Home
        </Link>
        <PricingTable />
      </div>
      <Footer />
    </div>
  )
}
