import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
    admin.initializeApp();
}

export const updateUserAuth = onCall(async (request) => {
  const { auth, data } = request;

  // 🔒 Verificar autenticación
  if (!auth) {
    throw new HttpsError(
      "unauthenticated",
      "Debes estar autenticado"
    );
  }

  // 🔒 Verificar admin (usando la lógica del proyecto: UID hardcodeado o Firestore)
  const HARDCODED_ADMIN_UID = "THtaTpKF7mOcSS5VbJtGtkZu9z82";
  
  let isAdmin = auth.uid === HARDCODED_ADMIN_UID;
  
  if (!isAdmin) {
    const userDoc = await admin.firestore().collection("users").doc(auth.uid).get();
    const userData = userDoc.data();
    isAdmin = userData?.isAdmin === true || userData?.role === "admin";
  }

  if (!isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "No eres administrador"
    );
  }

  const { uid, email, password } = data;

  if (!uid) {
    throw new HttpsError(
      "invalid-argument",
      "UID del usuario requerido"
    );
  }

  try {
    const updateData: admin.auth.UpdateRequest = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password;

    if (Object.keys(updateData).length === 0) {
        return { success: true, message: "Nada que actualizar" };
    }

    await admin.auth().updateUser(uid, updateData);
    
    return { success: true };
  } catch (error: any) {
    console.error("Error updating user auth:", error);
    throw new HttpsError(
      "internal",
      error.message || "Error al actualizar el usuario en Authentication"
    );
  }
});
