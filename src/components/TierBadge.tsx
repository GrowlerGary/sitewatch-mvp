import { TierKey, TIERS } from '@/src/lib/tiers';

interface TierBadgeProps {
  tier: TierKey;
  showLimit?: boolean;
  currentCount?: number;
}

export default function TierBadge({ tier, showLimit = false, currentCount }: TierBadgeProps) {
  const tierConfig = TIERS[tier];
  
  const colors = {
    free: 'bg-gray-100 text-gray-700 border-gray-200',
    starter: 'bg-green-100 text-green-700 border-green-200',
    pro: 'bg-blue-100 text-blue-700 border-blue-200',
    business: 'bg-purple-100 text-purple-700 border-purple-200',
  };

  const colorClass = colors[tier] || colors.free;

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${colorClass}`}>
      <span className="capitalize">{tierConfig.name}</span>
      {showLimit && currentCount !== undefined && (
        <span className="ml-2 text-xs opacity-75">
          {currentCount}/{tierConfig.limit} sites
        </span>
      )}
    </div>
  );
}
