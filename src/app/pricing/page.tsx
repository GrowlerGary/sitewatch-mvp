'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PricingComponent from '@/src/components/PricingPage';
import { TierKey } from '@/src/lib/tiers';
import { useUser } from '@/src/context/UserContext';

export default function PricingPage() {
  const router = useRouter();
  const { tier, user } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async (selectedTier: TierKey) => {
    if (selectedTier === 'free') {
      router.push('/');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: selectedTier,
          email: user?.email,
          successUrl: `${window.location.origin}/checkout/success`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        console.error('Checkout error:', data.error);
        alert(data.error || 'Failed to start checkout. Please try again.');
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <PricingComponent
        currentTier={tier}
        onSubscribe={handleSubscribe}
        isLoading={isLoading}
      />
    </main>
  );
}
