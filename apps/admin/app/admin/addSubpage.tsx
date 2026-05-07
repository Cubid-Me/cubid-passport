import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import Select from 'react-select';

import {
  buildRequestedInfo,
  getInfoSharingTypeId,
  INFO_SHARING_OPTIONS,
  MetadataPayload,
  PageFormValues,
  RequestedInfoByIndex,
  StampTypeRecord,
} from './shared';
import { useAuth } from '../../hooks/useAuth';
import { authedPost } from '../../lib/api';

interface AddSubpageProps {
  dapp_id: number | string;
  fetchSuperApps: () => Promise<void>;
}

interface AddSubpageFormValues {
  apps: PageFormValues[];
}

export function AddSubpage({
  dapp_id,
  fetchSuperApps,
}: AddSubpageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedApps, setSelectedApps] = useState(0);
  const [stampList, setStampList] = useState<StampTypeRecord[]>([]);
  const [requestedInfo, setRequestedInfo] = useState<RequestedInfoByIndex>({});
  const { user } = useAuth();

  const { control, handleSubmit, register, reset, watch } =
    useForm<AddSubpageFormValues>({
      defaultValues: {
        apps: [],
      },
    });

  const { append, fields, remove } = useFieldArray({
    control,
    name: 'apps',
  });

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

  useEffect(() => {
    if (
      allInfoToRequest.length > 0 &&
      Object.keys(requestedInfo).length === 0
    ) {
      setRequestedInfo({ 0: buildRequestedInfo(allInfoToRequest) });
    }
  }, [allInfoToRequest, requestedInfo]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setLoading(false);
    setSelectedApps(0);
    reset({ apps: [] });
    setRequestedInfo(
      allInfoToRequest.length > 0 ? { 0: buildRequestedInfo(allInfoToRequest) } : {}
    );
  }, [allInfoToRequest, reset]);

  const openModal = () => {
    setIsOpen(true);
  };

  const addApp = useCallback(() => {
    const nextIndex = fields.length;
    append({
      app_name: `Page ${nextIndex + 1}`,
      redirect_url: '',
    });
    setRequestedInfo((current) => ({
      ...current,
      [nextIndex]: buildRequestedInfo(allInfoToRequest),
    }));
    setSelectedApps(nextIndex);
  }, [allInfoToRequest, append, fields.length]);

  useEffect(() => {
    if (isOpen && fields.length === 0) {
      addApp();
    }
  }, [addApp, fields.length, isOpen]);

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

  const removeApp = useCallback(
    (index: number) => {
      remove(index);
      setRequestedInfo((current) => {
        const nextEntries = Object.entries(current)
          .filter(([entryIndex]) => Number(entryIndex) !== index)
          .map(([entryIndex, value]) => [
            Number(entryIndex) > index ? Number(entryIndex) - 1 : Number(entryIndex),
            value,
          ]);

        return Object.fromEntries(nextEntries) as RequestedInfoByIndex;
      });
      setSelectedApps((current) => Math.max(0, Math.min(current, fields.length - 2)));
    },
    [fields.length, remove]
  );

  const createSubpages = useCallback(
    async (formValues: AddSubpageFormValues) => {
      if (!user) {
        return;
      }

      setLoading(true);
      await authedPost('/api/admin/pages/create', {
        dappId: dapp_id,
        pages: formValues.apps.map((app, idx) => ({
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
    [allStampTypes, closeModal, dapp_id, fetchSuperApps, requestedInfo, user]
  );

  const onSubmit = (data: AddSubpageFormValues) => {
    void createSubpages(data);
  };

  return (
    <>
      <button
        type='button'
        onClick={openModal}
        className='rounded-md bg-white p-2 px-5 text-sm font-semibold text-black'
      >
        Add Page
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
                  Create Pages
                </Dialog.Title>
                <div className='mt-4 grid grid-cols-5'>
                  <div className='col-span-1'>
                    <button
                      type='button'
                      onClick={addApp}
                      className='mb-4 rounded-md bg-green-500 p-2 px-5 text-sm font-medium text-white'
                    >
                      Add Page
                    </button>
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
                              <button
                                type='button'
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removeApp(index);
                                }}
                                className='rounded-md bg-red-500 p-1 text-xs font-semibold text-white'
                              >
                                Remove
                              </button>
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
