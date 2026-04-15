import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

if (!firebase.apps.length) {
  firebase.initializeApp({
    apiKey: "AIzaSyDw83-gENumukAXAy_ZQW3YeixTwAM8TTk",
    authDomain: "cubid-c6ac4.firebaseapp.com",
    projectId: "cubid-c6ac4",
    storageBucket: "cubid-c6ac4.appspot.com",
    messagingSenderId: "474272043641",
    appId: "1:474272043641:web:ebfc6f7ac57fa18fb93aa8",
    measurementId: "G-Q8WPWQ6HS4",
  });
}

export default firebase;
