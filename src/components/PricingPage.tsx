'use client';

import { useState } from 'react';
import { TIERS, TierKey } from '@/src/lib/tiers';
import { Check, X, Zap } from 'lucide-react';

interface PricingPageProps {
  currentTier?: TierKey;
  onSubscribe?: (tier: TierKey) => void;
  isLoading?: boolean;
}

export default function PricingPage({ 
  currentTier = 'free', 
  onSubscribe,
  isLoading = false,
}: PricingPageProps) {
  const [selectedTier, setSelectedTier] = useState<TierKey | null>(null);
  const [hoveredTier, setHoveredTier] = useState<TierKey | null>(null);

  const tiers = Object.entries(TIERS) as [TierKey, typeof TIERS[TierKey]][];

  const handleSubscribe = (tier: TierKey) => {
    if (tier === 'free') return;
    setSelectedTier(tier);
    onSubscribe?.(tier);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Start free and scale as you grow. No hidden fees, cancel anytime.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {tiers.map(([key, tier]) => {
          const isCurrent = currentTier === key;
          const isPopular = tier.popular;
          const isHovered = hoveredTier === key;

          return (
            <div
              key={key}
              className={`
                relative rounded-2xl p-6 transition-all duration-300
                ${isPopular 
                  ? 'bg-gradient-to-b from-blue-50 to-white border-2 border-blue-500 shadow-lg scale-105' 
                  : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md'
                }
                ${isCurrent ? 'ring-2 ring-green-500' : ''}
                ${isHovered ? 'transform -translate-y-1' : ''}
              `}
              onMouseEnter={() => setHoveredTier(key)}
              onMouseLeave={() => setHoveredTier(null)}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-blue-600 text-white">
                    <Zap className="w-4 h-4 mr-1" />
                    Most Popular
                  </span>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrent && (
                <div className="absolute -top-4 right-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Current Plan
                  </span>
                </div>
              )}

              {/* Tier Name */}
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {tier.name}
              </h3>

              {/* Price */}
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">
                  ${tier.price}
                </span>
                {tier.price > 0 && (
                  <span className="text-gray-500">/month</span>
                )}
              </div>

              {/* Description */}
              <p className="text-gray-600 mb-6 text-sm">
                {key === 'free' && 'Perfect for personal projects'}
                {key === 'starter' && 'Great for small businesses'}
                {key === 'pro' && 'For growing teams'}
              </p>

              {/* CTA Button */}
              <button
                onClick={() => handleSubscribe(key)}
                disabled={isCurrent || isLoading}
                className={`
                  w-full py-3 px-4 rounded-lg font-medium transition-all duration-200
                  ${isCurrent 
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                    : key === 'free'
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : isPopular
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                  }
                `}
              >
                {isLoading && selectedTier === key ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading...
                  </span>
                ) : isCurrent ? (
                  'Current Plan'
                ) : key === 'free' ? (
                  'Get Started Free'
                ) : (
                  'Subscribe'
                )}
              </button>

              {/* Features List */}
              <div className="mt-8 space-y-4">
                <div className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    <strong>{tier.limit}</strong> website{tier.limit > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    <strong>{tier.checkInterval < 1 ? `${tier.checkInterval * 60}s` : `${tier.checkInterval}m`}</strong> checks
                  </span>
                </div>
                
                {tier.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ or Additional Info */}
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Need a custom plan?
        </h2>
        <p className="text-gray-600 mb-6">
          Contact us for enterprise solutions with custom monitoring needs, 
          dedicated support, and flexible billing options.
        </p>
        <a 
          href="mailto:enterprise@sitewatch.dev"
          className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Contact Sales
        </a>
      </div>
    </div>
  );
}
