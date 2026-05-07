import { AddSubpage } from 'app/admin/addSubpage';
import { ChildApps } from 'app/admin/childApps';
import { CreateApp } from 'components/admin/create-app';
import useAuth from 'hooks/useAuth';
import { authedPost } from 'lib/api';
import Tooltip from 'rc-tooltip';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { RotateApiKeyModal } from './rotateKeyModal';

interface SuperApp {
  apiKeyLastUsedAt?: string | null;
  apiKeyPrefix?: string | null;
  apiKeyRotatedAt?: string | null;
  apiKeyStatus?: string | null;
  uid: string;
  appname: string;
  id: string;
  admin_uid: string;
}

export default function AppList() {
  const [superApps, setSuperApps] = useState<SuperApp[]>([]);
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [apiKeyToRotate, setApiKeyToRotate] = useState<string | null>(null);
  const [oneTimeApiKey, setOneTimeApiKey] = useState<string | null>(null);

  const fetchSuperApps = useCallback(async () => {
    setLoading(true);
    if (user?.email) {
      try {
        const { data } = await authedPost<{ data: SuperApp[] }>(
          '/api/admin/apps/list',
          {}
        );
        setSuperApps(data.data ?? []);
      } catch {
        toast.error('Failed to fetch apps.');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSuperApps();
  }, [fetchSuperApps]);

  const rotateApiKeys = async (uuidSupabase: string) => {
    try {
      const selectedApp = superApps.find((item) => item.uid === uuidSupabase);

      if (!selectedApp) {
        throw new Error('Unable to find app to rotate');
      }

      const response = await authedPost<{
        data: {
          apiKey?: string;
        };
      }>('/api/admin/apps/rotate-key', {
        dappId: selectedApp.id,
      });
      if (response.data.data.apiKey) {
        setOneTimeApiKey(response.data.data.apiKey);
      }
      fetchSuperApps();
      toast.success('Successfully rotated API Keys');
    } catch {
      toast.error('Failed to rotate API Key.');
    }
  };

  return (
    <div className="p-3 pt-0">
      <div className="flex w-full items-center justify-between">
        <p className="text-xl">API KEYS</p>
        <CreateApp
          fetchSuperApps={fetchSuperApps}
          onApiKeyCreated={setOneTimeApiKey}
        />
      </div>
      {oneTimeApiKey && (
        <div className="mt-3 rounded border border-amber-500 bg-amber-950 p-4 text-sm text-amber-100">
          <p className="font-semibold">Copy this API key now</p>
          <p className="mt-1">
            Cubid stores only a hash and cannot show this key again after you
            leave this screen.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="break-all rounded bg-black/40 px-2 py-1">
              {oneTimeApiKey}
            </code>
            <button
              className="rounded bg-amber-200 px-3 py-1 font-semibold text-black"
              onClick={() => {
                navigator.clipboard.writeText(oneTimeApiKey);
                toast.success('Successfully copied API key to clipboard');
              }}
            >
              Copy once
            </button>
            <button
              className="rounded border border-amber-200 px-3 py-1"
              onClick={() => setOneTimeApiKey(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      <div className="relative mt-3 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center py-6">
            <div role="status">
              <svg aria-hidden="true" className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-gray-600 dark:fill-gray-300" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
              </svg>
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-700 text-xs uppercase text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">App Name</th>
                <th scope="col" className="px-6 py-3">App ID</th>
                <th scope="col" className="px-6 py-3">API Key</th>
                <th scope="col" className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {superApps.length === 0 ? (
                <tr className="bg-gray-800">
                  <th style={{ fontWeight: 500 }} className="p-6" colSpan={4}>
                    No Apps Found
                  </th>
                </tr>
              ) : (
                superApps.map((item) => (
                  <React.Fragment key={item.uid}>
                    <tr className="border-b border-gray-700 bg-gray-800">
                      <th scope="row" className="whitespace-nowrap px-6 py-4 font-medium text-gray-500">
                        {item.appname}
                      </th>
                      <td className="px-6 py-4">{item.uid}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-mono text-xs">
                            {item.apiKeyPrefix
                              ? `${item.apiKeyPrefix}...`
                              : 'No active key'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.apiKeyStatus ?? 'missing'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center  space-x-2">
                          <Tooltip placement="left" trigger={['hover']} overlay={<span>Rotate API KEYS</span>}>
                            <button onClick={() => setApiKeyToRotate(item.uid)}>
                              <svg xmlns="http://www.w3.org/2000/svg" height="20px" width="20px" viewBox="0 0 24 24" >
                                <path xmlns="http://www.w3.org/2000/svg" d="M20.5 9.00006C19 5.00024 15.5334 3.00122 11.9991 3.00122C7.36722 3.00122 3.55265 6.50073 3.05499 11.0001M20.9428 13.005C20.4434 17.5025 16.6297 21 11.9991 21C8.46723 21 5 19.0001 3.5 15.0002M21 5.00006V9.00006H17M3 19.0001V15.0001H7M12 8.00006V13.0001M12 16.0001H12.01" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                              </svg>
                            </button>
                          </Tooltip>
                          <Tooltip placement="left" trigger={['hover']} overlay={<span>Delete App</span>}>
                            <button
                              onClick={async () => {
                                await authedPost('/api/admin/apps/delete', {
                                  dappId: item.id,
                                });
                                fetchSuperApps();
                              }}
                              className="text-red-500"
                            >
                              <svg
                                xmlns='http://www.w3.org/2000/svg'
                                fill='none'
                                viewBox='0 0 24 24'
                                strokeWidth={1.5}
                                stroke='currentColor'
                                className='h-6 w-6'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  d='M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0'
                                />
                              </svg>
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                    <ChildApps parentDappId={item.id} fetchSuperApps={fetchSuperApps} />
                    <tr className="p-3">
                      <td className="p-4">
                        <AddSubpage fetchSuperApps={fetchSuperApps} dapp_id={item.id} />
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        )}
        <RotateApiKeyModal
          openModal={Boolean(apiKeyToRotate)}
          closeModal={() => setApiKeyToRotate(null)}
          rotate={async () => {
            if (apiKeyToRotate) {
              await rotateApiKeys(apiKeyToRotate);
              setApiKeyToRotate(null);
            }
          }}
        />
      </div>
    </div>
  );
}
