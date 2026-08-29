import { Link } from "react-router-dom";
import { Header } from "@/components/ui/header-1";
import { Footer } from "@/components/ui/footer";

export function Terms() {
  return (
    <div className="w-full min-h-screen bg-white">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-16 md:py-20">
        <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors">
          ← Back to Home
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          Terms of Service
        </h1>

        <p className="text-gray-600 mb-8">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              By accessing and using ThermoDispatch, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, please discontinue use of the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              ThermoDispatch provides heat-aware route planning and departure-window recommendations for U.S. routes. The service analyzes temperature, heat index, UV exposure, and related conditions along a route to help users plan safer trips. No account or registration is required to use the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Geographic Coverage</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              ThermoDispatch is designed for use within the United States only. Routes, locations, and heat data outside the U.S. are not supported. Using the service with non-U.S. locations may produce empty or inaccurate results.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. User Responsibilities</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Users are responsible for their own travel decisions. Always verify local conditions, road closures, and weather reports independently before and during your journey. ThermoDispatch recommendations are informational only and are not a substitute for real-time situational awareness on the road.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. No Warranty</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              ThermoDispatch is provided "as is" without any warranty of any kind. We do not guarantee that weather forecasts, heat scores, or route analysis will be accurate, complete, or current at all times. Forecast data is sourced from third-party providers and is subject to their own limitations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              In no event shall ThermoDispatch or its operators be liable for any direct, indirect, incidental, consequential, or punitive damages arising out of your use of or reliance on this service, including but not limited to travel decisions made based on route recommendations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Intellectual Property</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              The ThermoDispatch platform, including its design, scoring algorithms, and interface, is proprietary. You may not reproduce, reverse-engineer, or redistribute any part of the service without prior written permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Third-Party Services</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              ThermoDispatch relies on third-party routing and weather APIs to generate results. We are not responsible for downtime, inaccuracies, or changes in third-party services that may affect the quality of our output.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Governing Law</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              These Terms are governed by the laws of the United States. Any disputes arising from the use of ThermoDispatch shall be resolved in accordance with applicable federal and state law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We reserve the right to update these Terms at any time. Changes will be posted on this page. Continued use of the service after updates are posted constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              Questions about these Terms? Reach us at <a href="mailto:legal@thermodispatch.com" className="text-orange-500 hover:underline">legal@thermodispatch.com</a>.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
