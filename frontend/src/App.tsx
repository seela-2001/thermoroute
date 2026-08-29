import { lazy, Suspense } from "react"
import { Routes, Route } from "react-router-dom"
import { Header } from "@/components/ui/header-1"
import { Hero } from "@/components/ui/animated-hero"
import { FeatureSection } from "@/components/ui/feature-section"
import { HowPeopleUse } from "@/components/ui/how-people-use"
import { PopularRoutes } from "@/components/ui/popular-routes"
import { Faq } from "@/components/ui/faq"
import { Footer } from "@/components/ui/footer"

const RoutePlanner = lazy(() => import("@/pages/RoutePlanner").then(m => ({ default: m.RoutePlanner })))
const Privacy     = lazy(() => import("@/pages/Privacy").then(m => ({ default: m.Privacy })))
const Terms       = lazy(() => import("@/pages/Terms").then(m => ({ default: m.Terms })))
const Contact     = lazy(() => import("@/pages/Contact").then(m => ({ default: m.Contact })))
const Blog        = lazy(() => import("@/pages/Blog").then(m => ({ default: m.Blog })))
const BlogPost    = lazy(() => import("@/pages/BlogPost").then(m => ({ default: m.BlogPost })))
const Pricing     = lazy(() => import("@/pages/Pricing").then(m => ({ default: m.Pricing })))

const LandingPage = () => (
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

const App = () => (
  <Suspense fallback={null}>
    <Routes>
      <Route path="/"           element={<LandingPage />} />
      <Route path="/plan"       element={<RoutePlanner />} />
      <Route path="/privacy"    element={<Privacy />} />
      <Route path="/terms"      element={<Terms />} />
      <Route path="/contact"    element={<Contact />} />
      <Route path="/blog"       element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      <Route path="/pricing"    element={<Pricing />} />
    </Routes>
  </Suspense>
)

export default App
