import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import Select from 'react-select';

import {
  buildRequestedInfo,
  DappRecord,
  getInfoSharingTypeId,
  getInfoSharingValue,
  INFO_SHARING_OPTIONS,
  MetadataPayload,
  RequestedInfoMap,
  SchemaRecord,
  StampTypeRecord,
} from './shared';
import { useAuth } from '../../hooks/useAuth';
import { authedPost } from '../../lib/api';

interface AppConfigResponse {
  dappStampTypes: Array<{
    include_in_score: boolean;
    info_sharing_type_id: number;
    is_auth_enabled: boolean;
    is_infosharing_required: boolean;
    stamptype_id: number;
  }>;
  stampScore: {
    schema_id: number;
  } | null;
}

interface EditAppFormValues {
  appName: string;
  redirect_url: string;
  schema: number;
  url: string;
}

interface EditAppProps {
  appData: DappRecord & {
    redirect_url?: string | null;
    url?: string | null;
  };
  fetchSuperApps: () => Promise<void>;
}

type SchemaOption = {
  label: string;
  value: number;
};

export function EditApp({ appData, fetchSuperApps }: EditAppProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stampList, setStampList] = useState<StampTypeRecord[]>([]);
  const [schemaList, setSchemaList] = useState<SchemaRecord[]>([]);
  const [requestedInfo, setRequestedInfo] = useState<RequestedInfoMap>({});
  const { user } = useAuth();

  const { handleSubmit, register, setValue, watch } =
    useForm<EditAppFormValues>({
      defaultValues: {
        appName: '',
        redirect_url: '',
        schema: 0,
        url: '',
      },
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
      setSchemaList(data.data.schemas ?? []);
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

  const schemaOptions: SchemaOption[] = schemaList.map((item) => ({
    label: item.description,
    value: item.id,
  }));

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setValue('appName', appData.appname);
    setValue('redirect_url', appData.redirect_url ?? '');
    setValue('url', appData.url ?? '');

    if (stampList.length === 0) {
      return;
    }

    (async () => {
      const { data } = await authedPost<{ data: AppConfigResponse }>(
        '/api/admin/apps/config',
        {
          dappId: appData.id,
        }
      );

      setValue('schema', data.data.stampScore?.schema_id ?? 0);

      const nextRequestedInfo = buildRequestedInfo(allInfoToRequest);
      (data.data.dappStampTypes ?? []).forEach((item) => {
        const stampName = stampList.find(
          (stamp) => stamp.id === item.stamptype_id
        )?.stamptype;

        if (!stampName) {
          return;
        }

        nextRequestedInfo[stampName] = {
          auth: item.is_auth_enabled,
          required: item.is_infosharing_required,
          score: item.include_in_score,
          selectedOption: getInfoSharingValue(item.info_sharing_type_id),
        };
      });

      setRequestedInfo(nextRequestedInfo);
    })();
  }, [allInfoToRequest, appData, isOpen, setValue, stampList]);

  const closeModal = () => {
    setIsOpen(false);
    setLoading(false);
  };

  const openModal = () => {
    setIsOpen(true);
  };

  const setAuthInfo = (stampName: string, value: boolean) => {
    setRequestedInfo((current) => ({
      ...current,
      [stampName]: {
        ...(current[stampName] ?? buildRequestedInfo([stampName])[stampName]),
        required: value,
      },
    }));
  };

  const setSelectedOption = (stampName: string, nextValue: string | undefined) => {
    setRequestedInfo((current) => ({
      ...current,
      [stampName]: {
        ...(current[stampName] ?? buildRequestedInfo([stampName])[stampName]),
        selectedOption: (nextValue ?? 'not') as
          | 'hashed'
          | 'identity'
          | 'json'
          | 'not',
      },
    }));
  };

  const onSubmit = async (formValues: EditAppFormValues) => {
    if (!user) {
      return;
    }

    setLoading(true);
    await authedPost('/api/admin/apps/update', {
      appName: formValues.appName,
      dappId: appData.id,
      redirectUrl: formValues.redirect_url,
      schemaId: formValues.schema,
      stampConfigs: Object.entries(requestedInfo).map(([stampName, config]) => ({
        auth: config.auth,
        infoSharingTypeId: getInfoSharingTypeId(config.selectedOption),
        required: config.required,
        score: config.score,
        stampTypeId: allStampTypes[stampName],
      })),
      url: formValues.url,
    });
    setLoading(false);
    await fetchSuperApps();
    closeModal();
  };

  return (
    <>
      <button type='button' onClick={openModal}>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          fill='none'
          viewBox='0 0 24 24'
          strokeWidth={1.5}
          stroke='currentColor'
          className='h-4 w-4'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125'
          />
        </svg>
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
                  Create App
                </Dialog.Title>
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className='mt-4 grid grid-cols-3 gap-5'
                >
                  <div>
                    <p className='mb-2 text-white'>App Name</p>
                    <input
                      placeholder='App Name'
                      {...register('appName', { required: true })}
                      className='w-full rounded-md bg-gray-900 p-3 text-white'
                    />
                  </div>
                  <div>
                    <p className='mb-2 text-white'>App URL</p>
                    <input
                      placeholder='App URL'
                      {...register('url', { required: true })}
                      className='w-full rounded-md bg-gray-900 p-3 text-white'
                    />
                  </div>
                  <div>
                    <p className='mb-2 text-white'>App Redirect Url</p>
                    <input
                      placeholder='App Redirect URL'
                      {...register('redirect_url', { required: true })}
                      className='w-full rounded-md bg-gray-900 p-3 text-white'
                    />
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
                            const config = requestedInfo[stampName];
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
                                        option.value === config?.selectedOption
                                    )}
                                    onChange={(option) => {
                                      setSelectedOption(
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
                                    id={`required-${stampName}`}
                                    type='checkbox'
                                    checked={config?.required ?? false}
                                    onChange={(event) => {
                                      setAuthInfo(
                                        stampName,
                                        event.target.checked
                                      );
                                    }}
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
                  <div className='col-span-3 ml-auto mt-2 grid w-[fit-content] grid-cols-3 space-x-4'>
                    <div className='w-[300px] overflow-visible'>
                      <p className='mb-2 text-white'>App Schema</p>
                      <div className='h-[fit-content] translate-y-[2px]'>
                        <Select<SchemaOption>
                          options={schemaOptions}
                          className='text-black'
                          classNamePrefix='select'
                          value={schemaOptions.find(
                            (option) => option.value === watch('schema')
                          )}
                          onChange={(option) => {
                            if (option) {
                              setValue('schema', option.value);
                            }
                          }}
                        />
                      </div>
                    </div>
                    <button
                      type='button'
                      className='inline-flex h-[40px] translate-y-8 justify-center rounded-md border border-transparent bg-red-400 px-4 py-2 text-sm text-white duration-300 hover:bg-red-200'
                      onClick={closeModal}
                    >
                      Close
                    </button>
                    <button
                      type='submit'
                      disabled={loading}
                      className='inline-flex h-[40px] translate-y-8 justify-center rounded-md border border-transparent bg-blue-500 px-4 py-2 text-sm text-white duration-300 hover:bg-blue-300'
                    >
                      {loading ? (
                        <div role='status'>
                          <svg
                            aria-hidden='true'
                            className='h-5 w-5 animate-spin fill-blue-200 text-gray-500 dark:text-gray-600'
                            viewBox='0 0 100 101'
                            fill='none'
                            xmlns='http://www.w3.org/2000/svg'
                          >
                            <path
                              d='M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z'
                              fill='currentColor'
                            />
                            <path
                              d='M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z'
                              fill='currentFill'
                            />
                          </svg>
                          <span className='sr-only'>Loading...</span>
                        </div>
                      ) : (
                        'Save'
                      )}
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
