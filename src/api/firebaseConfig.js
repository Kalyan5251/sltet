import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDshLKjupZDOnDs1amjFc3MSp9CG-yQ5d0",
  authDomain: "tourexpensetracker.firebaseapp.com",
  projectId: "tourexpensetracker",
  storageBucket: "tourexpensetracker.firebasestorage.app",
  messagingSenderId: "904771611368",
  appId: "1:904771611368:android:cdc0f08028488b2172375d"
};

const app = initializeApp(firebaseConfig);

// Using standard getFirestore to prevent the 'IndexedDB persistence is only
// available on platforms that support it' crash within Expo Android. 
const db = getFirestore(app);

const auth = getAuth(app);

export { db, auth };
