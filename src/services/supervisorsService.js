import {
  collection,
  doc,
  getDocs,
  updateDoc,
  getDoc,
  query,
  where,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import {
  reassignAbsentSupervisor,
  redistributeShift,
} from "./distributionService"; // ← جديد

const COL = "supervisors";

export async function getSupervisors() {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addSupervisor({ name, email, phone, shift, isActive }) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    "123456",
  );
  await updateProfile(userCredential.user, { displayName: name });
  const uid = userCredential.user.uid;

  await setDoc(doc(db, COL, uid), {
    name,
    email,
    phone,
    shift,
    isActive: isActive ?? true,
    isDeleted: false,
    role: "supervisor",
    uid,
    createdAt: new Date().toISOString(),
  });

  return { id: uid, name, email, phone, isActive };
}

export async function updateSupervisor(id, { name, phone, shift, isActive }) {
  await updateDoc(doc(db, COL, id), { name, phone, shift, isActive });
}

export async function deleteSupervisor(id) {
  await updateDoc(doc(db, COL, id), { isDeleted: true });
}

export async function restoreSupervisor(id) {
  await updateDoc(doc(db, COL, id), { isDeleted: false });
}

export async function toggleAbsent(id) {
  const docSnap = await getDoc(doc(db, COL, id));
  if (!docSnap.exists()) throw new Error("المشرف مش موجود");

  const supData = docSnap.data();
  const newState = !supData.isActive;

  await updateDoc(doc(db, COL, id), { isActive: newState });

  if (!newState) {
    await reassignAbsentSupervisor(id, supData.shift); // ← من distributionService
  } else {
    await redistributeShift(supData.shift); // ← من distributionService
  }

  return newState;
}
