import { AddSubpage } from 'app/admin/addSubpage';
import { ChildApps } from 'app/admin/childApps';
import { CreateApp } from 'components/admin/create-app';
import useAuth from 'hooks/useAuth';
import { authedPost } from 'lib/api';
import Tooltip from 'rc-tooltip';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { RoateApiKeyModal } from './rotateKeyModal';

interface SuperApp {
  uid: string;
  appname: string;
  apikey: string;
  id: string;
  admin_uid: string;
}

export default function AppList() {
  const [superApps, setSuperApps] = useState<SuperApp[]>([]);
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [apiKeyToRotate, setApiKeyToRotate] = useState<string | null>(null);

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

      await authedPost('/api/admin/apps/rotate-key', {
        dappId: selectedApp.id,
      });
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
        <CreateApp fetchSuperApps={fetchSuperApps} />
      </div>
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
                <th scope="col" className="px-6 py-3">Secret Key</th>
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
                        <Tooltip placement="left" trigger={['hover']} overlay={<span>Copy API KEY</span>}>
                          <button
                            onClick={() => {
                              toast.success('Successfully copied API KEY to clipboard');
                              navigator.clipboard.writeText(item.apikey);
                            }}
                            className={`${item.apikey}-action`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="#fff" height="20px" width="20px" version="1.1" id="Layer_1" viewBox="0 0 64 64" enable-background="new 0 0 64 64">
                              <g id="Text-files">
                                <path d="M53.9791489,9.1429005H50.010849c-0.0826988,0-0.1562004,0.0283995-0.2331009,0.0469999V5.0228   C49.7777481,2.253,47.4731483,0,44.6398468,0h-34.422596C7.3839517,0,5.0793519,2.253,5.0793519,5.0228v46.8432999   c0,2.7697983,2.3045998,5.0228004,5.1378999,5.0228004h6.0367002v2.2678986C16.253952,61.8274002,18.4702511,64,21.1954517,64   h32.783699c2.7252007,0,4.9414978-2.1725998,4.9414978-4.8432007V13.9861002   C58.9206467,11.3155003,56.7043495,9.1429005,53.9791489,9.1429005z M7.1110516,51.8661003V5.0228   c0-1.6487999,1.3938999-2.9909999,3.1062002-2.9909999h34.422596c1.7123032,0,3.1062012,1.3422,3.1062012,2.9909999v46.8432999   c0,1.6487999-1.393898,2.9911003-3.1062012,2.9911003h-34.422596C8.5049515,54.8572006,7.1110516,53.5149002,7.1110516,51.8661003z    M56.8888474,59.1567993c0,1.550602-1.3055,2.8115005-2.9096985,2.8115005h-32.783699   c-1.6042004,0-2.9097996-1.2608986-2.9097996-2.8115005v-2.2678986h26.3541946   c2.8333015,0,5.1379013-2.2530022,5.1379013-5.0228004V11.1275997c0.0769005,0.0186005,0.1504021,0.0469999,0.2331009,0.0469999   h3.9682999c1.6041985,0,2.9096985,1.2609005,2.9096985,2.8115005V59.1567993z" />
                                <path d="M38.6031494,13.2063999H16.253952c-0.5615005,0-1.0159006,0.4542999-1.0159006,1.0158005   c0,0.5615997,0.4544001,1.0158997,1.0159006,1.0158997h22.3491974c0.5615005,0,1.0158997-0.4542999,1.0158997-1.0158997   C39.6190491,13.6606998,39.16465,13.2063999,38.6031494,13.2063999z" />
                                <path d="M38.6031494,21.3334007H16.253952c-0.5615005,0-1.0159006,0.4542999-1.0159006,1.0157986   c0,0.5615005,0.4544001,1.0159016,1.0159006,1.0159016h22.3491974c0.5615005,0,1.0158997-0.454401,1.0158997-1.0159016   C39.6190491,21.7877007,39.16465,21.3334007,38.6031494,21.3334007z" />
                                <path d="M38.6031494,29.4603004H16.253952c-0.5615005,0-1.0159006,0.4543991-1.0159006,1.0158997   s0.4544001,1.0158997,1.0159006,1.0158997h22.3491974c0.5615005,0,1.0158997-0.4543991,1.0158997-1.0158997   S39.16465,29.4603004,38.6031494,29.4603004z" />
                                <path d="M28.4444485,37.5872993H16.253952c-0.5615005,0-1.0159006,0.4543991-1.0159006,1.0158997   s0.4544001,1.0158997,1.0159006,1.0158997h12.1904964c0.5615025,0,1.0158005-0.4543991,1.0158005-1.0158997   S29.0059509,37.5872993,28.4444485,37.5872993z" />
                              </g>
                            </svg>
                          </button>
                        </Tooltip>
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
        <RoateApiKeyModal
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
