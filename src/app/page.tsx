'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Website } from '@/src/lib/types';
import { TIERS, TierKey } from '@/src/lib/tiers';
import UsageStats from '@/src/components/UsageStats';
import UpgradeModal from '@/src/components/UpgradeModal';
import TierBadge from '@/src/components/TierBadge';

interface DashboardData {
  websites: Website[];
  tier: TierKey;
  limit: number;
  count: number;
  usage: {
    sitesUsed: number;
    sitesLimit: number;
    smsUsed: number;
    smsLimit: number;
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({
    websites: [],
    tier: 'free',
    limit: 1,
    count: 0,
    usage: {
      sitesUsed: 0,
      sitesLimit: 1,
      smsUsed: 0,
      smsLimit: 0,
    },
  });
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [email, setEmail] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    // Load user from localStorage
    const savedUserId = localStorage.getItem('sitewatch_user_id');
    if (savedUserId) {
      setUserId(savedUserId);
      fetchWebsites(savedUserId);
    } else {
      // Anonymous user - still fetch but with limits
      fetchWebsites(null);
    }
    
    const interval = setInterval(() => {
      const currentUserId = localStorage.getItem('sitewatch_user_id');
      fetchWebsites(currentUserId);
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  async function fetchWebsites(uid: string | null) {
    try {
      const headers: Record<string, string> = {};
      if (uid) {
        headers['X-User-Id'] = uid;
      }
      
      const response = await fetch('/api/websites', { headers });
      const result = await response.json();
      
      setData({
        websites: result.websites || [],
        tier: result.tier || 'free',
        limit: result.limit || 1,
        count: result.count || 0,
        usage: result.usage || {
          sitesUsed: result.count || 0,
          sitesLimit: result.limit || 1,
          smsUsed: 0,
          smsLimit: 0,
        },
      });
    } catch (error) {
      console.error('Failed to fetch websites:', error);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const result = await response.json();
        localStorage.setItem('sitewatch_user_id', result.user.id);
        setUserId(result.user.id);
        setShowAuthModal(false);
        fetchWebsites(result.user.id);
        setMessage('Welcome back!');
      } else {
        setMessage('Failed to login. Please try again.');
      }
    } catch (error) {
      setMessage('Failed to login. Please try again.');
    }
  }

  async function addWebsite(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl || !newName) return;

    setLoading(true);
    setMessage('');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (userId) {
        headers['X-User-Id'] = userId;
      }

      const response = await fetch('/api/websites', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: newUrl, name: newName }),
      });

      if (response.ok) {
        setNewUrl('');
        setNewName('');
        setMessage('Website added successfully!');
        fetchWebsites(userId);
      } else {
        const error = await response.json();
        if (response.status === 403 && error.upgradeRequired) {
          setShowUpgradeModal(true);
        }
        setMessage(`Error: ${error.message || error.error}`);
      }
    } catch (error) {
      setMessage('Failed to add website');
    } finally {
      setLoading(false);
    }
  }

  async function deleteWebsite(id: string) {
    if (!confirm('Are you sure you want to remove this website?')) return;

    try {
      const headers: Record<string, string> = {};
      if (userId) {
        headers['X-User-Id'] = userId;
      }

      const response = await fetch(`/api/websites/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        setMessage('Website removed successfully!');
        fetchWebsites(userId);
      } else {
        setMessage('Failed to remove website');
      }
    } catch (error) {
      setMessage('Failed to remove website');
    }
  }

  async function checkNow() {
    setLoading(true);
    setMessage('Checking all websites...');
    
    try {
      const response = await fetch('/api/check', {
        method: 'POST',
      });
      
      if (response.ok) {
        setMessage('All websites checked!');
        fetchWebsites(userId);
      } else {
        setMessage('Failed to check websites');
      }
    } catch (error) {
      setMessage('Failed to check websites');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(tier: TierKey) {
    if (!userId) {
      // Need to login first
      setShowAuthModal(true);
      return;
    }

    setIsCheckingOut(true);

    try {
      const userResponse = await fetch(`/api/user?id=${userId}`);
      const userData = await userResponse.json();
      const email = userData.user?.email;

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          email,
          successUrl: `${window.location.origin}/checkout/success`,
          cancelUrl: `${window.location.origin}`,
        }),
      });

      const result = await response.json();

      if (response.ok && result.url) {
        window.location.href = result.url;
      } else {
        setMessage(result.error || 'Failed to start checkout');
        setIsCheckingOut(false);
      }
    } catch (error) {
      setMessage('Failed to start checkout');
      setIsCheckingOut(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'up': return 'bg-green-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'up': return 'Online';
      case 'down': return 'Offline';
      default: return 'Unknown';
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  }

  const upCount = data.websites.filter(w => w.status === 'up').length;
  const downCount = data.websites.filter(w => w.status === 'down').length;
  const isAtLimit = data.count >= data.limit;
  const tierConfig = TIERS[data.tier];

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                S
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">SiteWatch</h1>
                <p className="text-sm text-gray-500">Website Health Monitor</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Tier Badge */}
              <TierBadge tier={data.tier} showLimit currentCount={data.count} />
              
              {/* Auth Button */}
              {!userId ? (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border rounded-lg hover:bg-gray-50"
                >
                  Sign In
                </button>
              ) : (
                <button
                  onClick={() => {
                    localStorage.removeItem('sitewatch_user_id');
                    setUserId(null);
                    fetchWebsites(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border rounded-lg hover:bg-gray-50"
                >
                  Sign Out
                </button>
              )}
              
              {data.tier === 'free' && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  Upgrade
                </button>
              )}
              
              <button
                onClick={checkNow}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                Check Now
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6 border">
                <p className="text-sm text-gray-500">Sites</p>
                <p className="text-2xl md:text-3xl font-bold">{data.count} <span className="text-lg text-gray-400">/ {data.limit}</span></p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 border">
                <p className="text-sm text-gray-500">Online</p>
                <p className="text-2xl md:text-3xl font-bold text-green-600">{upCount}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 border">
                <p className="text-sm text-gray-500">Offline</p>
                <p className="text-2xl md:text-3xl font-bold text-red-600">{downCount}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 border">
                <p className="text-sm text-gray-500">Check Interval</p>
                <p className="text-2xl md:text-3xl font-bold">{tierConfig.checkIntervalMinutes}m</p>
              </div>
            </div>

            {/* Limit Warning */}
            {isAtLimit && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-medium text-amber-800">You've reached your {tierConfig.name} plan limit</p>
                  <p className="text-sm text-amber-600">Upgrade to monitor more websites</p>
                </div>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
                >
                  Upgrade Now
                </button>
              </div>
            )}

            {/* Add Website Form */}
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4">Add New Website</h2>
              <form onSubmit={addWebsite} className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Website Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={isAtLimit}
                />
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={isAtLimit}
                />
                <button
                  type="submit"
                  disabled={loading || isAtLimit}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Add Website
                </button>
              </form>
              {message && (
                <p className={`mt-3 text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {message}
                </p>
              )}
            </div>

            {/* Websites List */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Monitored Websites</h2>
                <span className="text-sm text-gray-500">{data.count} website{data.count !== 1 ? 's' : ''}</span>
              </div>
              
              {data.websites.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <div className="text-4xl mb-4">🌐</div>
                  <p className="font-medium">No websites monitored yet</p>
                  <p className="text-sm mt-1">Add your first website above to start monitoring</p>
                </div>
              ) : (
                <div className="divide-y">
                  {data.websites.map((website) => (
                    <div key={website.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg font-semibold truncate">{website.name}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full text-white ${getStatusColor(website.status)}`}>
                              {getStatusText(website.status)}
                            </span>
                          </div>
                          <a href={website.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate block">
                            {website.url}
                          </a>
                          
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Last Checked:</span>
                              <p className="font-medium">{formatDate(website.lastChecked)}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Response Time:</span>
                              <p className="font-medium">{website.responseTime ? `${website.responseTime}ms` : 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">SSL Days Left:</span>
                              <p className={`font-medium ${(website.sslDaysRemaining || 0) < 7 ? 'text-red-600' : ''}`}>
                                {website.sslDaysRemaining !== null ? `${website.sslDaysRemaining} days` : 'N/A'}
                              </p>
                            </div>
                          </div>
                          
                          {website.lastError && (
                            <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">Error: {website.lastError}</p>
                          )}
                        </div>
                        
                        <button
                          onClick={() => deleteWebsite(website.id)}
                          className="ml-4 p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove website"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <UsageStats 
              showUpgradeButton={data.tier !== 'business'} 
              onUpgrade={() => setShowUpgradeModal(true)} 
            />
            
            {/* Quick Tips */}
            <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
              <h4 className="font-medium text-blue-900 mb-2">💡 Quick Tips</h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Checks run every {tierConfig.checkIntervalMinutes} minutes</li>
                <li>• SSL certificates are monitored automatically</li>
                <li>• You'll get alerts when sites go down</li>
                {data.tier === 'free' && (
                  <li>• Upgrade for SMS alerts and faster checks</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>SiteWatch monitors your websites 24/7 and alerts you to problems</p>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={data.tier}
        currentSites={data.count}
        onUpgrade={handleUpgrade}
        isLoading={isCheckingOut}
      />

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Sign In</h2>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              Enter your email to sign in or create an account.
            </p>
            
            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              
              <button
                type="submit"
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Continue
              </button>
            </form>
            
            <p className="text-xs text-gray-500 mt-4 text-center">
              Free tier includes 1 website. Upgrade anytime.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
