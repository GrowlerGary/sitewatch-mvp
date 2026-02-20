'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { TIERS, TierKey } from '@/src/lib/tiers';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: TierKey;
  currentSites?: number;
  onUpgrade: (tier: TierKey) => void;
  isLoading?: boolean;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  currentTier = 'free',
  currentSites = 0,
  onUpgrade,
  isLoading = false,
}: UpgradeModalProps) {
  const [selectedTier, setSelectedTier] = useState<TierKey>('starter');

  if (!isOpen) return null;

  const currentTierConfig = TIERS[currentTier];
  const nextTiers = (Object.entries(TIERS) as [TierKey, typeof TIERS[TierKey]][])
    .filter(([key]) => key !== 'free' && TIERS[key].limit > currentTierConfig.limit);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 md:p-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <span className="text-3xl">🚀</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Upgrade Your Plan
            </h2>
            <p className="text-gray-600">
              You've reached the limit of <strong>{currentTierConfig.limit}</strong> website
              {currentTierConfig.limit > 1 ? 's' : ''} on the {currentTierConfig.name} plan.
            </p>
            <p className="text-gray-600 mt-2">
              You're currently monitoring <strong>{currentSites}</strong> website
              {currentSites !== 1 ? 's' : ''}.
            </p>
          </div>

          {/* Tier Options */}
          <div className="space-y-4 mb-8">
            {nextTiers.map(([key, tier]) => (
              <div
                key={key}
                onClick={() => setSelectedTier(key)}
                className={`
                  relative p-4 rounded-xl border-2 cursor-pointer transition-all
                  ${selectedTier === key 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`
                      w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center
                      ${selectedTier === key ? 'border-blue-500' : 'border-gray-300'}
                    `}>
                      {selectedTier === key && (
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{tier.name}</h3>
                      <p className="text-sm text-gray-600">
                        Up to <strong>{tier.limit}</strong> websites • {tier.checkInterval < 1 ? `${tier.checkInterval * 60}s` : `${tier.checkInterval}m`} checks
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">${tier.price}/mo</div>
                  </div>
                </div>

                {tier.popular && (
                  <span className="absolute -top-2.5 right-4 px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded">
                    Popular
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => onUpgrade(selectedTier)}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              `Upgrade to ${TIERS[selectedTier].name}`
            )}
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            14-day free trial. Cancel anytime. No hidden fees.
          </p>
        </div>
      </div>
    </div>
  );
}
