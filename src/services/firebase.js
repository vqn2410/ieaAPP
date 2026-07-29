import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCv1UBmgFpcL6pcC19Hm4ZU9at0YDf0dU4",
  authDomain: "iea-app-73f5f.firebaseapp.com",
  projectId: "iea-app-73f5f",
  storageBucket: "iea-app-73f5f.firebasestorage.app",
  messagingSenderId: "916562010446",
  appId: "1:916562010446:web:8632c1a26bff7accad7e1f",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
