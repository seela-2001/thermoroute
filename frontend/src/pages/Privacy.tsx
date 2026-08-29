import { Link } from "react-router-dom";
import { Header } from "@/components/ui/header-1";
import { Footer } from "@/components/ui/footer";

export function Privacy() {
  return (
    <div className="w-full min-h-screen bg-white">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-16 md:py-20">
        <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors">
          ← Back to Home
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          Privacy Policy
        </h1>

        <p className="text-gray-600 mb-8">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              ThermoDispatch does not require you to create an account or log in. We collect only the information necessary to process your route requests: origin and destination coordinates, departure preferences, and trip parameters. No personal identifiers are required to use the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Route and location data you submit is used solely to generate heat analysis, route scoring, and departure recommendations. We do not use this data for advertising, profiling, or any purpose unrelated to providing the service you requested.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Data Sharing</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We do not sell your data. Route coordinates are forwarded to third-party weather and routing APIs (such as Open-Meteo and OSRM) solely to fulfill your request. These services operate under their own privacy policies. No personally identifiable information is shared.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Location Information</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              When you plan a route, we process the origin and destination coordinates you enter to fetch weather conditions along the path. This data is processed in real time and is not stored permanently on our servers after your session ends.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Cookies and Local Storage</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              ThermoDispatch stores recent trip history in your browser's local storage to make repeat planning faster. This data never leaves your device and can be cleared at any time through your browser settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Security</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              All data transmitted between your browser and our servers is encrypted in transit. Because we do not store personal accounts or credentials, the risk of a data breach affecting your personal information is minimal.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Third-Party Services</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              ThermoDispatch integrates with third-party routing and weather APIs to power its analysis. These services have their own privacy policies. We are not responsible for how third parties handle any data passed to them as part of a route request.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Children's Privacy</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              ThermoDispatch is not directed at children under 13. We do not knowingly collect any information from children under 13.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Changes to This Policy</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We may update this privacy policy from time to time. Changes will be posted on this page with an updated date. Continued use of the service after changes are posted constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              Questions about this policy? Contact us at <a href="mailto:privacy@thermodispatch.com" className="text-orange-500 hover:underline">privacy@thermodispatch.com</a>.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
