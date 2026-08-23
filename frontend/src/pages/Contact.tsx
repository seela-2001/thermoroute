import { Link } from "react-router-dom";
import { Header } from "@/components/ui/header-1";
import { Footer } from "@/components/ui/footer";
import { Mail, MapPin, Phone } from "lucide-react";

export function Contact() {
  return (
    <div className="w-full min-h-screen bg-white">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-16 md:py-20">
        <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors">
          ← Back to Home
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          Contact Us
        </h1>

        <p className="text-gray-600 mb-12">
          Have questions or feedback? We'd love to hear from you. Reach out to us through any of the channels below.
        </p>

        <div className="grid gap-8 md:grid-cols-1">
          <div className="flex items-start gap-4 p-6 rounded-lg border border-gray-200 bg-gray-50">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
              <a href="mailto:hello@thermodispatch.com" className="text-gray-600 hover:text-gray-900 transition-colors">
                hello@thermodispatch.com
              </a>
              <p className="text-sm text-gray-500 mt-2">We'll get back to you within 24 hours.</p>
            </div>
          </div>

            <div className="flex items-start gap-4 p-6 rounded-lg border border-gray-200 bg-gray-50">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Location</h3>
              <p className="text-gray-600">
                San Francisco, CA<br />
                United States
              </p>
            </div>
          </div>

            <div className="flex items-start gap-4 p-6 rounded-lg border border-gray-200 bg-gray-50">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Phone className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
              <a href="tel:+1234567890" className="text-gray-600 hover:text-gray-900 transition-colors">
                +1 (234) 567-890
              </a>
              <p className="text-sm text-gray-500 mt-2">Mon-Fri, 9am-5pm PST</p>
            </div>
          </div>
        </div>

        <div className="mt-12 p-6 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Send us a message</h3>
          <form className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                id="subject"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="How can we help?"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                id="message"
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
                placeholder="Tell us more..."
              />
            </div>
            <button
              type="submit"
              className="w-full px-6 py-3 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-colors"
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}