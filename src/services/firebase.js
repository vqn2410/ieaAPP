import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCv1UBmgFpcL6pcC19Hm4ZU9at0YDf0dU4",
  authDomain: "iea-app-73f5f.firebaseapp.com",
  projectId: "iea-app-73f5f",
  storageBucket: "iea-app-73f5f.firebasestorage.app",
  messagingSenderId: "916562010446",
  appId: "1:916562010446:web:8632c1a26bff7accad7e1f",
  measurementId: "G-E1B3FWX8SG"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage, analytics };
