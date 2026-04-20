import { WebhookDetailsSidePanel } from 'app/admin/webhookSidePanel';
import dayjs from 'dayjs';
import useAuth from 'hooks/useAuth';
import { authedPost } from 'lib/api';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { AddWebhook } from './addWebhook';

interface Webhook {
  id: number;
  created_at: string;
  status: string;
  webhook: string;
  webhook_url: string;
  secret: string;
  dapp: number;
  appName?: string;
}

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const { user } = useAuth();
  const [webhookSidePanelDetails, setWebhookSidePanelDetails] =
    useState<Webhook | null>(null);

  const fetchWebhooks = async () => {
    try {
      const { data } = await authedPost<{ data: Webhook[] }>(
        '/api/admin/webhooks/list',
        {}
      );
      setWebhooks(data.data ?? []);
    } catch {
      toast.error('Failed to fetch webhooks');
    }
  };

  useEffect(() => {
    if (user?.email) {
      fetchWebhooks();
    }
  }, [user?.email]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Secret copied to clipboard!');
  };


  return (
    <div className="p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl text-white">Webhooks</h2>
        <AddWebhook fetchWebhooks={fetchWebhooks} />
      </div>
      <div className="mt-4">
        {webhooks.length > 0 ? (
          <table className="w-full bg-gray-700 rounded-md text-left text-gray-100">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="py-2 px-4">Webhook</th>
                <th className="py-2 px-4">Created At</th>
                <th className="py-2 px-4">Status</th>
                <th className="py-2 px-4">App Name</th>
                <th className="py-2 px-4">Webhook URL</th>
                <th className="py-2 px-4">Secret</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((webhook) => (
                <tr key={webhook.id} className="border-b border-gray-800">
                  <td
                    className="cursor-pointer py-2 px-4 font-bold underline transition-all hover:scale-105"
                    onClick={() => {
                      setWebhookSidePanelDetails(webhook);
                    }}
                  >
                    {webhook.webhook}
                  </td>
                  <td className="py-2 px-4">{dayjs(webhook.created_at).format("D MMM,YYYY")}</td>
                  <td className="py-2 px-4">{webhook.status}</td>
                  <td className="py-2 px-4">
                    {webhook.appName ?? 'Unknown App'}
                  </td>
                  <td className="py-2 px-4">
                    {webhook.webhook_url || <span className="text-gray-500">N/A</span>}
                  </td>
                  <td className="py-2 px-4">
                    <button
                      onClick={() => copyToClipboard(webhook.secret)}
                      className="rounded bg-blue-500 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-600"
                    >
                      Copy Secret
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-400">No Webhooks Found</p>
        )}
      </div>
      <WebhookDetailsSidePanel
        isOpen={Boolean(webhookSidePanelDetails)}
        onClose={() => setWebhookSidePanelDetails(null)}
        webhookDetails={webhookSidePanelDetails}
      />
    </div>
  );
}
