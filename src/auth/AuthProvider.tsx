import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase/config";
import { AuthContext } from "./AuthContext";
import { createUserIfNotExists } from "../firebase/user";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [userDoc, setUserDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);
        await createUserIfNotExists(firebaseUser);

        const userRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(userRef);

        setUser(firebaseUser);
        if (snap.exists()) {
          const data = snap.data();
          // 🔥 Fix: Forzar admin para el usuario actual si no tiene el rol
          if (firebaseUser.uid === "THtaTpKF7mOcSS5VbJtGtkZu9z82" && !data.isAdmin) {
            console.log("PROMOTING UID TO ADMIN:", firebaseUser.uid);
            await updateDoc(userRef, { isAdmin: true, role: "admin" });
            data.isAdmin = true;
            data.role = "admin";
            console.log("PROMOTION SUCCESSFUL");
          }
          console.log("AuthProvider - final userDoc:", data);
          setUserDoc({ id: snap.id, ...data });
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
