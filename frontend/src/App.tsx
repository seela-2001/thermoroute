import { Routes, Route } from "react-router-dom"
import { Header } from "@/components/ui/header-1"
import { Hero } from "@/components/ui/animated-hero"
import { FeatureSection } from "@/components/ui/feature-section"
import { HowPeopleUse } from "@/components/ui/how-people-use"
import { PopularRoutes } from "@/components/ui/popular-routes"
import { Faq } from "@/components/ui/faq"
import { Footer } from "@/components/ui/footer"
import { RoutePlanner } from "@/pages/RoutePlanner"
import { Privacy } from "@/pages/Privacy"
import { Terms } from "@/pages/Terms"
import { Contact } from "@/pages/Contact"

const LandingPage = () => {
  return (
    <div className="w-full">
      <Header />
      <Hero />
      <FeatureSection />
      <HowPeopleUse />
      <PopularRoutes />
      <Faq />
      <Footer />
    </div>
  )
}

const App = () => {
  return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/plan" element={<RoutePlanner />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
  )
}

export default App
