import { EditSubpage } from 'app/admin/editPage';
import { authedPost } from 'lib/api';
import React, { useCallback, useEffect, useState } from 'react';

interface ChildPage {
  id: number;
  page_name: string;
  redirect_url: string;
}

interface ChildAppsProps {
  fetchSuperApps: () => Promise<void>;
  parentDappId: number | string;
}

export const ChildApps = ({ parentDappId, fetchSuperApps }: ChildAppsProps) => {
  const [childApps, setChildApps] = useState<ChildPage[]>([]);

  const fetchDappPages = useCallback(async () => {
    const { data } = await authedPost<{ data: ChildPage[] }>('/api/admin/pages/list', {
      dappId: parentDappId,
    });
    setChildApps(data.data ?? []);
  }, [parentDappId]);

  useEffect(() => {
    fetchDappPages();
  }, [fetchDappPages]);

  return (
    <>
      {childApps.map((item) => (
        <tr className='pt-3' key={item.id}>
          <td className='pl-10 pt-1'>
            Child Page - {item.page_name}
          </td>
          <td className='pl-10 pt-3'>
            <EditSubpage fetchSuperApps={fetchSuperApps} dapp_id={parentDappId} existingData={childApps} />
          </td>
          <td><p>Cubid URL - {`https://allow.cubid.me/allow?uid=<cubid-user-id>&page_id=${item.id}`}<br />Redirect URL - {item.redirect_url}</p></td>
          <td className='pl-6'>
            <button
              onClick={async () => {
                await authedPost('/api/admin/pages/delete', {
                  pageId: item.id,
                });
                fetchDappPages();
              }}
              className='text-red-500'
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
          </td>
        </tr>
      ))}
    </>
  );
};
