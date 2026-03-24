import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase/config";
import { AuthContext } from "./AuthContext";
import { createUserIfNotExists } from "../firebase/user";
import { doc, getDoc, updateDoc, collectionGroup, query, where, getDocs, setDoc } from "firebase/firestore";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [userDoc, setUserDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);

        const userRef = doc(db, "users", firebaseUser.uid);
        let snap = await getDoc(userRef);
        let data = snap.exists() ? snap.data() : null;

        if (!data) {
          // Si no está en la colección global, buscamos en todas las subcolecciones de restaurantes
          console.log("User not found in global 'users', searching in subcollections...");
          const q = query(collectionGroup(db, "users"), where("uid", "==", firebaseUser.uid));
          const groupSnap = await getDocs(q);
          
          if (!groupSnap.empty) {
            data = groupSnap.docs[0].data();
            console.log("User found in subcollection:", data);
            // Sincronizar con el documento global para futuros logins rápidos
            await setDoc(userRef, data);
          } else {
            // Si REALMENTE no existe en ningún lado, crear por primera vez
            await createUserIfNotExists(firebaseUser);
            snap = await getDoc(userRef);
            data = snap.exists() ? snap.data() : null;
          }
        }

        setUser(firebaseUser);
        if (data) {
          // 🔥 Fix: Forzar admin para el usuario actual si no tiene el rol
          if (firebaseUser.uid === "THtaTpKF7mOcSS5VbJtGtkZu9z82" && !data.isAdmin) {
            console.log("PROMOTING UID TO ADMIN:", firebaseUser.uid);
            await updateDoc(userRef, { isAdmin: true, role: "admin" });
            data.isAdmin = true;
            data.role = "admin";
            console.log("PROMOTION SUCCESSFUL");
          }
          console.log("AuthProvider - final userDoc:", data);
          setUserDoc({ id: firebaseUser.uid, ...data });
        } else {
          setUserDoc(null);
        }
      } else {
        setUser(null);
        setUserDoc(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  const isAdmin = userDoc?.isAdmin === true || userDoc?.role === "admin" || user?.uid === "THtaTpKF7mOcSS5VbJtGtkZu9z82";
  const canCreate = isAdmin || userDoc?.permissions?.canCreate === true;
  const canEdit = isAdmin || userDoc?.permissions?.canEdit === true;
  const canDelete = isAdmin || userDoc?.permissions?.canDelete === true;

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, canCreate, canEdit, canDelete }}>
      {children}
    </AuthContext.Provider>
  );
};
