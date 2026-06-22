import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

const COL = "sessions";
const PAGE_SIZE = 20;

// ── جيب كل الحلقات ───────────────────────────────────────────
export async function getSessions() {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── عدد الحلقات الكلي ────────────────────────────────────────
export async function getSessionsCount() {
  const snap = await getCountFromServer(
    query(collection(db, COL), where("isDeleted", "==", false)),
  );
  return snap.data().count;
}

// ── جيب صفحة ─────────────────────────────────────────────────
export async function getSessionsPage(lastDoc = null) {
  let q = query(
    collection(db, COL),
    where("isDeleted", "==", false),
    orderBy("sessionNumber", "desc"),
    limit(PAGE_SIZE),
  );
  if (lastDoc)
    q = query(
      collection(db, COL),
      where("isDeleted", "==", false),
      orderBy("sessionNumber", "desc"),
      startAfter(lastDoc),
      limit(PAGE_SIZE),
    );
  const snap = await getDocs(q);
  return {
    sessions: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    firstDoc: snap.docs[0] ?? null,
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === PAGE_SIZE,
  };
}

// ── جيب حلقات مشرف معين ──────────────────────────────────────
export async function getSupervisorSessions(supervisorId) {
  const q = query(
    collection(db, COL),
    where("supervisorId", "==", supervisorId),
    where("isDeleted", "==", false),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── إضافة حلقة مع توزيع تلقائي ──────────────────────────────
export async function addSession(form, teacherName) {
  // auto increment sessionNumber
  const allSnap = await getDocs(collection(db, COL));
  const maxNumber = allSnap.docs.reduce((max, d) => {
    const num = parseInt(d.data().sessionNumber) || 0;
    return num > max ? num : max;
  }, 0);
  const sessionNumber = maxNumber + 1;

  // تحديد المشرف تلقائياً
  let supervisorId = null;
  let supervisorName = "";

  const sessionShift = _getSessionShift({
    trialTime: form.trialTime,
    regularDates: form.regularDates,
  });

  if (sessionShift) {
    const supsQ = query(
      collection(db, "supervisors"),
      where("shift", "==", sessionShift),
      where("isActive", "==", true),
      where("isDeleted", "==", false),
    );
    const supsSnap = await getDocs(supsQ);
    const availableSups = supsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (availableSups.length) {
      const existingSessions = allSnap.docs.map((d) => d.data());
      const counts = {};
      availableSups.forEach((s) => {
        counts[s.id] = 0;
      });
      existingSessions
        .filter((s) => _getSessionShift(s) === sessionShift)
        .forEach((s) => {
          if (s.supervisorId && counts[s.supervisorId] !== undefined)
            counts[s.supervisorId]++;
        });

      const assigned = availableSups.reduce(
        (min, s) => (counts[s.id] < counts[min.id] ? s : min),
        availableSups[0],
      );

      supervisorId = assigned.id;
      supervisorName = assigned.name;
    }
  }

  const docRef = await addDoc(collection(db, COL), {
    studentName: form.name || "",
    studentPhone: form.phone || "",
    country: form.country || "",
    contactMethod: form.contactMethod || "",
    sessionNumber,
    teacherId: form.teacherId || null,
    teacherName: teacherName || "",
    supervisorId,
    supervisorName,
    program: form.program || "",
    status: form.status || "trial",
    trialDate: form.trialDate || "",
    trialTime: form.trialTime || "",
    trialTeacherTime: form.trialTeacherTime || "",
    regularDates: form.regularDates || [],
    pauseType: form.pauseType || "",
    pauseUntil: form.pauseUntil || "",
    notes: form.notes || "",
    flagged: false,
    makeup: null,
    isDeleted: false,
    createdAt: new Date().toISOString(),
  });

  return { id: docRef.id, sessionNumber };
}

// ── تعديل حلقة ───────────────────────────────────────────────
export async function updateSession(id, form, teacherName) {
  await updateDoc(doc(db, COL, id), {
    studentName: form.name || "",
    studentPhone: form.phone || "",
    country: form.country || "",
    contactMethod: form.contactMethod || "",
    teacherId: form.teacherId || null,
    teacherName: teacherName || "",
    program: form.program || "",
    status: form.status,
    trialDate: form.trialDate || "",
    trialTime: form.trialTime || "",
    trialTeacherTime: form.trialTeacherTime || "",
    regularDates: form.regularDates || [],
    pauseType: form.pauseType || "",
    pauseUntil: form.pauseUntil || "",
    notes: form.notes || "",
    flagged: form.flagged || false,
    makeup: form.makeup ?? null,
  });
}

// ── toggle flagged ────────────────────────────────────────────
export async function toggleFlag(id) {
  const docSnap = await getDoc(doc(db, COL, id));
  const current = docSnap.data().flagged || false;
  await updateDoc(doc(db, COL, id), { flagged: !current });
  return !current;
}

// ── تحديث التعويض ─────────────────────────────────────────────
export async function updateMakeup(id, makeup) {
  await updateDoc(doc(db, COL, id), { makeup: makeup ?? null });
}

// ── soft delete ───────────────────────────────────────────────
export async function deleteSession(id) {
  await updateDoc(doc(db, COL, id), { isDeleted: true });
}

// ── helper ────────────────────────────────────────────────────
function _getSessionShift(session) {
  const time = session.trialTime || session.regularDates?.[0]?.time;
  if (!time) return null;
  const hour = parseInt(time.split(":")[0]);
  if (hour >= 4 && hour < 12) return "morning";
  if (hour >= 12 && hour < 20) return "afternoon";
  return "evening";
}
