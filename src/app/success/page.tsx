'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle } from 'lucide-react';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Activating your subscription...');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const userId = localStorage.getItem('sitewatch_user_id');
    
    if (!sessionId) {
      setStatus('error');
      setMessage('No session ID found. Please contact support.');
      return;
    }

    // Refresh user data to get updated subscription status
    const activateSubscription = async () => {
      try {
        // Wait a moment for the webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (userId) {
          // Refresh user data from server
          const response = await fetch(`/api/user?id=${userId}`);
          if (response.ok) {
            const data = await response.json();
            
            // Check if user has an active subscription
            if (data.subscription && ['active', 'trialing'].includes(data.subscription.status)) {
              setStatus('success');
              setMessage(`Your ${data.subscription.plan} subscription is now active! Redirecting...`);
              
              setTimeout(() => {
                router.push('/dashboard');
              }, 2000);
              return;
            }
          }
        }
        
        // If we get here, the subscription might still be processing
        // Show success anyway and let the user continue
        setStatus('success');
        setMessage('Your subscription is being processed. Redirecting...');
        
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } catch (error) {
        console.error('Error activating subscription:', error);
        setStatus('error');
        setMessage('Something went wrong. Please contact support if your subscription is not active.');
      }
    };

    activateSubscription();
  }, [searchParams, router]);

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Processing your subscription...</h1>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to SiteWatch!</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            
            <button
              onClick={handleGoToDashboard}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">⚠️</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={handleGoToDashboard}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function CheckoutSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Loading...</h1>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
