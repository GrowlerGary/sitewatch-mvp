'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Website } from '@/src/lib/types';
import { TIERS, TierKey } from '@/src/lib/tiers';
import UpgradeModal from '@/src/components/UpgradeModal';
import TierBadge from '@/src/components/TierBadge';
import { sanitizeInput } from '@/src/lib/sanitize';
import { 
  LayoutDashboard, 
  Globe, 
  Settings, 
  LogOut, 
  Plus,
  Trash2,
  RefreshCw,
  Menu,
  X,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Shield
} from 'lucide-react';

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

// Sanitize website data for display
function sanitizeWebsite(site: Website): Website {
  return {
    ...site,
    name: sanitizeInput(site.name),
    lastError: site.lastError ? sanitizeInput(site.lastError) : null,
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({
    websites: [],
    tier: 'free',
    limit: 3,
    count: 0,
    usage: {
      sitesUsed: 0,
      sitesLimit: 3,
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
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Check authentication
    const savedUserId = localStorage.getItem('sitewatch_user_id');
    if (!savedUserId) {
      router.push('/login?redirect=/dashboard');
      return;
    }
    
    setUserId(savedUserId);
    fetchWebsites(savedUserId);
    
    // Set up polling
    const interval = setInterval(() => {
      const currentUserId = localStorage.getItem('sitewatch_user_id');
      if (currentUserId) {
        fetchWebsites(currentUserId);
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [router]);

  async function fetchWebsites(uid: string) {
    try {
      const response = await fetch('/api/websites', {
        headers: { 'X-User-Id': uid }
      });
      
      if (response.status === 401) {
        handleLogout();
        return;
      }
      
      const result = await response.json();
      
      // Sanitize website data
      const sanitizedWebsites = (result.websites || []).map(sanitizeWebsite);
      
      setData({
        websites: sanitizedWebsites,
        tier: result.tier || 'free',
        limit: result.limit || 3,
        count: result.count || 0,
        usage: result.usage || {
          sitesUsed: result.count || 0,
          sitesLimit: result.limit || 3,
          smsUsed: 0,
          smsLimit: 0,
        },
      });
    } catch (error) {
      console.error('Failed to fetch websites:', error);
    }
  }

  function handleLogout() {
    localStorage.removeItem('sitewatch_user_id');
    setUserId(null);
    router.push('/');
  }

  async function addWebsite(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl || !newName || !userId) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/websites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
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
    if (!userId) return;

    try {
      const response = await fetch(`/api/websites/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': userId },
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
        if (userId) fetchWebsites(userId);
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
      router.push('/login?redirect=/dashboard');
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
          cancelUrl: `${window.location.origin}/dashboard`,
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

  function getStatusIcon(status: string) {
    switch (status) {
      case 'up': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'down': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'up': return 'Online';
      case 'down': return 'Offline';
      default: return 'Unknown';
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'up': return 'bg-green-100 text-green-800';
      case 'down': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  // Loading state while checking auth
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-full w-64 bg-white border-r z-50 transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              S
            </div>
            <span className="text-xl font-bold text-gray-900">SiteWatch</span>
          </Link>
        </div>

        <nav className="px-4 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-blue-600 bg-blue-50 rounded-lg font-medium"
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link
            href="/sites"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg font-medium"
          >
            <Globe className="w-5 h-5" />
            Sites
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg font-medium"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center justify-between mb-4">
            <TierBadge tier={data.tier} />
            {data.tier === 'free' && (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Upgrade
              </button>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg font-medium"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-4 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={checkNow}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Check Now</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border">
              <p className="text-sm text-gray-500 mb-1">Total Sites</p>
              <p className="text-2xl font-bold text-gray-900">{data.count}</p>
              <p className="text-sm text-gray-400">of {data.limit} limit</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border">
              <p className="text-sm text-gray-500 mb-1">Online</p>
              <p className="text-2xl font-bold text-green-600">{upCount}</p>
              <p className="text-sm text-green-600/70 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Operational
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border">
              <p className="text-sm text-gray-500 mb-1">Offline</p>
              <p className="text-2xl font-bold text-red-600">{downCount}</p>
              <p className="text-sm text-red-600/70 flex items-center gap-1">
                {downCount > 0 ? (
                  <>
                    <XCircle className="w-3 h-3" />
                    Needs attention
                  </>
                ) : (
                  'All good'
                )}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border">
              <p className="text-sm text-gray-500 mb-1">Check Interval</p>
              <p className="text-2xl font-bold text-gray-900">
                {tierConfig.checkInterval < 1 ? `${tierConfig.checkInterval * 60}s` : `${tierConfig.checkInterval}m`}
              </p>
              <p className="text-sm text-gray-400">per site</p>
            </div>
          </div>

          {/* Limit Warning */}
          {isAtLimit && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-medium text-amber-800">You've reached your plan limit</p>
                <p className="text-sm text-amber-600">Upgrade to monitor more websites</p>
              </div>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium whitespace-nowrap"
              >
                Upgrade Now
              </button>
            </div>
          )}

          {/* Add Website Form */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Add New Website</h2>
            <form onSubmit={addWebsite} className="flex flex-col lg:flex-row gap-4">
              <input
                type="text"
                placeholder="Website Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isAtLimit}
              />
              <input
                type="url"
                placeholder="https://example.com"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isAtLimit}
              />
              <button
                type="submit"
                disabled={loading || isAtLimit}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
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
                <Globe className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="font-medium text-lg">No websites monitored yet</p>
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
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${getStatusColor(website.status)}`}>
                            {getStatusIcon(website.status)}
                            {getStatusText(website.status)}
                          </span>
                        </div>
                        <a 
                          href={website.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:underline text-sm truncate block mb-4"
                        >
                          {website.url}
                        </a>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <div>
                              <span className="text-gray-500">Last Checked:</span>
                              <p className="font-medium">{formatDate(website.lastChecked)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-gray-400" />
                            <div>
                              <span className="text-gray-500">Response:</span>
                              <p className="font-medium">{website.responseTime ? `${website.responseTime}ms` : 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-gray-400" />
                            <div>
                              <span className="text-gray-500">SSL:</span>
                              <p className={`font-medium ${(website.sslDaysRemaining || 0) < 7 ? 'text-red-600' : ''}`}>
                                {website.sslDaysRemaining !== null ? `${website.sslDaysRemaining} days` : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {website.lastError && (
                          <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                            Error: {website.lastError}
                          </p>
                        )}
                      </div>
                      
                      <button
                        onClick={() => deleteWebsite(website.id)}
                        className="ml-4 p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove website"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tips Card */}
          <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-100">
            <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Quick Tips
            </h4>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                Checks run every {tierConfig.checkInterval < 1 ? `${tierConfig.checkInterval * 60} seconds` : `${tierConfig.checkInterval} minutes`}
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                SSL certificates are monitored automatically
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                You'll receive alerts when sites go down or SSL expires
              </li>
              {data.tier === 'free' && (
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Upgrade for SMS alerts and faster checks
                </li>
              )}
            </ul>
          </div>
        </div>
      </main>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={data.tier}
        currentSites={data.count}
        onUpgrade={handleUpgrade}
        isLoading={isCheckingOut}
      />
    </div>
  );
}
