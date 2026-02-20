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
  User,
  Bell,
  Shield,
  CreditCard,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import TierBadge from '@/src/components/TierBadge';
import { TierKey, TIERS } from '@/src/lib/tiers';
import UpgradeModal from '@/src/components/UpgradeModal';

interface UserData {
  id: string;
  email: string;
  plan: 'free' | 'starter' | 'pro' | 'business';
  phoneNumber?: string;
  createdAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [message, setMessage] = useState('');
  const [siteCount, setSiteCount] = useState(0);

  useEffect(() => {
    const savedUserId = localStorage.getItem('sitewatch_user_id');
    if (!savedUserId) {
      router.push('/login?redirect=/settings');
      return;
    }
    
    setUserId(savedUserId);
    fetchUser(savedUserId);
    fetchSiteCount(savedUserId);
  }, [router]);

  async function fetchUser(uid: string) {
    try {
      const response = await fetch(`/api/user?id=${uid}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSiteCount(uid: string) {
    try {
      const response = await fetch('/api/websites', {
        headers: { 'X-User-Id': uid }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSiteCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch site count:', error);
    }
  }

  function handleLogout() {
    localStorage.removeItem('sitewatch_user_id');
    setUserId(null);
    router.push('/');
  }

  async function handleUpgrade(tier: TierKey) {
    if (!userId || !user) return;

    setIsCheckingOut(true);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          email: user.email,
          successUrl: `${window.location.origin}/checkout/success`,
          cancelUrl: `${window.location.origin}/settings`,
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

  async function handleDeleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return;
    if (!userId) return;

    try {
      const response = await fetch(`/api/user?id=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        handleLogout();
      } else {
        setMessage('Failed to delete account');
      }
    } catch (error) {
      setMessage('Failed to delete account');
    }
  }

  const tier = (user?.plan as TierKey) || 'free';
  const tierConfig = TIERS[tier];

  if (!userId || loading) {
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
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg font-medium"
          >
            <Globe className="w-5 h-5" />
            Sites
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 px-4 py-3 text-blue-600 bg-blue-50 rounded-lg font-medium"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center justify-between mb-4">
            <TierBadge tier={tier} />
            {tier === 'free' && (
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
              <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-4xl">
          {message && (
            <div className={`mb-6 p-4 rounded-xl ${message.includes('Error') ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
              {message}
            </div>
          )}

          {/* Account Info */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Account Information</h2>
                <p className="text-sm text-gray-500">Manage your account details</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 bg-gray-50 border rounded-lg text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                <input
                  type="text"
                  value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}
                  disabled
                  className="w-full px-4 py-2 bg-gray-50 border rounded-lg text-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Plan Info */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Subscription Plan</h2>
                <p className="text-sm text-gray-500">Manage your subscription</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
              <div>
                <p className="font-medium text-gray-900">{tierConfig.name} Plan</p>
                <p className="text-sm text-gray-500">{tierConfig.limit} websites • {tierConfig.checkInterval}min checks</p>
              </div>
              <TierBadge tier={tier} />
            </div>

            {tier === 'free' && (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Upgrade Plan
              </button>
            )}
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                <p className="text-sm text-gray-500">Configure your alert preferences</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Email Alerts</p>
                  <p className="text-sm text-gray-500">Receive alerts when websites go down</p>
                </div>
                <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">SMS Alerts</p>
                  <p className="text-sm text-gray-500">Get text messages for critical alerts</p>
                </div>
                <div className={`w-12 h-6 rounded-full relative ${tier !== 'free' ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full ${tier !== 'free' ? 'right-1' : 'left-1'}`} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Weekly Reports</p>
                  <p className="text-sm text-gray-500">Get a summary of your site's health</p>
                </div>
                <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Security</h2>
                <p className="text-sm text-gray-500">Manage your account security</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Sign Out of All Devices
            </button>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 rounded-xl border border-red-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
                <p className="text-sm text-red-600">Irreversible actions</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-900">Delete Account</p>
                <p className="text-sm text-red-600">This will permanently delete all your data</p>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier={tier}
        currentSites={siteCount}
        onUpgrade={handleUpgrade}
        isLoading={isCheckingOut}
      />
    </div>
  );
}
