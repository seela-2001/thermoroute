import { Header } from "@/components/ui/header-1"
import { Hero } from "@/components/ui/animated-hero"
import { FeatureSection } from "@/components/ui/feature-section"
import { UseCasesSection } from "@/components/ui/use-cases-section"
import { PopularRoutes } from "@/components/ui/popular-routes"
import { FAQ } from "@/components/ui/faq-section"
import { Footer } from "@/components/ui/footer"
import PoweredBy from "@/components/ui/power-by"

const App = () => {
  return (
    <div className="w-full">
      <Header />
      <Hero />
      <PoweredBy/>
      <FeatureSection />
      <UseCasesSection />
      <PopularRoutes />
      <FAQ />
      <Footer />
    </div>
  )
}

export default App

