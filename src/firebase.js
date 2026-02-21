import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

// PASTE YOUR FIREBASE CONFIG HERE (from step 7 above)
const firebaseConfig = {
  apiKey: "AIzaSyBh2nsPobhPmvKpCeb2ShO3YjISB5AFpEM",
  authDomain: "balgandharva-bachatgat.firebaseapp.com",
  projectId: "balgandharva-bachatgat",
  storageBucket: "balgandharva-bachatgat.firebasestorage.app",
  messagingSenderId: "351100161259",
  appId: "1:351100161259:web:4aea84ba66edfcb1adc2ae"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// This replaces window.storage to work the same way
window.storage = {
  get: async (key) => {
    try {
      const snap = await getDoc(doc(db, 'storage', key));
      if (snap.exists()) return { key, value: snap.data().value };
      return null;
    } catch (e) { throw e; }
  },
  set: async (key, value) => {
    try {
      await setDoc(doc(db, 'storage', key), { value, updated: new Date().toISOString() });
      return { key, value };
    } catch (e) { throw e; }
  },
  delete: async (key) => {
    try {
      await deleteDoc(doc(db, 'storage', key));
      return { key, deleted: true };
    } catch (e) { throw e; }
  }
};
