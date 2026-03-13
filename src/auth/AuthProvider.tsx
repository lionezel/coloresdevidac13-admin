import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase/config";
import { AuthContext } from "./AuthContext";
import { createUserIfNotExists } from "../firebase/user";
import { doc, getDoc } from "firebase/firestore";

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
        setUserDoc(snap.exists() ? snap.data() : null);
      } else {
        setUser(null);
        setUserDoc(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userDoc, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
