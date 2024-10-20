// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore"; 

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
   apiKey: "AIzaSyBpuo1fzABUl_6HeDxP-u312JVLZJBVTck",
    authDomain: "registrologindemo.firebaseapp.com",
    projectId: "registrologindemo",
    storageBucket: "registrologindemo.appspot.com",
    messagingSenderId: "1012979230577",
    appId: "1:1012979230577:web:e1439915b395ebe7f0f8d0",
    measurementId: "G-LZFYCC450N"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Función para agregar una cita
export const addAppointment = async (appointment) => {
  try {
    const docRef = await addDoc(collection(db, "appointments"), appointment);
    console.log("Cita agendada con ID: ", docRef.id);
  } catch (e) {
    console.error("Error al agendar cita: ", e);
  }
};
export { db};