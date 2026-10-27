import React, { useState, useEffect } from 'react';
import { ServerDashboard } from './components/ServerDashboard';
import { ClientDashboard } from './components/ClientDashboard';

export const App: React.FC = () => {
  // Detect route from window.location
  const getInitialRoute = (): 'server' | 'client' => {
    const path = window.location.pathname.toLowerCase();
    const search = new URLSearchParams(window.location.search);
    const mode = search.get('mode')?.toLowerCase();

    if (path.includes('/client') || mode === 'client') {
      return 'client';
    }
    return 'server';
  };

  const [currentRoute, setCurrentRoute] = useState<'server' | 'client'>(getInitialRoute);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentRoute(getInitialRoute());
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // 1. Endpoint Client Enclave Dashboard (/client)
  if (currentRoute === 'client') {
    return <ClientDashboard />;
  }

  // 2. SOC Master Server Dashboard (/server or default root /)
  return <ServerDashboard />;
};
