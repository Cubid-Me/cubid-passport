'use client';
// components/admin/Admin.tsx
import { Authenticated } from 'components/auth/authenticated';
import { Header } from 'components/header';
import React, { useState } from 'react';

import AppList from './appList';
import DisclosureOps from './disclosureOps';
import NotificationOps from './notificationOps';
import OidcOps from './oidcOps';
import OidcRegistry from './oidcRegistry';
import SiwcPolicy from './siwcPolicy';
import Webhooks from './webhook';

// Define the type for the tab state
type Tab =
  | 'apps'
  | 'disclosure-ops'
  | 'notifications'
  | 'oidc'
  | 'oidc-ops'
  | 'siwc-policy'
  | 'webhooks';

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
              onClick={() => setActiveTab('oidc')}
              className={`pb-2 ${activeTab === 'oidc' ? 'border-b-2 border-blue-500 text-blue-500' : ''}`}
            >
              Claims & Policies
            </button>
            <button
              onClick={() => setActiveTab('oidc-ops')}
              className={`pb-2 ${activeTab === 'oidc-ops' ? 'border-b-2 border-blue-500 text-blue-500' : ''}`}
            >
              OIDC Ops
            </button>
            <button
              onClick={() => setActiveTab('disclosure-ops')}
              className={`pb-2 ${activeTab === 'disclosure-ops' ? 'border-b-2 border-blue-500 text-blue-500' : ''}`}
            >
              Disclosure Ops
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`pb-2 ${activeTab === 'notifications' ? 'border-b-2 border-blue-500 text-blue-500' : ''}`}
            >
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('siwc-policy')}
              className={`pb-2 ${activeTab === 'siwc-policy' ? 'border-b-2 border-blue-500 text-blue-500' : ''}`}
            >
              SIWC Policy
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
            {activeTab === 'oidc' && <OidcRegistry />}
            {activeTab === 'oidc-ops' && <OidcOps />}
            {activeTab === 'disclosure-ops' && <DisclosureOps />}
            {activeTab === 'notifications' && <NotificationOps />}
            {activeTab === 'siwc-policy' && <SiwcPolicy />}
            {activeTab === 'webhooks' && <Webhooks />}
          </div>
        </div>
      </div>
    </Authenticated>
  );
}
