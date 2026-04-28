import { Dialog, Transition } from '@headlessui/react';
import useAuth from 'hooks/useAuth';
import { authedPost } from 'lib/api';
import { Fragment, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import { DappRecord } from './shared';

interface WebhookType {
  id: number;
  name: string;
}

interface AddWebhookProps {
  fetchWebhooks: () => void;
}

export function AddWebhook({ fetchWebhooks }: AddWebhookProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdWebhookSecret, setCreatedWebhookSecret] = useState<string | null>(null);
  const [webhookTypes, setWebhookTypes] = useState<WebhookType[]>([]);
  const [superApps, setSuperApps] = useState<DappRecord[]>([]);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{
    webhook_url: string;
    webhook_type_id: number;
    dapp_id: string;
  }>();

  function closeModal() {
    setIsOpen(false);
    setCreatedWebhookSecret(null);
    reset();
  }

  function openModal() {
    setIsOpen(true);
  }

  // Fetch webhook types and apps when the component mounts
  useEffect(() => {
    const fetchWebhookTypes = async () => {
      try {
        const [metadataResponse, appsResponse] = await Promise.all([
          authedPost<{
            data: {
              webhookTypes: WebhookType[];
            };
          }>('/api/admin/metadata', {}),
          authedPost<{ data: DappRecord[] }>('/api/admin/apps/list', {}),
        ]);
        setWebhookTypes(metadataResponse.data.data.webhookTypes ?? []);
        setSuperApps(appsResponse.data.data ?? []);
      } catch {
        toast.error('Failed to load webhook form data');
      }
    };
    if (user?.email) {
      fetchWebhookTypes();
    }
  }, [user?.email]);

  const onSubmit = async (data: { webhook_url: string; webhook_type_id: number; dapp_id: string }) => {
    try {
      setLoading(true);
      const response = await authedPost<{ data: { webhookSecret?: string } }>(
        '/api/admin/webhooks/create',
        {
        dappId: data.dapp_id,
        webhookUrl: data.webhook_url,
        webhookTypeId: data.webhook_type_id,
        }
      );
      setCreatedWebhookSecret(response.data.data.webhookSecret ?? null);
      toast.success('Webhook URL added successfully. Store the signing secret now.');
      fetchWebhooks();
    } catch {
      toast.error('Failed to add webhook URL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-md bg-white p-2 px-5 text-sm font-semibold text-black"
      >
        Add Webhook
      </button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="fixed inset-0 z-10 overflow-y-auto" onClose={closeModal}>
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-60" />
            </Transition.Child>

            <span className="inline-block h-screen align-middle" aria-hidden="true">
              &#8203;
            </span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="my-8 inline-block w-full max-w-md transform overflow-visible rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-2xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">
                  Add Webhook URL
                </Dialog.Title>
                {createdWebhookSecret ? (
                  <div className="mt-4 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-yellow-100">
                    <p className="text-sm font-semibold">Webhook signing secret</p>
                    <p className="mt-1 text-xs text-yellow-100/80">
                      Store this now. Cubid will not show this secret again.
                    </p>
                    <code className="mt-2 block break-all rounded bg-black/40 p-2 text-xs">
                      {createdWebhookSecret}
                    </code>
                  </div>
                ) : null}
                <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300">
                      Webhook URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      placeholder="Enter Webhook URL"
                      {...register('webhook_url', {
                        required: 'Webhook URL is required',
                        pattern: {
                          value: /^(https?:\/\/)/,
                          message: 'URL must start with http:// or https://'
                        }
                      })}
                      className="mt-2 w-full rounded-md bg-gray-700 p-3 text-white focus:border-blue-500 focus:outline-none"
                    />
                    {errors.webhook_url && <p className="text-red-500 text-sm mt-1">{errors.webhook_url.message}</p>}
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300">
                      Webhook Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('webhook_type_id', { required: 'Please select a webhook type' })}
                      className="mt-2 w-full rounded-md bg-gray-700 p-3 text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select a webhook type</option>
                      {webhookTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                    {errors.webhook_type_id && <p className="text-red-500 text-sm mt-1">{errors.webhook_type_id.message}</p>}
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300">
                      Select App <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('dapp_id', { required: 'Please select an app' })}
                      className="mt-2 w-full rounded-md bg-gray-700 p-3 text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select an app</option>
                      {superApps.map((app) => (
                        <option key={app.id} value={app.id}>
                          {app.appname}
                        </option>
                      ))}
                    </select>
                    {errors.dapp_id && <p className="text-red-500 text-sm mt-1">{errors.dapp_id.message}</p>}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="mr-4 rounded-md bg-red-500 p-2 px-5 text-sm font-semibold text-white"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className={`rounded-md bg-green-500 p-2 px-5 text-sm font-semibold text-white ${loading ? 'pointer-events-none opacity-50' : ''}`}
                      disabled={loading}
                    >
                      {loading ? 'Loading...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
