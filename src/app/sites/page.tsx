'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Globe, 
  Settings, 
  LogOut, 
  Menu,
  X,
  ExternalLink,
  Clock,
  Shield,
  RefreshCw
} from 'lucide-react';
import TierBadge from '@/src/components/TierBadge';
import { TierKey } from '@/src/lib/tiers';
import { Website } from '@/src/lib/types';
import { sanitizeInput } from '@/src/lib/sanitize';

// Sanitize website data for display
function sanitizeWebsite(site: Website): Website {
  return {
    ...site,
    name: sanitizeInput(site.name),
    lastError: site.lastError ? sanitizeInput(site.lastError) : null,
  };
}

export default function SitesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [tier, setTier] = useState<TierKey>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUserId = localStorage.getItem('sitewatch_user_id');
    if (!savedUserId) {
      router.push('/login?redirect=/sites');
      return;
    }
    
    setUserId(savedUserId);
    fetchSites(savedUserId);
  }, [router]);

  async function fetchSites(uid: string) {
    try {
      const response = await fetch('/api/websites', {
        headers: { 'X-User-Id': uid }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Sanitize website data
        const sanitizedWebsites = (data.websites || []).map(sanitizeWebsite);
        setWebsites(sanitizedWebsites);
        setTier(data.tier || 'free');
      }
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('sitewatch_user_id');
    setUserId(null);
    router.push('/');
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'up': return 'bg-green-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  }

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
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg font-medium"
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link
            href="/sites"
            className="flex items-center gap-3 px-4 py-3 text-blue-600 bg-blue-50 rounded-lg font-medium"
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
            <TierBadge tier={tier} />
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
              <h1 className="text-xl font-semibold text-gray-900">All Sites</h1>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              Add New Site
            </Link>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading sites...</p>
            </div>
          ) : websites.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
              <Globe className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No websites yet</h2>
              <p className="text-gray-600 mb-6">Add your first website to start monitoring</p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium"
              >
                Add Your First Site
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {websites.map((site) => (
                <div key={site.id} className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{site.name}</h3>
                      <a 
                        href={site.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {site.url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(site.status)}`} />
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>Last checked: {site.lastChecked ? new Date(site.lastChecked).toLocaleString() : 'Never'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <RefreshCw className="w-4 h-4" />
                      <span>Response: {site.responseTime ? `${site.responseTime}ms` : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Shield className="w-4 h-4" />
                      <span>SSL: {site.sslDaysRemaining !== null ? `${site.sslDaysRemaining} days` : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
