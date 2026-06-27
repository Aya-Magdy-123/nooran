import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase";

export function getSessionShift(session) {
  const time =
    session.status === "trial"
      ? session.trialTime
      : session.status === "active"
        ? session.regularDates?.[0]?.time
        : "";

  if (!time) return null;

  const hour = parseInt(time.split(":")[0]);
  if (hour >= 4 && hour < 12) return "morning";
  if (hour >= 12 && hour < 20) return "afternoon";
  return "evening";
}

// ── الحالات اللي ميتوزّعش عليها مشرف خالص ──
const NO_SUPERVISOR_STATUSES = ["cancelled", "paused"];

function roundRobin(sessions, supervisors) {
  return sessions.map((session, i) => {
    const sup = supervisors[i % supervisors.length];
    return { ...session, supervisorId: sup.id, supervisorName: sup.name };
  });
}

// ───────────────────────────────────────────────────────────────
// ← إعادة توزيع حلقات مشرف غائب على باقي المشرفين المتاحين بنفس الشفت
//   بمعزل تام عن تاريخ الحلقة — أي حلقة مؤهلة (active/trial) تابعة
//   للمشرف ده لازم تتنقل لمشرف تاني، بغض النظر عن يوم/تاريخ ميعادها.
// ───────────────────────────────────────────────────────────────
export async function reassignAbsentSupervisor(absentId, shift) {
  if (!shift) return; // حارس أمان: تجاهل لو الشفت غير محدد

  const sessionsSnap = await getDocs(
    query(
      collection(db, "sessions"),
      where("status", "not-in", NO_SUPERVISOR_STATUSES),
      where("supervisorId", "==", absentId),
      where("isDeleted", "==", false),
    ),
  );

  if (sessionsSnap.empty) return;

  const sessions = sessionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const supsSnap = await getDocs(
    query(
      collection(db, "supervisors"),
      where("shift", "==", shift),
      where("isActive", "==", true),
      where("isDeleted", "==", false),
    ),
  );
  const available = supsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => s.id !== absentId);

  const batch = writeBatch(db);

  if (!available.length) {
    // مفيش مشرفين تانيين متاحين في هذا الشفت — نمسح المشرف من كل حلقاته
    sessions.forEach((s) => {
      batch.update(doc(db, "sessions", s.id), {
        supervisorId: null,
        supervisorName: "",
        unassignedAt: new Date().toISOString(),
      });
    });
    await batch.commit();
    return;
  }

  roundRobin(sessions, available).forEach((s) => {
    batch.update(doc(db, "sessions", s.id), {
      supervisorId: s.supervisorId,
      supervisorName: s.supervisorName,
      reassignedFrom: absentId,
      reassignedAt: new Date().toISOString(),
    });
  });
  await batch.commit();
}

// ───────────────────────────────────────────────────────────────
// ← إعادة توزيع كل حلقات شفت معيّن على المشرفين المتاحين فيه.
//   بمعزل تام عن تاريخ الحلقة — بتشمل أي حلقة مؤهلة (active/trial)
//   في هذا الشفت، بغض النظر عن يوم/تاريخ ميعادها.
// ───────────────────────────────────────────────────────────────
export async function redistributeShift(shift) {
  if (!shift) return; // حارس أمان: تجاهل لو الشفت غير محدد

  const snapshot = await getDocs(
    query(
      collection(db, "sessions"),
      where("status", "not-in", NO_SUPERVISOR_STATUSES),
      where("isDeleted", "==", false),
    ),
  );
  const allSessions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  const sessions = allSessions.filter((s) => getSessionShift(s) === shift);

  if (!sessions.length) return;

  const supsSnap = await getDocs(
    query(
      collection(db, "supervisors"),
      where("shift", "==", shift),
      where("isActive", "==", true),
      where("isDeleted", "==", false),
    ),
  );
  const supervisors = supsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const batch = writeBatch(db);

  if (!supervisors.length) {
    // مفيش مشرفين متاحين خالص في هذا الشفت — نمسح المشرف من كل حلقاته
    // بدل ما نسيبهم بمشرف قديم محذوف/غير موجود فعليًا
    sessions.forEach((s) => {
      batch.update(doc(db, "sessions", s.id), {
        supervisorId: null,
        supervisorName: "",
        unassignedAt: new Date().toISOString(),
      });
    });
    await batch.commit();
    return;
  }

  roundRobin(sessions, supervisors).forEach((s) => {
    batch.update(doc(db, "sessions", s.id), {
      supervisorId: s.supervisorId,
      supervisorName: s.supervisorName,
      reassignedAt: new Date().toISOString(),
    });
  });
  await batch.commit();
}

