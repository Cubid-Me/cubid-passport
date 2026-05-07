import { Dialog, Transition } from '@headlessui/react';
import dayjs from 'dayjs';
import { authedPost } from 'lib/api';
import { Fragment, useEffect, useState } from 'react';

interface WebhookDetails {
  created_at: string;
  dapp: number;
  status: string;
  webhook: string;
  webhook_url: string;
}

interface DeliveryAttempt {
  attempt_number: number;
  delivered_at: string;
  id: number;
  response_status_code: number;
}

interface WebhookDetailsSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  webhookDetails: WebhookDetails | null;
}

export const WebhookDetailsSidePanel = ({
  isOpen,
  onClose,
  webhookDetails,
}: WebhookDetailsSidePanelProps) => {
  const [allApiCalls, setAllApiCalls] = useState<DeliveryAttempt[]>([]);
  const [loading, setLoading] = useState(false);

  const closePanel = () => {
    onClose();
    setAllApiCalls([]);
  };

  useEffect(() => {
    if (webhookDetails) {
      (async () => {
        setLoading(true);
        const { data } = await authedPost<{ data: DeliveryAttempt[] }>(
          '/api/admin/webhooks/details',
          {
            dappId: webhookDetails?.dapp,
            eventType: webhookDetails.webhook,
          }
        );
        setAllApiCalls(data.data ?? []);
        setLoading(false);
      })();
    }
  }, [webhookDetails]);

  if (!webhookDetails) {
    return <></>;
  }

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-50" onClose={closePanel}>
        <div className="fixed inset-0 bg-black bg-opacity-70" />

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 flex justify-end">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-in-out duration-500"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="transform transition ease-in-out duration-300"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <Dialog.Panel className="w-full max-w-screen bg-gray-900 p-8 text-white shadow-xl">
                <Dialog.Title className="text-2xl font-semibold mb-4">Webhook Details</Dialog.Title>

                <div className="grid grid-cols-4">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Webhook URL</p>
                    <p className="text-sm">{webhookDetails.webhook_url}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Webhook Type</p>
                    <p className="text-sm">{webhookDetails.webhook}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Created At</p>
                    <p className="text-sm">{dayjs(webhookDetails.created_at).format("D MMM,YYYY")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Status</p>
                    <p className="text-sm">{webhookDetails.status}</p>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-2">API Calls</h3>
                  {loading && <div role="status">
                    <svg aria-hidden="true" className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-gray-600 dark:fill-gray-300" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                      <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                    </svg>
                    <span className="sr-only">Loading...</span>
                  </div>}
                  {!loading && allApiCalls.length === 0 && <>No webhook delievers happened yet </>}
                  {allApiCalls.length !== 0 && !loading && (
                    <div className="overflow-auto rounded-lg border border-gray-700">

                      <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-800">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Call ID</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">API Attempts</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Response</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {allApiCalls.map((call, index) => (
                            <tr key={index} className="hover:bg-gray-800">
                              <td className="px-4 py-2 text-sm">{call.id}</td>
                              <td className="px-4 py-2 text-sm">{call.attempt_number}</td>
                              <td className="px-4 py-2 text-sm">{call.response_status_code}</td>
                              <td className="px-4 py-2 text-sm">{call.delivered_at}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>


                <button
                  className="mt-6 w-full rounded-md bg-red-600 py-2 text-lg font-semibold text-white hover:bg-red-500"
                  onClick={closePanel}
                >
                  Close
                </button>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
