'use client';

import { useState, useEffect } from 'react';
import { Website } from '@/src/lib/types';

export default function Dashboard() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchWebsites();
    const interval = setInterval(fetchWebsites, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchWebsites() {
    try {
      const response = await fetch('/api/websites');
      const data = await response.json();
      setWebsites(data);
    } catch (error) {
      console.error('Failed to fetch websites:', error);
    }
  }

  async function addWebsite(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl || !newName) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl, name: newName }),
      });

      if (response.ok) {
        setNewUrl('');
        setNewName('');
        setMessage('Website added successfully!');
        fetchWebsites();
      } else {
        const error = await response.json();
        setMessage(`Error: ${error.error}`);
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
      const response = await fetch(`/api/websites/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage('Website removed successfully!');
        fetchWebsites();
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
        fetchWebsites();
      } else {
        setMessage('Failed to check websites');
      }
    } catch (error) {
      setMessage('Failed to check websites');
    } finally {
      setLoading(false);
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

  const upCount = websites.filter(w => w.status === 'up').length;
  const downCount = websites.filter(w => w.status === 'down').length;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                S
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">SiteWatch</h1>
                <p className="text-sm text-gray-500">Client Website Health Monitor</p>
              </div>
            </div>
            <button
              onClick={checkNow}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Check Now
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border">
            <p className="text-sm text-gray-500">Total Sites</p>
            <p className="text-3xl font-bold">{websites.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border">
            <p className="text-sm text-gray-500">Online</p>
            <p className="text-3xl font-bold text-green-600">{upCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border">
            <p className="text-sm text-gray-500">Offline</p>
            <p className="text-3xl font-bold text-red-600">{downCount}</p>
          </div>
        </div>

        {/* Add Website Form */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Add New Website</h2>
          <form onSubmit={addWebsite} className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Website Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg"
              required
            />
            <input
              type="url"
              placeholder="https://example.com"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold">Monitored Websites</h2>
          </div>
          
          {websites.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No websites monitored yet</p>
              <p className="text-sm">Add your first client website above</p>
            </div>
          ) : (
            <div className="divide-y">
              {websites.map((website) => (
                <div key={website.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{website.name}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full text-white ${getStatusColor(website.status)}`}>
                          {getStatusText(website.status)}
                        </span>
                      </div>
                      <a href={website.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                        {website.url}
                      </a>
                      
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Last Checked:</span>
                          <p>{formatDate(website.lastChecked)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Response Time:</span>
                          <p>{website.responseTime ? `${website.responseTime}ms` : 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">SSL Days Left:</span>
                          <p>{website.sslDaysRemaining !== null ? `${website.sslDaysRemaining} days` : 'N/A'}</p>
                        </div>
                      </div>
                      
                      {website.lastError && (
                        <p className="mt-2 text-sm text-red-600">Error: {website.lastError}</p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => deleteWebsite(website.id)}
                      className="ml-4 p-2 text-gray-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>SiteWatch monitors your websites and alerts you to problems</p>
        </div>
      </div>
    </main>
  );
}
