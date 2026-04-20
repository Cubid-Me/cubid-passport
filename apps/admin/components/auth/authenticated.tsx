'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

import { useAuth } from '../../hooks/useAuth';

interface AuthenticatedProps {
  children: ReactNode;
}

export const Authenticated = ({ children }: AuthenticatedProps) => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (loading === true) {
      return;
    }

    if (!user) {
      router.push('/');
    } else {
      setVerified(true);
    }
  }, [loading, router, user]);

  if (!verified) {
    return null;
  }

  return <>{children}</>;
};
