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
  getShiftForTime,
  pickSupervisorForShift,
  assignSupervisorsToRegularDates,
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
// ── جيب حلقات مشرف معين، بس اللي حصتها فعليًا "النهاردة" ──────
// trial → حصة واحدة بس، تظهر لو trialDate === النهاردة والمشرف مطابق
// active → تظهر لو فيه معاد (regularDate) بيوم الأسبوع بتاع النهاردة
//   ومشرف المعاد ده تحديدًا هو المشرف المطلوب (مش أي معاد تاني في نفس
//   الحلقة، عشان حلقة ممكن يكون ليها مشرف مختلف كل يوم)
export async function getSupervisorSessions(supervisorId) {
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  console.log("today", todayStr);
  const todayNumber = new Date(todayStr + "T00:00:00").getDay();

  const snap = await getDocs(
    query(collection(db, COL), where("isDeleted", "==", false)),
  );

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => {
      if (s.status === "trial") {
        return s.trialDate === todayStr && s.supervisorId === supervisorId;
      }

      if (s.status === "active") {
        if (s.startDate && s.startDate > todayStr) return false; // لسه ماجاش موعد البداية
        return (s.regularDates || []).some(
          (rd) => rd.dayNumber === todayNumber && rd.supervisorId === supervisorId,
        );
      }

      return false; // paused/cancelled/أي حالة تانية
    });
    console.log("seesions", snap)
}

// ── إضافة حلقة مع توزيع تلقائي ──────────────────────────────
export async function addSession(form, teacherName) {
  const sessionNumber = form.sessionNumber || "";

  let supervisorId = null;
  let supervisorName = "";
  let regularDatesWithSupervisors = form.regularDates || [];

  if (form.status === "trial") {
    const assigned = await pickSupervisorForShift(getShiftForTime(form.trialTime), null);
    supervisorId = assigned.supervisorId;
    supervisorName = assigned.supervisorName;
  } else if (form.status === "active" && form.regularDates?.length) {
    regularDatesWithSupervisors = await assignSupervisorsToRegularDates(form.regularDates, [], null);
    supervisorId = regularDatesWithSupervisors[0]?.supervisorId ?? null;
    supervisorName = regularDatesWithSupervisors[0]?.supervisorName ?? "";
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
    regularDates: regularDatesWithSupervisors,
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
  const oldData = oldSnap.data() || {};
  const oldStatus = oldData.status;
  const oldRegularDates = oldData.regularDates;

  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });

  // ← لو الحالة الجديدة "ملغي" بتاريخ إلغاء (cancelledDate) لسه ماجاش،
  //   أجّل الإلغاء الفعلي: الحالة الحيّة تفضل زي ما كانت (oldStatus) لحد
  //   ما يجي يوم cancelledDate، وهتتلغى تلقائيًا وقتها عن طريق
  //   checkAndCancelPendingSessions (بتتنفّذ كل ما نجيب الحلقات)
  const isFutureCancellation = form.status === "cancelled" && form.cancelledDate && form.cancelledDate > todayStr;
  // ← جديد: تفعيل مؤجل (لسه مش active وتاريخ البداية في المستقبل)
  const isFutureActivation = form.status === "active" && form.startDate && form.startDate > todayStr && oldStatus !== "active";

  const liveStatus = isFutureCancellation ? oldStatus : (isFutureActivation ? oldStatus : form.status);

  await updateDoc(sessionRef, {
    studentName: form.name || "",
    studentPhone: form.phone || "",
    country: form.country || "",
    contactMethod: form.contactMethod || "",
    teacherId: form.teacherId || null,
    teacherName: teacherName || "",
    program: form.program || "",
    status: liveStatus,   // ← الحيّة الفعلية، مش form.status مباشرة
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
    // ← جديد: "تذكرة" إلغاء مؤجل يقرأها checkAndCancelPendingSessions لاحقًا
    pendingCancelDate: isFutureCancellation ? form.cancelledDate : null,
    pendingActivateDate: isFutureActivation ? form.startDate : null,  // ← جديد

  });

  const historyDate =
    liveStatus === "trial"
      ? (form.trialDate || todayStr)
      : liveStatus === "active"
        ? (form.startDate || todayStr)
        : liveStatus === "cancelled"
          ? (form.cancelledDate || todayStr)
          : todayStr;

  if (oldStatus !== liveStatus) {
    await updateDoc(sessionRef, {
      history: arrayUnion({ date: historyDate, status: liveStatus }),
    });
  }

  // ← لو الإلغاء مؤجل، متعملش إعادة توزيع/شيل مشرف دلوقتي — الحلقة لسه
  //   نشطة فعليًا. الكرون هو اللي هيشيل المشرف وقت الإلغاء الفعلي.
  if (!isFutureCancellation) {
    await reassignSessionOnStatusChange(id, oldStatus, liveStatus, {
      status: liveStatus,
      trialTime: form.trialTime,
      oldRegularDates,
      regularDates: form.regularDates,
    });
  }
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

// ← يوم واحد بعد تاريخ معين (YYYY-MM-DD) — نفس منطق nextDayStr في AdminUsers.jsx
//   (لازم نستخدم مكونات التاريخ المحلية لا toISOString عشان توقيت القاهرة)
function nextDayStr(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── رجوع الطلاب المتوقفين "لفترة محددة" لحالة نشط تلقائيًا بعد ما ينتهي pauseUntil ──
// بتتنفّذ كل ما بنجيب الحلقات (fetchAllSessions في AppContext) عشان تفضل الحالة محدّثة
// من غير ما نحتاج جوب/cron فعلي على السيرفر. لو الطالب pauseType === 'dated' و pauseUntil
// فات، بيرجع 'active' فورًا ويتسجل في الـ history إنه رجع نشط بتاريخ اليوم اللي بعد pauseUntil.
export async function checkAndRevertPausedSessions() {
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });

  const q = query(
    collection(db, COL),
    where("status", "==", "paused"),
    where("isDeleted", "==", false),
  );
  const snap = await getDocs(q);
  const due = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => s.pauseType === "dated" && s.pauseUntil && s.pauseUntil < todayStr);

  for (const s of due) {
    const returnDate = nextDayStr(s.pauseUntil);
    await updateDoc(doc(db, COL, s.id), {
      status: "active",
      pauseType: "",
      pauseUntil: "",
      history: arrayUnion({ date: returnDate, status: "active" }),
    });
  }

  return due.length; // عدد الحلقات اللي رجعت نشطة
}

// ── soft delete ───────────────────────────────────────────────
export async function deleteSession(id) {
  await updateDoc(doc(db, COL, id), { isDeleted: true });
}