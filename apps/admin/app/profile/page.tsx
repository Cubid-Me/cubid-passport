'use client';
import { Authenticated } from 'components/auth/authenticated';
import { Header } from 'components/header';
import { useAuth } from 'hooks/useAuth';
import React from 'react';

export default function Admin() {
  const { user } = useAuth();
  return (
    <Authenticated>
      <div className='min-h-[100vh] bg-gray-900 text-white antialiased'>
        <Header />
        <div className='p-3 pt-2'>
          <div className='flex w-full items-center justify-between'>
            <p className='text-2xl'>Profile</p>
          </div>
          <div className='mt-2 rounded-md border p-5'>
            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
              <div>
                <p className='text-2xl'>User Email</p>
                <p>{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Authenticated>
  );
}
