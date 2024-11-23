import firebaseApp from "../firebase/firebase";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

export async function registrarUsuario(email, password, rol) {
  try {
    const infoUsuario = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const docuRef = doc(firestore, `usuarios/${infoUsuario.user.uid}`);
    await setDoc(docuRef, { correo: email, rol: rol });
    return infoUsuario.user.uid;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function iniciarSesion(email, password) {
  try {
    const usuario = await signInWithEmailAndPassword(auth, email, password);
    return usuario.user.uid;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getRol(uid) {
  const docRef = doc(firestore, `usuarios/${uid}`);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().rol;
  } else {
    throw new Error("No se encontró el documento del usuario.");
  }
}
