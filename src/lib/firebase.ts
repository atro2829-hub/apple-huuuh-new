import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA7O47G7ekKYSdS_uAAnyov7RHK0m68ETY",
  authDomain: "apple-net-df0e7.firebaseapp.com",
  databaseURL: "https://apple-net-df0e7-default-rtdb.firebaseio.com",
  projectId: "apple-net-df0e7",
  storageBucket: "apple-net-df0e7.firebasestorage.app",
  messagingSenderId: "910060697351",
  appId: "1:910060697351:web:4k86gfb72msn1u5u",
  measurementId: "G-XXXXXXXXXX",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;
