'use client';

import { useState, useEffect } from 'react';
import { AuthWrapper } from './AuthWrapper';
import { User } from '@supabase/supabase-js';

interface Toolkit {
  slug: string;
  name: string;
  meta: {
    description: string;
    logo: string;
  };
}

interface AuthConfig {
  id: string;
  name: string;
  toolkit: string | { slug: string };
}

interface ConnectedToolkit {
  toolkit: Toolkit;
  authConfig: AuthConfig;
}

interface AuthConfigResponse {
  items: AuthConfig[];
}

interface ConnectedAccount {
  id: string;
  toolkit: {
    slug: string;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
}

function AppsPageContent({ user: _user }: { user: User }) {
  const [apps, setApps] = useState<Toolkit[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConnected, setShowConnected] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    fetchAppsData();
  }, []);

  // Refresh connection data when component mounts (e.g., after OAuth callback)
  useEffect(() => {
    const refreshConnections = () => {
      console.log('Refreshing connection status...');
      fetchConnectedAccounts();
    };

    refreshConnections();

    const handleConnectionSuccess = (event: CustomEvent) => {
      console.log('Connection success event received:', event.detail);
      setTimeout(() => {
        refreshConnections();
      }, 1000);
    };

    window.addEventListener('focus', refreshConnections);
    window.addEventListener('connectionSuccess', handleConnectionSuccess as EventListener);

    return () => {
      window.removeEventListener('focus', refreshConnections);
      window.removeEventListener('connectionSuccess', handleConnectionSuccess as EventListener);
    };
  }, []);

  const fetchConnectedAccounts = async () => {
    try {
      const response = await fetch('/api/apps/connection');
      if (response.ok) {
        const data = await response.json();
        setConnectedAccounts(data.connectedAccounts || []);
      } else {
        console.warn('Failed to fetch connected accounts');
      }
    } catch (error) {
      console.error('Error fetching connected accounts:', error);
    }
  };

  const fetchAppsData = async () => {
    try {
      const [toolkitsResponse, connectionStatusResponse] = await Promise.all([
        fetch('/api/toolkits'), // Fetch full catalog
        fetch('/api/apps/connection')
      ]);

      let allApps: Toolkit[] = [];
      if (toolkitsResponse.ok) {
        const toolkitsData = await toolkitsResponse.json();
        // Assuming the structure is { items: Toolkit[] } based on debug script
        allApps = toolkitsData.items || [];
      }

      const connectionData = connectionStatusResponse.ok
        ? await connectionStatusResponse.json()
        : { connectedAccounts: [] };

      console.log('Received apps:', allApps.length, 'items');
      console.log('Received connection data:', connectionData.connectedAccounts?.length || 0, 'accounts');

      setApps(allApps);
      setConnectedAccounts(connectionData.connectedAccounts || []);

    } catch (error) {
      console.error('Error fetching apps data:', error);
      setApps([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (toolkit: Toolkit) => {
    setConnecting(toolkit.slug);

    try {
      // Dynamic connection - no authConfigId needed upfront
      const response = await fetch('/api/apps/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolkitSlug: toolkit.slug
        }),
      });

      let responseData;
      const responseText = await response.text();

      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error('Failed to parse response as JSON:', responseText.substring(0, 100));
        throw new Error(`Server returned invalid response: ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(responseData.error || `Failed to create auth link: ${response.status}`);
      }

      const connectionRequest = responseData;

      if (connectionRequest.redirectUrl) {
        window.open(connectionRequest.redirectUrl, '_blank');

        setTimeout(() => {
          fetchConnectedAccounts();
        }, 2000);
      } else if (connectionRequest.status === 'success') {
        // No-auth toolkit - no redirect needed, connection is already complete
        console.log(`${toolkit.name} connected successfully (no OAuth required)`);
        fetchConnectedAccounts();
      } else {
        console.error('No redirect URL received and status is not success');
      }

    } catch (error) {
      console.error('Error connecting toolkit:', error);
      alert(`Failed to connect to ${toolkit.name}: ${error}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (toolkit: Toolkit, connectedAccount: ConnectedAccount) => {
    setConnecting(toolkit.slug);

    try {
      console.log(`Disconnecting ${toolkit.name}...`);

      const response = await fetch('/api/connectedAccounts/disconnect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: connectedAccount.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to disconnect: ${response.status}`);
      }

      setConnectedAccounts(prev =>
        prev.filter(account => account.id !== connectedAccount.id)
      );

      setTimeout(() => {
        fetchConnectedAccounts();
      }, 500);

      console.log(`Successfully disconnected ${toolkit.name}`);

    } catch (error) {
      console.error('Error disconnecting toolkit:', error);
      alert(`Failed to disconnect ${toolkit.name}: ${error}`);
    } finally {
      setConnecting(null);
    }
  };

  const filteredApps = apps.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getActionButton = (toolkit: Toolkit) => {
    const isConnecting = connecting === toolkit.slug;

    const isConnected = connectedAccounts.some(account =>
      account.toolkit?.slug?.toLowerCase() === toolkit.slug.toLowerCase()
    );

    const connectedAccount = connectedAccounts.find(account =>
      account.toolkit?.slug?.toLowerCase() === toolkit.slug.toLowerCase()
    );

    if (isConnecting) {
      return (
        <button
          disabled
          className="text-neutral-400 text-sm font-medium flex items-center gap-1 cursor-not-allowed"
        >
          Connecting...
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      );
    }

    if (isConnected && connectedAccount) {
      return (
        <button
          onClick={() => handleDisconnect(toolkit, connectedAccount)}
          className="text-neutral-400 hover:text-neutral-600 text-sm font-medium flex items-center gap-1"
        >
          Disconnect
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      );
    } else {
      return (
        <button
          onClick={() => handleConnect(toolkit)}
          className="bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          Connect
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex-1" style={{ backgroundColor: '#fcfaf9' }}>
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <h1 className="text-xl sm:text-2xl font-semibold text-neutral-700">Your Apps</h1>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="text-neutral-600">Loading apps...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: '#fcfaf9' }}>
      <div className="flex-1 overflow-y-auto pb-8">
        <div className="max-w-6xl mx-auto px-3 py-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-8 gap-3 sm:gap-4">
            <h1 className="text-lg sm:text-2xl font-semibold text-neutral-700">Your Apps ({filteredApps.length})</h1>
            <div className="relative">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search apps"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-auto pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 border border-stone-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-neutral-400 focus:border-transparent outline-none text-sm bg-white text-neutral-700"
              />
            </div>
          </div>

          <div className="mb-3 sm:mb-6">
            <button
              onClick={() => setShowConnected(!showConnected)}
              className="text-neutral-600 hover:text-neutral-800 text-xs sm:text-sm font-medium"
            >
              Show Connected Apps ({connectedAccounts.length})
            </button>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl border border-stone-200 mb-32" style={{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
            {filteredApps.length === 0 ? (
              <div className="p-6 sm:p-12 text-center">
                <div className="text-neutral-500 text-sm sm:text-base">No apps found</div>
              </div>
            ) : (
              <div className="divide-y divide-stone-200">
                {filteredApps.map((toolkit: Toolkit) => (
                  <div key={toolkit.slug} className="p-3 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-stone-50 transition-colors gap-3 sm:gap-0">
                    <div className="flex items-start sm:items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white border border-gray-200 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0">
                        {toolkit.meta.logo ? (
                          <img
                            src={toolkit.meta.logo}
                            alt={toolkit.name}
                            className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <span className={`text-orange-500 text-sm sm:text-lg font-semibold ${toolkit.meta.logo ? 'hidden' : ''}`}>
                          {getInitial(toolkit.name)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-lg font-semibold text-neutral-900 mb-0.5 sm:mb-1">
                          {toolkit.name}
                        </h3>
                        <p className="text-neutral-600 text-xs sm:text-sm leading-relaxed break-words line-clamp-2 sm:line-clamp-none">
                          {toolkit.meta.description || 'No description available'}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 self-start sm:self-center">
                      <div className="text-xs sm:text-sm">
                        {getActionButton(toolkit)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppsPage() {
  return (
    <AuthWrapper>
      {(user, loading) => {
        if (loading) {
          return (
            <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#fcfaf9' }}>
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            </div>
          );
        }

        if (!user) {
          return (
            <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#fcfaf9' }}>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to continue</h2>
                <a
                  href="/auth"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-700"
                >
                  Sign In
                </a>
              </div>
            </div>
          );
        }

        return <AppsPageContent user={user} />;
      }}
    </AuthWrapper>
  );
}