import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyA9ZoAkeq7ImygjSI8qwkZSTzSjAnCbH1M',
  authDomain: 'gen-lang-client-0108886166.firebaseapp.com',
  projectId: 'gen-lang-client-0108886166',
  storageBucket: 'gen-lang-client-0108886166.firebasestorage.app',
  messagingSenderId: '1066350285915',
  appId: '1:1066350285915:web:f0615cf2f76287cf3adb7e',
  measurementId: 'G-5B84V15C5H',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