// ── مقارنة عميقة بسيطة بين مصفوفتين من المواعيد (regularDates) ──
function regularDatesChanged(oldDates, newDates) {
  const a = oldDates || [];
  const b = newDates || [];
  if (a.length !== b.length) return true;
  return JSON.stringify(a) !== JSON.stringify(b);
}

// ───────────────────────────────────────────────────────────────
// ── توزيع/إزالة مشرف لحلقة واحدة بمفردها — تُستخدم عند التعديل ──
// ───────────────────────────────────────────────────────────────
//
// تُستدعى من updateSession (sessionsService.js) كل ما تتغيّر حالة الحلقة
// أو تتغيّر مواعيدها (regularDates/trialTime).
// بتأثر بس على الحلقة المعدَّلة، مالهاش أي تأثير على باقي حلقات الشفت.
//
// المنطق:
//  - لو الحالة الجديدة cancelled أو paused → تشال المشرف خالص (يظهر "—" في الواجهة).
//  - لو الحالة الجديدة active أو trial وكانت الحالة القديمة مختلفة عنها،
//    أو المواعيد اتغيّرت (مما يعني الشفت ممكن يكون اتغيّر) → يتوزّع عليها
//    مشرف تلقائيًا بمنطق "الأقل عددًا" (نفس منطق addSession في sessionsService.js).
//  - لو الحالة الجديدة زي القديمة بالظبط والمواعيد متغيّرتش → مفيش أي تغيير
//    على المشرف، يفضل كما هو.

export async function reassignSessionOnStatusChange(sessionId, oldStatus, newStatus, sessionData) {
  const { regularDates, oldRegularDates, trialTime } = sessionData;

  // لا الحالة اتغيّرت ولا المواعيد اتغيّرت → مفيش حاجة نعملها
  if (oldStatus === newStatus && !regularDatesChanged(oldRegularDates, regularDates)) {
    return;
  }

  const sessionRef = doc(db, "sessions", sessionId);

  // ── الحالة الجديدة ملغي/متوقف → نشيل المشرف خالص ──
  if (NO_SUPERVISOR_STATUSES.includes(newStatus)) {
    await updateDoc(sessionRef, {
      supervisorId: null,
      supervisorName: "",
      unassignedAt: new Date().toISOString(),
    });
    return;
  }

  // ── الحالة الجديدة نشط/تجريبي → نوزّع مشرف جديد تلقائيًا ──
  if (newStatus === "active" || newStatus === "trial") {
    const shift = getSessionShift({ status: newStatus, trialTime, regularDates });
    if (!shift) return; // مفيش وقت محدد لسه، مينفعش نحدد الشفت

    const supsQ = query(
      collection(db, "supervisors"),
      where("shift", "==", shift),
      where("isActive", "==", true),
      where("isDeleted", "==", false),
    );
    const supsSnap = await getDocs(supsQ);
    const availableSups = supsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (!availableSups.length) {
      // مفيش مشرفين متاحين لهذا الشفت — تفضل بدون مشرف
      await updateDoc(sessionRef, {
        supervisorId: null,
        supervisorName: "",
      });
      return;
    }

    // نفس منطق "الأقل عددًا" المستخدم في addSession
    const existingSnap = await getDocs(
      query(
        collection(db, "sessions"),
        where("isDeleted", "==", false),
        where("status", "not-in", NO_SUPERVISOR_STATUSES),
      ),
    );
    const existingSessions = existingSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((s) => s.id !== sessionId); // استثني الحلقة نفسها من العدّ

    const counts = {};
    availableSups.forEach((s) => { counts[s.id] = 0; });
    existingSessions
      .filter((s) => getSessionShift(s) === shift)
      .forEach((s) => {
        if (s.supervisorId && counts[s.supervisorId] !== undefined) {
          counts[s.supervisorId]++;
        }
      });

    const assigned = availableSups.reduce(
      (min, s) => (counts[s.id] < counts[min.id] ? s : min),
      availableSups[0],
    );

    await updateDoc(sessionRef, {
      supervisorId: assigned.id,
      supervisorName: assigned.name,
      reassignedAt: new Date().toISOString(),
    });
  }
}