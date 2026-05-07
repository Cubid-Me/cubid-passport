'use client';
import { OwnID } from '@ownid/react';
import { Guest } from 'components/auth/guest';
import { useRef } from 'react';
import { toast } from 'react-toastify';

import { authedPost } from '../../lib/api';
import firebase from '../../lib/firebase';

interface OwnIdLoginPayload {
  idToken: string;
}

export default function SignIn() {
  const emailField = useRef<HTMLInputElement | null>(null);
  const passwordField = useRef<HTMLInputElement | null>(null);

  const submit = async (values: OwnIdLoginPayload) => {
    try {
      await firebase.auth().signInWithCustomToken(values.idToken);
      await authedPost('/api/admin/auth/sync', {});
      toast.success('Successfully logged into cubid');
    } catch {
      toast.error('An error while authenticating user');
    }
  };

  return (
    <Guest>
      <section className='min-h-[100vh] bg-gray-50 dark:bg-gray-900'>
        <div className='mx-auto flex flex-col items-center justify-center px-6 py-8 md:h-screen lg:py-0'>
          <p className='mb-6 flex items-center text-2xl font-semibold text-gray-900 dark:text-white'>
            Cubid Admin
          </p>
          <div className='w-full rounded-lg bg-white shadow dark:border dark:border-gray-700 dark:bg-gray-800 sm:max-w-md md:mt-0 xl:p-0'>
            <div className='space-y-4 p-6 sm:p-8 md:space-y-6'>
              <h1 className='text-xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white md:text-2xl'>
                Sign in
              </h1>
              <form className='space-y-4 md:space-y-6'>
                <div>
                  <label
                    htmlFor='email'
                    className='mb-2 block text-sm font-medium text-gray-900 dark:text-white'
                  >
                    Your email
                  </label>
                  <input
                    type='email'
                    name='email'
                    id='email'
                    ref={emailField}
                    className='focus:ring-primary-600 focus:border-primary-600 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500 sm:text-sm'
                    placeholder='name@company.com'
                  />
                </div>
                <div>
                  <label
                    htmlFor='password'
                    className='mb-2 hidden text-sm font-medium text-gray-900 dark:text-white'
                  >
                    Password
                  </label>
                  <input
                    type='password'
                    name='password'
                    ref={passwordField}
                    id='password'
                    className='hidden'
                    placeholder='**********'
                  />
                </div>

                <OwnID
                  type='login'
                  options={{
                    appId: process.env.NEXT_PUBLIC_OWNID_APP_ID ?? '',
                    variant: 'ownid-auth-button',
                    infoTooltip: true,
                    widgetPosition: 'start',
                  }}
                  onLogin={submit}
                  infoTooltip={true}
                  passwordField={passwordField}
                  loginIdField={emailField}
                  onError={() => {
                    toast.error('Authentication failed');
                  }}
                />
              </form>
            </div>
          </div>
        </div>
      </section>
    </Guest>
  );
}
