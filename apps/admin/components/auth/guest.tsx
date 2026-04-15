'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

import { useAuth } from '../../hooks/useAuth';

interface GuestProps {
  children: ReactNode;
}

export const Guest = ({ children }: GuestProps) => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [unverified, setUnverified] = useState(false);

  useEffect(() => {
    if (loading === true) {
      return;
    }

    if (user) {
      router.push('/admin');
    } else {
      setUnverified(true);
    }
  }, [loading, router, user]);

  if (!unverified) {
    return null;
  }

  return <>{children}</>;
};
