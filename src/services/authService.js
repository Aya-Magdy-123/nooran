import {
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";

// ── Login ─────────────────────────────────────────────────────
export async function login(email, password) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const uid = userCredential.user.uid;

  // دور في supervisors
  let userDoc = await getDoc(doc(db, "supervisors", uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    if (data.disabled) {
      await signOut(auth);
      throw new Error("الحساب موقوف، تواصل مع الإدارة");
    }
    return { uid, role: "supervisor", ...data };
  }

  // دور في admins
  userDoc = await getDoc(doc(db, "admins", uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    if (data.disabled) {
      await signOut(auth);
      throw new Error("الحساب موقوف، تواصل مع الإدارة");
    }
    return { uid, role: "admin", ...data };
  }

  throw new Error("المستخدم ليس موجود في النظام");
}

// ── Logout ────────────────────────────────────────────────────
export async function logout() {
  await signOut(auth);
  localStorage.clear();
}

// ── Get current user data ─────────────────────────────────────
export async function getCurrentUser() {
  const user = auth.currentUser;
  if (!user) return null;

  const uid = user.uid;

  let userDoc = await getDoc(doc(db, "supervisors", uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    if (data.disabled) {
      await signOut(auth);
      return null;
    }
    return { uid, role: "supervisor", ...data };
  }

  userDoc = await getDoc(doc(db, "admins", uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    if (data.disabled) {
      await signOut(auth);
      return null;
    }
    return { uid, role: "admin", ...data };
  }

  return null;
}

// ── Change password ───────────────────────────────────────────
export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user) throw new Error("مش مسجل دخول");

  // لازم تعمل re-authenticate الأول
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);

  await updatePassword(user, newPassword);
}

export async function forgotPassword(email) {
  auth.languageCode = "ar";
  await sendPasswordResetEmail(auth, email);
}