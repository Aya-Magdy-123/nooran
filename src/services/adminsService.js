import { doc, setDoc } from "firebase/firestore"
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth"
import { auth, db } from "../firebase"

// ── إضافة أدمن ────────────────────────────────────────────────
export async function addAdmin({ name, email, phone }) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, "123456")
  await updateProfile(userCredential.user, { displayName: name })

  const uid = userCredential.user.uid

  await setDoc(doc(db, "admins", uid), {
    name,
    email,
    phone,
    role:      "admin",
    uid,
    createdAt: new Date().toISOString(),
  })

  return { id: uid, name, email, phone }
}