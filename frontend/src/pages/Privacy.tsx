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
              ThermoDispatch collects information you provide directly to us, including your name, email address, and account credentials. We also collect route information you save, travel preferences, and usage data to improve our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We use your information to provide, maintain, and improve our services. This includes processing route requests, sending relevant weather and road condition alerts, and analyzing usage patterns to enhance user experience.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Data Sharing</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We do not sell your personal information. We may share data with third-party service providers who assist in operating our service, such as weather data providers and mapping services. These partners are bound by confidentiality agreements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Location Information</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              When you use ThermoDispatch, we process location data to provide route-specific weather and road condition information. Location data is used solely for this purpose and is not stored permanently unless you save a route to your account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Cookies and Tracking</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We use cookies and similar technologies to enhance your experience, remember your preferences, and analyze site traffic. You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Security</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We implement appropriate security measures to protect your personal information from unauthorized access, alteration, or destruction. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              You have the right to access, correct, or delete your personal information. You may also opt out of certain data collection practices. To exercise these rights, please contact us at privacy@thermodispatch.com
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Third-Party Services</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Our service may contain links to third-party websites or integrate with third-party services. These third parties have their own privacy policies, and we are not responsible for their practices.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Children's Privacy</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              ThermoDispatch is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page. Your continued use of the service after such modifications constitutes your acceptance of the new policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact Information</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions about this privacy policy or our data practices, please contact us at privacy@thermodispatch.com
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}