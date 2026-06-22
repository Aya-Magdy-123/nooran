import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";

const COL = "postponeRequests";

export async function getPostponeRequests() {
  const q = query(
    collection(db, COL),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function resolvePostponeRequest(id, newDate, newTime) {
  await updateDoc(doc(db, COL, id), {
    status: "resolved",
    newDate,
    newTime,
    resolvedAt: new Date().toISOString(),
  });
}
export async function resolvePostponeBySessionId(sessionId, newDate, newTime) {
  const q = query(
    collection(db, COL),
    where("sessionId", "==", sessionId),
    where("status", "==", "pending"),
  );
  const snap = await getDocs(q);

  for (const docSnap of snap.docs) {
    await updateDoc(doc(db, COL, docSnap.id), {
      status: "resolved",
      newDate,
      newTime,
      resolvedAt: new Date().toISOString(),
    });
  }
}
