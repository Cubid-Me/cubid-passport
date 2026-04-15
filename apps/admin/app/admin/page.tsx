'use client';
// components/admin/Admin.tsx
import { Authenticated } from 'components/auth/authenticated';
import { Header } from 'components/header';
import React, { useState } from 'react';

import AppList from './appList';
import Webhooks from './webhook';

// Define the type for the tab state
type Tab = 'apps' | 'webhooks';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('apps'); // Define state with Tab type

  return (
    <Authenticated>
      <div className="min-h-[100vh] bg-gray-900 text-white antialiased">
        <Header />
        <div className="p-3 pt-0">
          <div className="flex items-center space-x-6 border-b border-gray-800">
            <button
              onClick={() => setActiveTab('apps')}
              className={`pb-2 ${activeTab === 'apps' ? 'border-b-2 border-blue-500 text-blue-500' : ''}`}
            >
              Apps
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              className={`pb-2 ${activeTab === 'webhooks' ? 'border-b-2 border-blue-500 text-blue-500' : ''}`}
            >
              Webhooks
            </button>
          </div>
          <div className="pt-4">
            {activeTab === 'apps' && <AppList />}
            {activeTab === 'webhooks' && <Webhooks />}
          </div>
        </div>
      </div>
    </Authenticated>
  );
}
