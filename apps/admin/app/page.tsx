'use client';

import { Guest } from 'components/auth/guest';
import Link from 'next/link';

export default function Component() {
  return (
    <Guest>
      <section className='min-h-[100vh] bg-white dark:bg-gray-900'>
        <div className='mx-auto max-w-screen-xl px-4 py-8 pt-[25vh] text-center lg:px-12'>
          <a
            href='#'
            className='mb-7 inline-flex items-center justify-between rounded-full bg-gray-100 px-1 py-1 pr-4 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700'
            role='alert'
          >
            <span className='mr-3 rounded-full bg-blue-500 px-4 py-1.5 text-xs text-white'>
              New
            </span>{' '}
            <span className='text-sm font-medium'>
              Now integrate data from Cubid Passport into your apps
            </span>
            <svg
              className='ml-2 h-5 w-5'
              fill='currentColor'
              viewBox='0 0 20 20'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                fill-rule='evenodd'
                d='M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z'
                clipRule='evenodd'
              ></path>
            </svg>
          </a>
          <h1 className='mb-4 text-4xl font-extrabold leading-none tracking-tight text-gray-900 dark:text-white md:text-5xl lg:text-6xl'>
            Cubid Admin
          </h1>
          <p className='mb-8 text-lg font-normal text-gray-500 dark:text-gray-400 sm:px-16 lg:text-xl xl:px-48'>
            Manage your apps and API-KEYS and users effectively
          </p>
          <div className='mb-8 flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-x-4 sm:space-y-0 lg:mb-16'>
            <Link
              href='/sign-in'
              className='inline-flex items-center justify-center rounded-lg bg-blue-700 px-5 py-3 text-center text-base font-medium text-white hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-900'
            >
              Sign In
              <svg
                className='-mr-1 ml-2 h-5 w-5'
                fill='currentColor'
                viewBox='0 0 20 20'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  fill-rule='evenodd'
                  d='M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z'
                  clipRule='evenodd'
                ></path>
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </Guest>
  );
}
