import { Routes, Route } from "react-router-dom"
import { Header } from "@/components/ui/header-1"
import { Hero } from "@/components/ui/animated-hero"
import { FeatureSection } from "@/components/ui/feature-section"
import { PopularRoutes } from "@/components/ui/popular-routes"
import { Footer } from "@/components/ui/footer"
import { RoutePlanner } from "@/pages/RoutePlanner"

const LandingPage = () => {
  return (
    <div className="w-full">
      <Header />
      <Hero />
      <FeatureSection />
      <PopularRoutes />
      <Footer />
    </div>
  )
}

const App = () => {
  return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/plan" element={<RoutePlanner />} />
      </Routes>
  )
}

export default App
