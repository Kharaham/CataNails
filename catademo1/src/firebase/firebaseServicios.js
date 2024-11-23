import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBpuo1fzABUl_6HeDxP-u312JVLZJBVTck",
  authDomain: "registrologindemo.firebaseapp.com",
  projectId: "registrologindemo",
  storageBucket: "registrologindemo.appspot.com",
  messagingSenderId: "1012979230577",
  appId: "1:1012979230577:web:e1439915b395ebe7f0f8d0",
  measurementId: "G-LZFYCC450N",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
