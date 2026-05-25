import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import firebase, { firebaseConfigError } from '../lib/firebase';
import { login, logout } from '../redux/userSlice';

export const useAuth = () => {
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (firebaseConfigError) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        const setUserData = {
          id: user.uid,
          avatar: user.photoURL,
          email: user.email,
          name: user.displayName || user.email
        };
        setUser(setUserData);
        dispatch(login(setUserData as any)); // if a user is found, set user in Redux store
      } else {
        setUser(null);
        dispatch(logout());
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dispatch]);

  return { loading, user };
};

export default useAuth;
