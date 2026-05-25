import axios from 'axios';

import firebase, { firebaseConfigError } from './firebase';

type RequestBody = Record<string, unknown> | undefined;

const getAuthHeaders = async () => {
  if (firebaseConfigError) {
    throw new Error(firebaseConfigError);
  }

  const currentUser = firebase.auth().currentUser;

  if (!currentUser) {
    throw new Error('You must be signed in to call admin APIs');
  }

  const token = await currentUser.getIdToken();

  return {
    Authorization: `Bearer ${token}`,
  };
};

export const authedPost = async <TResponse = unknown>(
  url: string,
  body?: RequestBody
) => {
  const headers = await getAuthHeaders();
  return axios.post<TResponse>(url, body, { headers });
};
