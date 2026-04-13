import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

export const createUser = onCall(async (request) => {
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
  
  let isCallerAdmin = auth.uid === HARDCODED_ADMIN_UID;
  
  if (!isCallerAdmin) {
    const userDoc = await admin.firestore().collection("users").doc(auth.uid).get();
    const userData = userDoc.data();
    isCallerAdmin = userData?.isAdmin === true || userData?.role === "admin";
  }

  if (!isCallerAdmin) {
    throw new HttpsError(
      "permission-denied",
      "No eres administrador"
    );
  }

  const { email, password, isAdmin } = data;

  if (!email || !password) {
    throw new HttpsError(
      "invalid-argument",
      "Email y contraseña requeridos"
    );
  }

  // 👤 Crear usuario Auth
  const userRecord = await admin.auth().createUser({
    email,
    password,
  });

  // 🔐 Rol admin
  if (isAdmin) {
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      admin: true,
    });
  }

  // 🗄️ Firestore
  await admin.firestore().collection("users").doc(userRecord.uid).set({
    email,
    isAdmin,
    projects: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});
