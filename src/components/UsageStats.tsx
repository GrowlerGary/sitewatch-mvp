'use client';

import { useUser } from '@/src/context/UserContext';
import TierBadge from './TierBadge';

interface UsageStatsProps {
  showUpgradeButton?: boolean;
  onUpgrade?: () => void;
}

export default function UsageStats({ showUpgradeButton = true, onUpgrade }: UsageStatsProps) {
  const { tier, usage, isAuthenticated } = useUser();

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-gray-600 text-sm">Sign in to view your usage stats</p>
      </div>
    );
  }

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getSmsProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 75) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Your Plan</h3>
        <TierBadge tier={tier} showLimit currentCount={usage.sitesUsed} />
      </div>

      {/* Sites Usage */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Websites</span>
          <span className="font-medium text-gray-900">
            {usage.sitesUsed} / {usage.sitesLimit}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`${getProgressColor(usage.percentSites)} h-2 rounded-full transition-all duration-300`}
            style={{ width: `${Math.min(usage.percentSites, 100)}%` }}
          />
        </div>
        {usage.percentSites >= 90 && (
          <p className="text-xs text-red-600 mt-1">
            You're nearing your site limit!
          </p>
        )}
      </div>

      {/* SMS Usage */}
      {usage.smsLimit > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">SMS Alerts</span>
            <span className="font-medium text-gray-900">
              {usage.smsUsed} / {usage.smsLimit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`${getSmsProgressColor(usage.percentSms)} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${Math.min(usage.percentSms, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Resets monthly
          </p>
        </div>
      )}

      {/* Features List */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Plan Features</h4>
        <ul className="space-y-1">
          <li className="text-sm text-gray-600 flex items-center">
            <span className="text-green-500 mr-2">✓</span>
            {tier === 'free' ? '10' : tier === 'starter' ? '5' : '1'}-minute checks
          </li>
          <li className="text-sm text-gray-600 flex items-center">
            <span className="text-green-500 mr-2">✓</span>
            Email alerts
          </li>
          {usage.smsLimit > 0 && (
            <li className="text-sm text-gray-600 flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              SMS alerts ({usage.smsLimit}/month)
            </li>
          )}
          {tier === 'pro' && (
            <li className="text-sm text-gray-600 flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              API access
            </li>
          )}
          {tier === 'business' && (
            <>
              <li className="text-sm text-gray-600 flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Priority support
              </li>
              <li className="text-sm text-gray-600 flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Webhooks
              </li>
            </>
          )}
        </ul>
      </div>

      {/* Upgrade Button */}
      {showUpgradeButton && tier !== 'business' && (
        <button
          onClick={onUpgrade}
          className="w-full mt-4 py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          {tier === 'free' ? 'Upgrade Plan' : 'Change Plan'}
        </button>
      )}
    </div>
  );
}
