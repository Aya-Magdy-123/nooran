import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

const COL = "programs";

export async function getPrograms() {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addProgram({ name, description, image }) {
  const docRef = await addDoc(collection(db, COL), {
    name,
    description: description || "",
    image: image || "",
    isDeleted: false,
    createdAt: new Date().toISOString(),
  });
  return { id: docRef.id, name, description, image };
}

export async function updateProgram(id, { name, description, image }) {
  await updateDoc(doc(db, COL, id), { name, description, image });
}

export async function deleteProgram(id) {
  await updateDoc(doc(db, COL, id), { isDeleted: true });
}
