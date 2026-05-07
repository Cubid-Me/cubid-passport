import { Dropdown } from 'components/dropdown';
import Link from 'next/link'
import React from 'react';

export const Header = () => {
  return (
    <div className='flex w-full items-center justify-between p-3'>
      <Link href="/admin">
      <p className='text-3xl font-semibold'>Cubid Admin</p>
      </Link>
      <Dropdown />
    </div>
  );
};
