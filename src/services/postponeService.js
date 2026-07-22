import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  query,
  where,
  orderBy,
  deleteDoc,
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

// ← لازم يرجع بيانات الطلب (خصوصًا sessionId + originalDate) عشان
//   AppContext يقدر يحدّث الـ occurrence الصحيحة لحالة "makeup"
export async function resolvePostponeRequest(id, newDate, newTime) {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = { id: snap.id, ...snap.data() };

  const resolvedAt = new Date().toISOString();
  await updateDoc(ref, {
    status: "resolved",
    newDate,
    newTime,
    resolvedAt,
  });

  return { ...data, status: "resolved", newDate, newTime, resolvedAt };
}

// ← لازم يرجع array فيه بيانات كل طلب اتحل (sessionId + originalDate بالذات)،
//   عشان AppContext.updateMakeupLocal يقدر يعمل loop عليها ويحدّث الـ
//   occurrence المناسبة لكل واحد لحالة "makeup"
export async function resolvePostponeBySessionId(sessionId, newDate, newTime) {
  const q = query(
    collection(db, COL),
    where("sessionId", "==", sessionId),
    where("status", "==", "pending"),
  );
  const snap = await getDocs(q);

  const resolvedAt = new Date().toISOString();
  const resolvedList = [];

  for (const docSnap of snap.docs) {
    const data = { id: docSnap.id, ...docSnap.data() };
    await updateDoc(doc(db, COL, docSnap.id), {
      status: "resolved",
      newDate,
      newTime,
      resolvedAt,
    });
    resolvedList.push({ ...data, status: "resolved", newDate, newTime, resolvedAt });
  }

  return resolvedList;
}

// ← حذف نهائي لطلب التأجيل المرتبط بحصة أصلية معينة (مش تحديث status)
// بتُستخدم لما نلغي تعويض محدَّد وعايزين الطلب يختفي خالص، مش يفضل resolved
export async function deletePostponeRequestBySessionAndDate(sessionId, originalDate) {
  const q = query(
    collection(db, COL),
    where("sessionId", "==", sessionId),
    where("originalDate", "==", originalDate),
  );
  const snap = await getDocs(q);
  const deletedIds = [];
  for (const docSnap of snap.docs) {
    await deleteDoc(doc(db, COL, docSnap.id));
    deletedIds.push(docSnap.id);
  }
  return deletedIds;
}