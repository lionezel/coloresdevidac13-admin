import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, firebaseConfig } from "./config";
import { User, createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";

export const createUserIfNotExists = async (user: User) => {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
        const isAdmin = user.uid === "THtaTpKF7mOcSS5VbJtGtkZu9z82";
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            createdAt: serverTimestamp(),
            role: isAdmin ? "admin" : "user",
            isAdmin: isAdmin,
            permissions: {
                allowedPages: ["billing"], // Allow billing by default for now, or keep empty []
                canCreate: true,
                canEdit: true,
                canDelete: false,
            }
        });
    }
};

/**
 * Crea un usuario en Firebase Auth sin cerrar la sesión actual del administrador.
 */
export const createAuthUser = async (email: string, pass: string) => {
    // 1. Crear app secundaria temporal
    const tempApp = initializeApp(firebaseConfig, "temp-app-" + Date.now());
    const tempAuth = getAuth(tempApp);

    try {
        // 2. Crear usuario
        const userCredential = await createUserWithEmailAndPassword(tempAuth, email, pass);
        const user = userCredential.user;

        // 3. Cerrar sesión en la app temporal (opcional pero recomendado)
        await signOut(tempAuth);
        
        // 4. Eliminar app temporal
        await deleteApp(tempApp);

        return user.uid;
    } catch (error) {
        await deleteApp(tempApp);
        throw error;
    }
};
