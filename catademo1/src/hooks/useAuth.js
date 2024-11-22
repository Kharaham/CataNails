import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import firebaseApp from "../firebase/firebase";

const firestore = getFirestore(firebaseApp);

const useAuth = () => {
  const [user, setUser] = useState(null);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuarioFirebase) => {
      if (usuarioFirebase) {
        const docRef = doc(firestore, `usuarios/${usuarioFirebase.uid}`);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const userData = {
            uid: usuarioFirebase.uid,
            email: usuarioFirebase.email,
            nombre: docSnap.data().nombre,
            telefono: docSnap.data().telefono,
            profilePic: docSnap.data().profilePic,
          };
          setUser(userData);
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  return { user, setUser }; // Devolver setUser
};

export default useAuth;
