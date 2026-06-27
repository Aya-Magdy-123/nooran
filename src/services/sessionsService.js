import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../../firebase";

import {
  getSessionShift,
  reassignSessionOnStatusChange,
} from "./distributionService";

const COL = "sessions";

const today = new Date().toISOString().split("T")[0];

export async function getAllSessions(){
  const snapshot = await getDocs(collection(db, COL));
  return snapshot.docs.map((d)=> ({id: d.id, ...d.data()}));
}

// ← جلب حلقة واحدة بقراءة واحدة (مستخدمة بعد add/update عشان نحدّث الـ state محليًا بدون إعادة جلب كل الحلقات)
export async function getSessionById(id) {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getSessionsPerDay() {
  const today = new Date().toISOString().split("T")[0];
  const todayNumber = new Date().getDay();

  const snap = await getDocs(
    query(
      collection(db, COL),
      where("status", "not-in", ["cancelled", "paused"]),
    ),
  );

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((session) => {
      if (
        session.startDate <= today &&
        session.regularDates.some((p) => p.dayNumber === todayNumber)
      ) {
        return true;
      }

      if (session.trialDate === today) {
        return true;
      }
      return false;
    });
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
  // رقم الحلقة بييجي يدوي من الفورم (form.sessionNumber) - مفيش ترقيم تلقائي
  const sessionNumber = form.sessionNumber || "";

  // تحديد المشرف تلقائياً
  let supervisorId = null;
  let supervisorName = "";

  // ← استخدام getSessionShift الموحّدة (من distributionService) بدل
  //   الفنكشن المحلية القديمة، عشان نفس المنطق يتطبّق في كل مكان
  const sessionShift = getSessionShift({
    status: form.status,
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
      const allSnap = await getDocs(
        query(
          collection(db, COL),
          where("isDeleted", "==", false),
        ),
      );
      const existingSessions = allSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const counts = {};
      availableSups.forEach((s) => {
        counts[s.id] = 0;
      });
      existingSessions
        .filter((s) => getSessionShift(s) === sessionShift)
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
  const historyDate =
    form.status === "trial"
      ? form.trialDate
      : form.status === "active"
        ? form.startDate
        : today;

  const docRef = await addDoc(collection(db, COL), {
    studentName: form.name || "",
    studentPhone: form.phone || "",
    country: form.country || "",
    contactMethod: form.contactMethod || "",
    sessionNumber: sessionNumber,
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
    startDate: form.startDate || "",
    history: [{ date: historyDate, status: form.status }],
  });

  return { id: docRef.id, sessionNumber };
}

// ── تعديل حلقة ───────────────────────────────────────────────
export async function updateSession(id, form, teacherName) {
  const sessionRef = doc(db, COL, id);
  const oldSnap = await getDoc(sessionRef);
  const oldStatus = oldSnap.data()?.status;
  const oldRegularDates = oldSnap.data()?.regularDates;

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
    cancelledDate: form.cancelledDate || "",
    startDate: form.startDate || "",
  });

  const historyDate =
    form.status === "trial"
      ? form.trialDate
      : form.status === "active"
        ? form.startDate
        : form.pauseType === "dated"
          ? form.pauseUntil
          : form.status === "cancelled"
            ? form.cancelledDate
            : today;

  if (oldStatus !== form.status) {
    await updateDoc(doc(db, COL, id), {
      history: arrayUnion({ date: historyDate, status: form.status }),
    });
  }

  // ← status ضرورية هنا عشان getSessionShift جوه reassignSessionOnStatusChange
  //   تقدر تحسب الشفت الصحيح (تعتمد على session.status داخليًا)
  await reassignSessionOnStatusChange(id, oldStatus, form.status, {
    status: form.status,
    trialTime: form.trialTime,
    oldRegularDates,
    regularDates: form.regularDates,
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

// ── تحديث حالة الحضور يدويًا (من لوحة المشرف) ──────────────────
// ← بتحاكي نفس الـ side effects اللي بتحصل من ردّ الواتساب (routes/whatsapp.js)
// عشان الحالة تفضل متّسقة مع باقي الفلاجز (makeup.confirmed, postponeStatus, flagged)
// ولو الحالة الجديدة postponed، بننشئ طلب تأجيل فعلي في postponeRequests
// بنفس الشكل اللي بيعمله الـ webhook تمامًا
export async function updateAttendanceStatus(id, newStatus) {
  // ← لازم نجيب بيانات الحلقة الحالية أولاً، لأننا محتاجينها لإنشاء
  // طلب التأجيل (اسم الطالب، رقم الهاتف، اسم المعلم...) ولمعرفة sourceType
  const sessionRef = doc(db, COL, id);
  const sessionSnap = await getDoc(sessionRef);
  if (!sessionSnap.exists()) {
    throw new Error(`Session not found: ${id}`);
  }
  const session = { id: sessionSnap.id, ...sessionSnap.data() };

  const updateData = {
    attendanceStatus: newStatus,
  };

  if (newStatus === "confirmed") {
    updateData.confirmedAt = new Date().toISOString();
    // لو كان فيه makeup مفتوح، اقفله (نفس منطق الـ webhook لرد "حاضر" على حصة تعويض)
    updateData["makeup.confirmed"] = false;
    updateData["makeup.status"] = "completed";
    updateData.postponeStatus = "resolved";
  } else if (newStatus === "no_show") {
    updateData.noShowAt = new Date().toISOString();
  } else if (newStatus === "postponed") {
    updateData.postponeStatus = "pending";
    updateData.postponeRequestAt = new Date().toISOString();
    updateData.flagged = true;
    // نصفّر makeup القديم عشان المشرف يحدد ميعاد جديد (زي ما بيحصل من رد الطالب)
    updateData.makeup = null;
    updateData.lastMakeupReminderDate = null;
  } else if (newStatus === "pending") {
    // رجوع لحالة الانتظار (إعادة ضبط يدوية)
    updateData.postponeStatus = null;
  }

  await updateDoc(sessionRef, updateData);

  // ── إنشاء طلب تأجيل فعلي — فقط عند التحويل اليدوي لـ postponed ──
  if (newStatus === "postponed") {
    // امنع التكرار: لو فيه طلب pending قائم بالفعل على نفس الحلقة، لا تنشئ طلب تاني
    const existingQ = query(
      collection(db, "postponeRequests"),
      where("sessionId", "==", id),
      where("status", "==", "pending"),
    );
    const existingSnap = await getDocs(existingQ);
    if (existingSnap.empty) {
      // ← sourceType: لو كانت الحصة الأصلية تعويض مؤكد، يبقى الطلب جاي من makeup
      // وإلا فهو طلب على حصة عادية (نفس منطق reminderType في reminderJob.js)
      const sourceType =
        session.makeup?.confirmed === true ? "makeup" : "regular";

      await addDoc(collection(db, "postponeRequests"), {
        sessionId: id,
        studentName: session.studentName || "",
        studentPhone: session.studentPhone || "",
        teacherName: session.teacherName || "",
        supervisorId: session.supervisorId || "",
        originalDate: session.trialDate || "",
        originalTime:
          session.trialTime || session.regularDates?.[0]?.time || "",
        sourceType,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    }
  }
}

// ── soft delete ───────────────────────────────────────────────
export async function deleteSession(id) {
  await updateDoc(doc(db, COL, id), { isDeleted: true });
}