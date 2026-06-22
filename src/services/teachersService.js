import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

const COL = "teachers";

export async function getTeachers() {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addTeacher({ name, phone, program, shift }) {
  const docRef = await addDoc(collection(db, COL), {
    name,
    phone,
    program: program || "",
    shift: shift || "",
    isDeleted: false,
    createdAt: new Date().toISOString(),
    role: "teacher",
  });
  return { id: docRef.id, name, phone, program, shift };
}

export async function updateTeacher(id, { name, phone, program, shift }) {
  await updateDoc(doc(db, COL, id), { name, phone, program, shift });
}

export async function deleteTeacher(id) {
  await updateDoc(doc(db, COL, id), { isDeleted: true });
}
