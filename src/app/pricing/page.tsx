'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PricingComponent from '@/src/components/PricingPage';
import { TierKey } from '@/src/lib/tiers';

export default function PricingPage() {
  const router = useRouter();
  const [tier, setTier] = useState<TierKey>('free');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Load user from localStorage
    const storedUserId = localStorage.getItem('sitewatch_user_id');
    if (storedUserId) {
      setUserId(storedUserId);
      // Fetch user data to get current tier
      fetch(`/api/user?id=${storedUserId}`)
        .then(res => res.json())
        .then(data => {
          if (data.user?.plan) {
            setTier(data.user.plan);
          }
          // Check for active subscription
          if (data.subscription?.status === 'active' || data.subscription?.status === 'trialing') {
            setTier(data.subscription.plan);
          }
        })
        .catch(console.error);
    }
  }, []);

  const handleSubscribe = async (selectedTier: TierKey) => {
    if (selectedTier === 'free') {
      router.push('/signup');
      return;
    }

    // Redirect to login if not authenticated
    if (!userId) {
      router.push(`/login?redirect=/pricing`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: selectedTier,
          userId,
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
