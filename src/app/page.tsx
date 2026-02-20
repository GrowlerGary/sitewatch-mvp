'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  Shield, 
  Smartphone, 
  CheckCircle, 
  Zap, 
  Clock, 
  Bell,
  ChevronRight,
  Globe,
  ArrowRight
} from 'lucide-react';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                S
              </div>
              <span className="text-xl font-bold text-gray-900">SiteWatch</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-gray-600 hover:text-gray-900 font-medium">
                Features
              </Link>
              <Link href="#how-it-works" className="text-gray-600 hover:text-gray-900 font-medium">
                How It Works
              </Link>
              <Link href="#pricing" className="text-gray-600 hover:text-gray-900 font-medium">
                Pricing
              </Link>
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link 
                href="/login"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Log In
              </Link>
              <Link 
                href="/signup"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Get Started Free
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <div className="flex flex-col gap-4">
                <Link 
                  href="#features" 
                  className="text-gray-600 hover:text-gray-900 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Features
                </Link>
                <Link 
                  href="#how-it-works" 
                  className="text-gray-600 hover:text-gray-900 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  How It Works
                </Link>
                <Link 
                  href="#pricing" 
                  className="text-gray-600 hover:text-gray-900 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pricing
                </Link>
                <hr />
                <Link 
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Log In
                </Link>
                <Link 
                  href="/signup"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Get Started Free
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              <span>Free for 1 website</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Never let a down website{' '}
              <span className="text-blue-600">hurt your business</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Monitor your websites 24/7 for uptime, SSL certificates, and performance. 
              Get instant alerts via SMS, email, or Slack when something goes wrong.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-lg inline-flex items-center justify-center gap-2"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                href="#pricing"
                className="w-full sm:w-auto px-8 py-4 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-semibold text-lg"
              >
                View Pricing
              </Link>
            </div>

            <p className="text-sm text-gray-500 mt-4">No credit card required</p>
          </div>

          {/* Hero Visual */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 h-32 bottom-0" />
            <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div className="flex-1 text-center">
                  <span className="text-gray-400 text-sm">SiteWatch Dashboard</span>
                </div>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400">Sites Online</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  </div>
                  <p className="text-4xl font-bold text-white">12</p>
                  <p className="text-green-400 text-sm mt-1">All systems operational</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400">Avg Response</span>
                    <Clock className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-4xl font-bold text-white">142ms</p>
                  <p className="text-blue-400 text-sm mt-1">Fast & responsive</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400">SSL Health</span>
                    <Shield className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-4xl font-bold text-white">100%</p>
                  <p className="text-green-400 text-sm mt-1">All certificates valid</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to monitor your sites
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive monitoring that catches problems before your customers do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Uptime Monitoring</h3>
              <p className="text-gray-600">
                Check your websites every 30 seconds to 5 minutes depending on your plan. 
                Instant alerts when downtime is detected.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">SSL Certificate Alerts</h3>
              <p className="text-gray-600">
                Never let an expired SSL certificate hurt your SEO or customer trust. 
                Get notified 30, 14, and 7 days before expiration.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Smartphone className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">SMS & Email Alerts</h3>
              <p className="text-gray-600">
                Get notified wherever you are. SMS alerts for critical issues, 
                email summaries for daily reports. Slack integration included.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <Globe className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Global Monitoring</h3>
              <p className="text-gray-600">
                Check your sites from multiple locations worldwide. 
                Detect regional outages and CDN issues before they impact users.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <Bell className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Notifications</h3>
              <p className="text-gray-600">
                Configure alert thresholds, set quiet hours, and define escalation policies. 
                Only get woken up for real emergencies.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-6">
                <CheckCircle className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Status Pages</h3>
              <p className="text-gray-600">
                Create beautiful public status pages to keep your customers informed. 
                Build trust with transparency during incidents.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Get started in 3 simple steps
            </h2>
            <p className="text-xl text-gray-600">
              Start monitoring your websites in less than 5 minutes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Create your account</h3>
              <p className="text-gray-600">
                Sign up for free in seconds. No credit card required to start monitoring up to 3 websites.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Add your websites</h3>
              <p className="text-gray-600">
                Enter your website URLs and choose your monitoring settings. We'll handle the rest automatically.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Get instant alerts</h3>
              <p className="text-gray-600">
                Receive notifications via SMS, email, or Slack the moment we detect any issues with your sites.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600">
              Start free, upgrade when you need more
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Free Tier */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Free</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="text-gray-600 text-sm mb-6">Perfect for personal projects</p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>1 website</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>10-minute checks</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Email alerts</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>SSL monitoring</span>
                </li>
              </ul>

              <Link 
                href="/signup"
                className="block w-full py-3 text-center border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:border-blue-600 hover:text-blue-600 transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Starter Tier */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Starter</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-gray-900">$5</span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="text-gray-600 text-sm mb-6">For freelancers & small teams</p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>3 websites</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>5-minute checks</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>SMS + Email alerts</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>10 SMS/month</span>
                </li>
              </ul>

              <Link 
                href="/signup"
                className="block w-full py-3 text-center border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:border-blue-600 hover:text-blue-600 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="bg-blue-600 rounded-2xl p-8 shadow-lg border border-blue-500 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-400 text-yellow-900 text-sm font-semibold rounded-full">
                Most Popular
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Pro</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-white">$15</span>
                <span className="text-blue-200">/month</span>
              </div>
              <p className="text-blue-100 text-sm mb-6">For growing businesses</p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-white">
                  <CheckCircle className="w-5 h-5 text-blue-200" />
                  <span>10 websites</span>
                </li>
                <li className="flex items-center gap-3 text-white">
                  <CheckCircle className="w-5 h-5 text-blue-200" />
                  <span>1-minute checks</span>
                </li>
                <li className="flex items-center gap-3 text-white">
                  <CheckCircle className="w-5 h-5 text-blue-200" />
                  <span>SMS + Email alerts</span>
                </li>
                <li className="flex items-center gap-3 text-white">
                  <CheckCircle className="w-5 h-5 text-blue-200" />
                  <span>50 SMS/month</span>
                </li>
              </ul>

              <Link 
                href="/signup"
                className="block w-full py-3 text-center bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Business Tier */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Business</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-gray-900">$49</span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="text-gray-600 text-sm mb-6">For agencies & enterprises</p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>50 websites</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>1-minute checks</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>200 SMS/month</span>
                </li>
              </ul>

              <Link 
                href="/signup"
                className="block w-full py-3 text-center border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:border-blue-600 hover:text-blue-600 transition-colors"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            Ready to start monitoring?
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Join thousands of developers and businesses who trust SiteWatch to keep their sites online.
          </p>
          <Link 
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-lg"
          >
            Get Started Free
            <ChevronRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-gray-500 mt-4">Free forever for 1 website</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white">Status Page</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-white">About</Link></li>
                <li><Link href="#" className="hover:text-white">Blog</Link></li>
                <li><Link href="#" className="hover:text-white">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-white">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white">API Reference</Link></li>
                <li><Link href="#" className="hover:text-white">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-white">Privacy</Link></li>
                <li><Link href="#" className="hover:text-white">Terms</Link></li>
                <li><Link href="#" className="hover:text-white">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                S
              </div>
              <span className="text-white font-bold">SiteWatch</span>
            </div>
            <p className="text-sm">© 2026 SiteWatch. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
