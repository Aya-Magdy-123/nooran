// ═══════════════════════════════════════════════════════════════
// src/services/occurrencesService.js
//
// إدارة Collection جديدة: sessionOccurrences
// دي بتخزن بس "الحصص المعدَّلة" (overrides) — إلغاء/غياب/تأجيل/تعويض/
// تأكيد يدوي — أما باقي الحصص (اللي متوافقة مع الجدول الافتراضي للحلقة)
// فبتتولّد ديناميكيًا في generateOccurrences.js ومش بتتخزن أبدًا.
//
// ── snapshot المشرف/المعلم ──
// كل مرة تتغيّر حالة occurrence (سواء من رد الواتساب أو يدويًا من الأدمن)،
// بنخزّن مع الحالة اسم/آيدي المشرف والمعلم في نفس اللحظة (meta) — عشان لو
// اتغيّر المشرف بعدين مايأثرش بأثر رجعي على حصص قديمة. وفيه كمان دالة
// snapshotOccurrenceSupervisor مستقلة تُستخدم من الكرون اليومي لتسجيل
// المشرف على الحصص اللي فضلت "قيد الانتظار" وفات معادها من غير ما نغيّر
// حالتها.
//
// شكل الوثيقة:
// {
//   id, sessionId, date, status,
//   teacherName, supervisorId, supervisorName,
//   makeupDate, notes, postponedReason,
//   createdAt, updatedAt
// }
// ═══════════════════════════════════════════════════════════════
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  deleteField
} from "firebase/firestore";
import { db } from "../../firebase";


const COL = "sessionOccurrences";

// ── جلب كل الـ occurrences المخزّنة (تُستخدم كـ overrides فوق التوليد الديناميكي) ──
export async function getAllOccurrences() {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── جلب كل الـ occurrences الخاصة بحلقة واحدة (مفيدة لفلتر الطالب) ──
export async function getOccurrencesForSession(sessionId) {
  const snap = await getDocs(
    query(collection(db, COL), where("sessionId", "==", sessionId)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── إنشاء/تحديث حصة معدَّلة (upsert بحسب sessionId + date) ──
export async function upsertOccurrence(sessionId, date, data = {}) {
  const existingSnap = await getDocs(
    query(
      collection(db, COL),
      where("sessionId", "==", sessionId),
      where("date", "==", date),
    ),
  );
  const now = new Date().toISOString();

  if (!existingSnap.empty) {
    const existingDoc = existingSnap.docs[0];
    const payload = { ...data, updatedAt: now };
    await updateDoc(doc(db, COL, existingDoc.id), payload);
    return { id: existingDoc.id, sessionId, date, ...existingDoc.data(), ...payload };
  }

  const payload = {
    sessionId,
    date,
    status: "pending",
    makeupDate: null,
    notes: "",
    postponedReason: "",
    createdAt: now,
    updatedAt: now,
    ...data,
  };
  const docRef = await addDoc(collection(db, COL), payload);
  return { id: docRef.id, ...payload };
}

// ── تحديث حالة حصة (رد الواتساب / تحديث يدوي من الأدمن) ──
// meta: { studentName, studentPhone, teacherName, supervisorId, supervisorName, time }
// بيخزّن meta.teacherName / meta.supervisorId / meta.supervisorName كـ snapshot
// لحظي مع الحصة، عشان الحصة تفضل شايلة مين كان مسؤول عنها وقت الحدث حتى لو
// المشرف اتغيّر بعدين على مستوى الحلقة نفسها.
export async function updateOccurrenceStatus(sessionId, date, newStatus, meta = {}) {
  const patch = { status: newStatus };

  if (meta.supervisorId)   patch.supervisorId   = meta.supervisorId;
  if (meta.supervisorName) patch.supervisorName = meta.supervisorName;
  if (meta.teacherName)    patch.teacherName    = meta.teacherName;

  if (newStatus === "confirmed") {
    patch.confirmedAt = new Date().toISOString();
    patch.makeupDate = null;
  } else if (newStatus === "absent") {
    patch.noShowAt = new Date().toISOString();
  } else if (newStatus === "postponed") {
    patch.postponeRequestAt = new Date().toISOString();
    patch.flagged = true;
    patch.makeupDate = null;
  } else if (newStatus === "pending") {
    patch.confirmedAt = null;
    patch.noShowAt = null;
    patch.flagged = false;
  } else if (newStatus === "cancelled" || newStatus !== "makeup") {
    patch.makeupDate = null;
  }

  const occ = await upsertOccurrence(sessionId, date, patch);

  // ← نفس فكرة الواتساب بالظبط: إنشاء postponeRequest فعلي، مع منع التكرار
  //   لكن هنا بنمنع التكرار على مستوى sessionId+date مش sessionId بس،
  //   لأن نفس الحلقة ممكن يبقى ليها أكتر من occurrence مؤجلة في تواريخ مختلفة
  if (newStatus === "postponed") {
    const existingQ = query(
      collection(db, "postponeRequests"),
      where("sessionId", "==", sessionId),
      where("originalDate", "==", date),
      where("status", "==", "pending"),
    );
    const existingSnap = await getDocs(existingQ);
    if (existingSnap.empty) {
      await addDoc(collection(db, "postponeRequests"), {
        sessionId,
        studentName: meta.studentName || "",
        studentPhone: meta.studentPhone || "",
        teacherName: meta.teacherName || "",
        supervisorId: meta.supervisorId || "",
        originalDate: date,
        originalTime: meta.time || "",
        originalTeacherTime: meta.teacherTime || "",
        sourceType: "occurrence",
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    }
  }

  return occ;
}

// ── snapshot بس (بدون تغيير الحالة) — تُستخدم من الكرون اليومي ──
// بتخزّن مين كان المشرف/المعلم المسؤول عن حصة معيّنة، من غير ما تلمس status.
// لو الحصة أصلاً مالهاش doc مخزّن، هتتعمل ليها واحد بحالة "pending" الافتراضية
// + بيانات المشرف/المعلم بس.
export async function snapshotOccurrenceSupervisor(sessionId, date, meta = {}) {
  const patch = {};
  if (meta.supervisorId)   patch.supervisorId   = meta.supervisorId;
  if (meta.supervisorName) patch.supervisorName = meta.supervisorName;
  if (meta.teacherName)    patch.teacherName    = meta.teacherName;
  if (!Object.keys(patch).length) return null;
  return upsertOccurrence(sessionId, date, patch);
}


// ── إزالة override المشرف بس (بدون ما نلمس status/notes/makeupDate) ──
// تُستخدم لما مشرف يرجع بدري وعايزين نشيل تعليم "بديل مؤقت" عن الأيام
// المستقبلية اللي اتوزعت على حد تاني بدالة، وترجع تلقائي لصاحب الحلقة.
export async function unsetSupervisorOverride(occurrenceId) {
  await updateDoc(doc(db, COL, occurrenceId), {
    supervisorId: deleteField(),
    supervisorName: deleteField(),
    substituteFor: deleteField(),
    updatedAt: new Date().toISOString(),
  });
}

// ── حذف override (رجوع الحصة لحالتها الافتراضية المتولّدة) ──
export async function deleteOccurrence(id) {
  await deleteDoc(doc(db, COL, id));
}