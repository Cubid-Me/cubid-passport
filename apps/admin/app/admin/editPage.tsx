import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import Select from 'react-select';

import {
  buildRequestedInfo,
  getInfoSharingTypeId,
  getInfoSharingValue,
  INFO_SHARING_OPTIONS,
  MetadataPayload,
  PageConfigRecord,
  PageFormValues,
  RequestedInfoByIndex,
  StampTypeRecord,
} from './shared';
import { useAuth } from '../../hooks/useAuth';
import { authedPost } from '../../lib/api';

interface ExistingPage {
  id: number;
  page_name: string;
  redirect_url: string;
}

interface EditSubpageProps {
  dapp_id: number | string;
  existingData: ExistingPage[];
  fetchSuperApps: () => Promise<void>;
}

interface EditSubpageFormValues {
  apps: PageFormValues[];
}

export function EditSubpage({
  dapp_id,
  existingData,
  fetchSuperApps,
}: EditSubpageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedApps, setSelectedApps] = useState(0);
  const [stampList, setStampList] = useState<StampTypeRecord[]>([]);
  const [requestedInfo, setRequestedInfo] = useState<RequestedInfoByIndex>({});
  const { user } = useAuth();

  const { control, handleSubmit, register, reset, watch } =
    useForm<EditSubpageFormValues>({
      defaultValues: {
        apps: existingData.map((page) => ({
          app_name: page.page_name,
          redirect_url: page.redirect_url ?? '',
        })),
      },
    });

  const { fields } = useFieldArray({
    control,
    name: 'apps',
  });

  useEffect(() => {
    reset({
      apps: existingData.map((page) => ({
        app_name: page.page_name,
        redirect_url: page.redirect_url ?? '',
      })),
    });
  }, [existingData, reset]);

  useEffect(() => {
    if (!user?.email) {
      return;
    }

    (async () => {
      const { data } = await authedPost<{ data: MetadataPayload }>(
        '/api/admin/metadata',
        {}
      );
      setStampList(data.data.stampTypes ?? []);
    })();
  }, [user?.email]);

  const allInfoToRequest = useMemo(
    () => stampList.map((item) => item.stamptype),
    [stampList]
  );

  const allStampTypes = useMemo(() => {
    const stampMap: Record<string, number> = {};
    stampList.forEach((item) => {
      stampMap[item.stamptype] = item.id;
    });
    return stampMap;
  }, [stampList]);

  const buildPageRequestedInfo = useCallback(
    (page: ExistingPage, pageConfigs: PageConfigRecord[]) => {
      const nextRequestedInfo = buildRequestedInfo(allInfoToRequest);
      const pageStampTypes = pageConfigs.filter(
        (stampConfig) => stampConfig.page_id === page.id
      );

      pageStampTypes.forEach((stampConfig) => {
        const stampName = stampList.find(
          (stamp) => stamp.id === stampConfig.stamptype_id
        )?.stamptype;

        if (!stampName) {
          return;
        }

        nextRequestedInfo[stampName] = {
          auth: stampConfig.is_auth_enabled,
          required: stampConfig.is_infosharing_required,
          score: stampConfig.include_in_score,
          selectedOption: getInfoSharingValue(
            stampConfig.info_sharing_type_id
          ),
        };
      });

      return nextRequestedInfo;
    },
    [allInfoToRequest, stampList]
  );

  useEffect(() => {
    if (!isOpen || allInfoToRequest.length === 0 || existingData.length === 0) {
      return;
    }

    (async () => {
      const { data } = await authedPost<{ data: PageConfigRecord[] }>(
        '/api/admin/pages/config',
        {
          dappId: dapp_id,
        }
      );

      const nextRequestedInfo = existingData.reduce<RequestedInfoByIndex>(
        (accumulator, page, index) => {
          accumulator[index] = buildPageRequestedInfo(page, data.data ?? []);
          return accumulator;
        },
        {}
      );

      setRequestedInfo(nextRequestedInfo);
    })();
  }, [allInfoToRequest.length, buildPageRequestedInfo, dapp_id, existingData, isOpen]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setLoading(false);
    setSelectedApps(0);
    reset({
      apps: existingData.map((page) => ({
        app_name: page.page_name,
        redirect_url: page.redirect_url ?? '',
      })),
    });
  }, [existingData, reset]);

  const openModal = () => {
    setIsOpen(true);
  };

  const setAuthInfo = useCallback(
    (stampName: string, value: boolean, index: number) => {
      setRequestedInfo((current) => ({
        ...current,
        [index]: {
          ...(current[index] ?? buildRequestedInfo(allInfoToRequest)),
          [stampName]: {
            ...(current[index]?.[stampName] ?? buildRequestedInfo([stampName])[stampName]),
            required: value,
          },
        },
      }));
    },
    [allInfoToRequest]
  );

  const setSelectedOption = useCallback(
    (index: number, stampName: string, nextValue: string | undefined) => {
      setRequestedInfo((current) => ({
        ...current,
        [index]: {
          ...(current[index] ?? buildRequestedInfo(allInfoToRequest)),
          [stampName]: {
            ...(current[index]?.[stampName] ?? buildRequestedInfo([stampName])[stampName]),
            selectedOption: (nextValue ?? 'not') as
              | 'hashed'
              | 'identity'
              | 'json'
              | 'not',
          },
        },
      }));
    },
    [allInfoToRequest]
  );

  const updatePages = useCallback(
    async (formValues: EditSubpageFormValues) => {
      if (!user) {
        return;
      }

      setLoading(true);
      await authedPost('/api/admin/pages/update', {
        dappId: dapp_id,
        pages: formValues.apps.map((app, idx) => ({
          pageId: existingData[idx]?.id,
          pageName: app.app_name || `Page ${idx + 1}`,
          redirectUrl: app.redirect_url,
          stampConfigs: Object.entries(requestedInfo[idx] ?? {}).map(
            ([stampName, config]) => ({
              auth: config.auth,
              infoSharingTypeId: getInfoSharingTypeId(config.selectedOption),
              required: config.required,
              score: config.score,
              stampTypeId: allStampTypes[stampName],
            })
          ),
        })),
      });
      setLoading(false);
      await fetchSuperApps();
      closeModal();
      window.location.reload();
    },
    [
      allStampTypes,
      closeModal,
      dapp_id,
      existingData,
      fetchSuperApps,
      requestedInfo,
      user,
    ]
  );

  const onSubmit = (data: EditSubpageFormValues) => {
    void updatePages(data);
  };

  return (
    <>
      <button
        type='button'
        onClick={openModal}
        className='rounded-md bg-white p-2 px-5 text-sm font-semibold text-black'
      >
        Edit Page
      </button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog
          as='div'
          className='fixed inset-0 z-10 overflow-y-auto'
          onClose={closeModal}
        >
          <div className='min-h-screen px-4 text-center'>
            <Transition.Child
              as={Fragment}
              enter='ease-out duration-300'
              enterFrom='opacity-0'
              enterTo='opacity-100'
              leave='ease-in duration-200'
              leaveFrom='opacity-100'
              leaveTo='opacity-0'
            >
              <Dialog.Overlay className='fixed inset-0 bg-black bg-opacity-60' />
            </Transition.Child>

            <span
              className='inline-block h-screen align-middle'
              aria-hidden='true'
            >
              &#8203;
            </span>
            <Transition.Child
              as={Fragment}
              enter='ease-out duration-300'
              enterFrom='opacity-0 scale-95'
              enterTo='opacity-100 scale-100'
              leave='ease-in duration-200'
              leaveFrom='opacity-100 scale-100'
              leaveTo='opacity-0 scale-95'
            >
              <div className='my-8 inline-block w-full transform overflow-visible rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-2xl transition-all'>
                <Dialog.Title
                  as='h3'
                  className='text-lg font-medium leading-6 text-white'
                >
                  Edit Pages
                </Dialog.Title>
                <div className='mt-4 grid grid-cols-5'>
                  <div className='col-span-1'>
                    {fields.length > 0 && (
                      <div className='mr-3 rounded-md border border-gray-700'>
                        <div className='space-y-2 p-3'>
                          <p className='font-bold text-white'>Pages</p>
                          {fields.map((field, index) => (
                            <div
                              key={field.id}
                              onClick={() => {
                                setSelectedApps(index);
                              }}
                              className={`flex w-full items-center justify-between rounded-md p-3 ${
                                index === selectedApps ? 'bg-slate-900 font-bold' : ''
                              }`}
                            >
                              <input
                                {...register(`apps.${index}.app_name`)}
                                className='mr-2 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500'
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className='col-span-4'>
                    <form onSubmit={handleSubmit(onSubmit)} className='mt-4'>
                      {fields.map(
                        (field, index) =>
                          selectedApps === index && (
                            <div key={field.id}>
                              <div className='grid grid-cols-3 gap-3'>
                                <div>
                                  <p className='mb-4 text-xl font-bold text-white'>
                                    Page Settings
                                  </p>
                                  <p className='mb-2 text-white'>
                                    Redirect URL - {watch(`apps.${index}.app_name`)}
                                  </p>
                                  <input
                                    placeholder='Redirect URL'
                                    {...register(`apps.${index}.redirect_url`, {
                                      required: true,
                                    })}
                                    className='w-full rounded-md bg-gray-900 p-3 text-white'
                                  />
                                </div>
                              </div>

                              <div className='col-span-3'>
                                <div className='relative mt-3 overflow-x-auto'>
                                  <table className='w-full overflow-y-visible text-left text-sm text-gray-500 rtl:text-right dark:text-gray-400'>
                                    <thead className='bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400'>
                                      <tr>
                                        <th scope='col' className='px-6 py-3'>
                                          Stamp Type
                                        </th>
                                        <th scope='col' className='px-6 py-3'>
                                          Requested Info
                                        </th>
                                        <th scope='col' className='px-6 py-3'>
                                          Required
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {allInfoToRequest.map((stampName) => {
                                        const config = requestedInfo[index]?.[stampName];
                                        const isDisabled =
                                          config?.selectedOption === 'not';

                                        return (
                                          <tr
                                            key={stampName}
                                            className='overflow-y-visible border-b bg-white dark:border-gray-700 dark:bg-gray-800'
                                          >
                                            <th
                                              scope='row'
                                              className='whitespace-nowrap px-6 py-4 font-medium capitalize text-gray-900 dark:text-white'
                                            >
                                              <p className='w-[120px]'>{stampName}</p>
                                            </th>
                                            <td>
                                              <Select
                                                className='w-[200px] text-black'
                                                classNamePrefix='select'
                                                value={INFO_SHARING_OPTIONS.find(
                                                  (option) =>
                                                    option.value ===
                                                    config?.selectedOption
                                                )}
                                                onChange={(option) => {
                                                  setSelectedOption(
                                                    index,
                                                    stampName,
                                                    option?.value
                                                  );
                                                }}
                                                options={INFO_SHARING_OPTIONS}
                                              />
                                            </td>

                                            <td
                                              className={`px-6 py-4 ${
                                                isDisabled
                                                  ? 'pointer-events-none opacity-30'
                                                  : ''
                                              }`}
                                            >
                                              <input
                                                id={`required-${index}-${stampName}`}
                                                type='checkbox'
                                                checked={config?.required ?? false}
                                                onChange={(event) =>
                                                  setAuthInfo(
                                                    stampName,
                                                    event.target.checked,
                                                    index
                                                  )
                                                }
                                                className='h-4 w-4 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600'
                                              />
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )
                      )}
                      <div className='col-span-3 flex justify-end'>
                        <button
                          type='button'
                          onClick={closeModal}
                          className='mr-4 rounded-md bg-red-500 p-2 px-5 text-sm font-semibold text-white'
                        >
                          Close
                        </button>
                        <button
                          type='submit'
                          className={`rounded-md bg-green-500 p-2 px-5 text-sm font-semibold text-white ${
                            loading ? 'pointer-events-none opacity-50' : ''
                          }`}
                          disabled={loading}
                        >
                          {loading ? 'Loading...' : 'Save'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
