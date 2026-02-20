'use client';

import { useState, useEffect } from 'react';
import { TierKey, TIERS } from '@/src/lib/tiers';
import TierBadge from './TierBadge';

interface UsageStatsProps {
  showUpgradeButton?: boolean;
  onUpgrade?: () => void;
  tier?: TierKey;
  sitesUsed?: number;
}

export default function UsageStats({ 
  showUpgradeButton = true, 
  onUpgrade,
  tier = 'free',
  sitesUsed = 0
}: UsageStatsProps) {
  const tierConfig = TIERS[tier];
  const sitesLimit = tierConfig.limit;
  const sitesPercent = Math.min((sitesUsed / sitesLimit) * 100, 100);

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900">Your Plan</h3>
        <TierBadge tier={tier} />
      </div>

      {/* Sites Usage */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Websites</span>
          <span className="text-gray-900 font-medium">{sitesUsed} / {sitesLimit}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`${getProgressColor(sitesPercent)} h-2 rounded-full transition-all`}
            style={{ width: `${sitesPercent}%` }}
          />
        </div>
      </div>

      {/* Features */}
      <div className="space-y-2 mb-4">
        <p className="text-sm font-medium text-gray-700">Features:</p>
        {tierConfig.features.map((feature, idx) => (
          <div key={idx} className="flex items-center text-sm text-gray-600">
            <span className="text-green-500 mr-2">✓</span>
            {feature}
          </div>
        ))}
      </div>

      {/* Upgrade Button */}
      {showUpgradeButton && tier !== 'pro' && (
        <button
          onClick={onUpgrade}
          className="w-full py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          {tier === 'free' ? 'Upgrade Plan' : 'Change Plan'}
        </button>
      )}
    </div>
  );
}
