import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyCZUa9fJidnkS_0cs-BoKKfXOTSquy6thw",
  authDomain: "store-d17ce.firebaseapp.com",
  projectId: "store-d17ce",
  storageBucket: "store-d17ce.appspot.com",
  messagingSenderId: "421462810786",
  appId: "1:421462810786:web:c807a6b2ab734358f477fb",
  measurementId: "G-9M6J740X2D"
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app)
export const functions = getFunctions(app);