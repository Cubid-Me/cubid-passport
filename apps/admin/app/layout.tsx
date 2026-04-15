'use client';

import { OwnIDInit } from '@ownid/react';
import { getAuth, getIdToken, signInWithCustomToken } from 'firebase/auth';
import * as React from 'react';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';

// !STARTERCONF This is for demo purposes, remove @/styles/colors.css import immediately
import 'react-toastify/dist/ReactToastify.css';
import 'rc-tooltip/assets/bootstrap.css';

import { store } from '../redux/store';

// !STARTERCONF Change these default meta
// !STARTERCONF Look at @/constant/config to change them

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <head>
        <script async src='https://cdn.tailwindcss.com' />
      </head>
      <body>
        <OwnIDInit
          config={{
            appId: 'p0zfroqndmvm30',
            firebaseAuth: {
              getAuth,
              getIdToken,
              signInWithCustomToken
            }
          }}
        />
        <ToastContainer />
        <Provider store={store}>{children}</Provider>
      </body>
    </html>
  );
}
