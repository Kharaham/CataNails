import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBpuo1fzABUl_6HeDxP-u312JVLZJBVTck",
  authDomain: "registrologindemo.firebaseapp.com",
  projectId: "registrologindemo",
  storageBucket: "registrologindemo.appspot.com",
  messagingSenderId: "1012979230577",
  appId: "1:1012979230577:web:e1439915b395ebe7f0f8d0",
  measurementId: "G-LZFYCC450N",
};

const firebaseApp = initializeApp(firebaseConfig);

const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const storage = getStorage(firebaseApp);

export const addAppointment = async (appointment) => {
  try {
    const docRef = await addDoc(collection(db, "appointments"), appointment);
    console.log("Cita agendada con ID: ", docRef.id);
  } catch (e) {
    console.error("Error al agendar cita: ", e);
  }
};

export { db, auth, storage };

export default firebaseApp;
