import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDeQMrepTnlldqGycyMzy1qeoaD3g7nxgA",
  authDomain: "applenet711.firebaseapp.com",
  databaseURL: "https://applenet711-default-rtdb.firebaseio.com",
  projectId: "applenet711",
  storageBucket: "applenet711.firebasestorage.app",
  messagingSenderId: "164323561264",
  appId: "1:164323561264:web:2000f0cc595b6d7260c2f5",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;
