import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCv1UBmgFpcL6pcC19Hm4ZU9at0YDf0dU4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "iea-app-73f5f.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "iea-app-73f5f",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "iea-app-73f5f.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "916562010446",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:916562010446:web:8632c1a26bff7accad7e1f",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
