import { collection, getDocs, doc, setDoc, updateDoc } from "firebase/firestore"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth, db } from "../../firebase"

// ── إضافة أدمن ────────────────────────────────────────────────
export async function addAdmin({ email }) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, "123456")

  const uid = userCredential.user.uid

  await setDoc(doc(db, "admins", uid), {
    email,
    role:      "admin",
    uid,
    createdAt: new Date().toISOString(),
  })

  return { id: uid, email }
}

// ── جلب كل الأدمنز ────────────────────────────────────────────
export async function getAdmins() {
  const snap = await getDocs(collection(db, "admins"))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── إيقاف / تفعيل أدمن ────────────────────────────────────────
export async function toggleAdminStatus(uid, disabled) {
  await updateDoc(doc(db, "admins", uid), { disabled })
  return disabled
}