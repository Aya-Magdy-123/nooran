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
} from "./distributionService";

import {
  reassignAbsentSupervisorOccurrences,
  clearSubstituteOverridesInRange,
} from "./distributionService";

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
  await redistributeShift(shift);

  return { id: uid, name, email, phone, isActive };
}

export async function updateSupervisor(id, { name, phone, shift, isActive }) {
  await updateDoc(doc(db, COL, id), { name, phone, shift, isActive });
}

export async function deleteSupervisor(id, shift) {
  await updateDoc(doc(db, COL, id), { isDeleted: true, isActive: false });
  await redistributeShift(shift);

}

export async function restoreSupervisor(id, shift) {
  await updateDoc(doc(db, COL, id), { isDeleted: false });
  await redistributeShift(shift);

}

function genId() {
  return `abs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function rangesOverlap(aFrom, aUntil, bFrom, bUntil) {
  return aFrom <= bUntil && bFrom <= aUntil
}

// ── إضافة رينج إجازة جديد ──────────────────────────────────────
// ← جديد: التوزيع الفعلي (reassignAbsentSupervisorOccurrences) بيحصل
//   فورًا هنا لكل الفترة، سواء كانت الإجازة بتبدأ النهاردة أو في
//   المستقبل — بدل ما كان مقتصر على النهاردة بس وباقي على الكرون.
//   الكرون (checkScheduledAbsences) هيفضل شغال زي ما هو كـ"شبكة أمان"
//   بس (لو التوزيع هنا فشل لأي سبب)، وبما إن distributed=true اتسجلت،
//   الكرون مش هيكرر التوزيع تاني.
export async function addAbsence(id, from, until) {
  if (!until) throw new Error('لازم تحدد "إلى تاريخ"')

  const ref = doc(db, COL, id)
  const docSnap = await getDoc(ref)
  if (!docSnap.exists()) throw new Error("المشرف مش موجود")
  const supData = docSnap.data()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })

  const effectiveFrom = from || today

  if (until < effectiveFrom) throw new Error('تاريخ النهاية لازم يكون بعد تاريخ البداية')

  // ← منع التداخل مع أي رينج موجود بالفعل لنفس المشرف
  const existing = supData.absences || []
  const overlapping = existing.find(a => rangesOverlap(effectiveFrom, until, a.from, a.until))
  if (overlapping) {
    throw new Error(`الفترة دي متداخلة مع إجازة موجودة بالفعل (${overlapping.from} → ${overlapping.until})`)
  }

  const newAbsence = {
    id: genId(),
    from: effectiveFrom,
    until,
    distributed: false,
  }

  const absences = [...existing, newAbsence]
  const startsNow = newAbsence.from <= today

  await updateDoc(ref, {
    absences,
    isActive: startsNow ? false : supData.isActive,
  })

  // ← التوزيع بيحصل فورًا دايمًا، مش بس لو startsNow
  await reassignAbsentSupervisorOccurrences(id, supData.shift, newAbsence.from, until)
  const marked = absences.map(a => a.id === newAbsence.id ? { ...a, distributed: true } : a)
  await updateDoc(ref, { absences: marked })

  return newAbsence
}

// ← حذف رينج إجازة (سواء شغال دلوقتي أو مجدول في المستقبل أو حتى منتهي)
export async function deleteAbsence(id, absenceId) {
  const ref = doc(db, COL, id)
  const docSnap = await getDoc(ref)
  if (!docSnap.exists()) throw new Error("المشرف مش موجود")
  const supData = docSnap.data()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })

  const existing = supData.absences || []
  const target = existing.find(a => a.id === absenceId)
  if (!target) return

  const remaining = existing.filter(a => a.id !== absenceId)
  const stillAbsentToday = remaining.some(a => a.from <= today && a.until >= today)

  await updateDoc(ref, {
    absences: remaining,
    isActive: !stillAbsentToday,
  })

  // لو الرينج ده كان اتوزّع فعلاً وفيه جزء لسه ماجاش (من النهاردة لحد آخره)، ننضّفه
  if (target.distributed && target.until >= today) {
    await clearSubstituteOverridesInRange(id, today > target.from ? today : target.from, target.until)
  }
}

// ── أدوات تاريخ آمنة من مشاكل التايم زون ─────────────────────
function parseDateOnly(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function formatDateOnly(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function addDays(dateStr, n) {
  const d = parseDateOnly(dateStr)
  d.setDate(d.getDate() + n)
  return formatDateOnly(d)
}

// ═══════════════════════════════════════════════════════════════
// تعديل رينج إجازة موجود:
// - لو "آخر يوم" اتقصّر → المشرف قاطع إجازته وهيرجع نشط من (آخر يوم الجديد + 1)،
//   وأي أيام كانت له substitute في الفترة اللي اتشالت بترجع له تلقائيًا.
// - لو "آخر يوم" أو "أول يوم" اتوسّع → الأيام الجديدة دي بتتوزع على بدلاء
//   بنفس منطق addAbsence.
// - الإجازة بتفضل بنفس الـ id، فالـ isActive بيتحسب بناءً على كل absences[]
//   مش على الرينج ده لوحده (عشان لو فيه رينج تاني شغال في نفس الوقت).
// ═══════════════════════════════════════════════════════════════
export async function updateAbsence(id, absenceId, from, until) {
  if (!until) throw new Error('لازم تحدد "إلى تاريخ"')

  const ref = doc(db, COL, id)
  const docSnap = await getDoc(ref)
  if (!docSnap.exists()) throw new Error("المشرف مش موجود")
  const supData = docSnap.data()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })

  const existing = supData.absences || []
  const target = existing.find(a => a.id === absenceId)
  if (!target) throw new Error('الإجازة غير موجودة')

  const newFrom  = from || target.from
  const newUntil = until

  // ── Validation: منع الحالة غير المتناسقة ──
  if (newUntil < newFrom) {
    throw new Error('تاريخ النهاية لازم يكون بعد تاريخ البداية')
  }
  const overlapping = existing.find(
    a => a.id !== absenceId && rangesOverlap(newFrom, newUntil, a.from, a.until)
  )
  if (overlapping) {
    throw new Error(`الفترة دي متداخلة مع إجازة موجودة بالفعل (${overlapping.from} → ${overlapping.until})`)
  }

  const oldFrom  = target.from
  const oldUntil = target.until

  const removedRanges = [] // أيام لازم ترجع لصاحبها الأصلي (نمسح الـ override)
  const addedRanges   = [] // أيام جديدة لازم توزّع على بدلاء

  if (newUntil < oldUntil) {
    removedRanges.push([addDays(newUntil, 1), oldUntil])
  } else if (newUntil > oldUntil) {
    addedRanges.push([addDays(oldUntil, 1), newUntil])
  }

  if (newFrom > oldFrom) {
    removedRanges.push([oldFrom, addDays(newFrom, -1)])
  } else if (newFrom < oldFrom) {
    addedRanges.push([newFrom, addDays(oldFrom, -1)])
  }

  const updatedAbsences = existing.map(a =>
    a.id === absenceId ? { ...a, from: newFrom, until: newUntil } : a
  )
  const stillAbsentToday = updatedAbsences.some(a => a.from <= today && a.until >= today)

  await updateDoc(ref, {
    absences: updatedAbsences,
    isActive: !stillAbsentToday,
  })

  for (const [rf, ru] of removedRanges) {
    if (rf > ru) continue
    await clearSubstituteOverridesInRange(id, rf, ru)
  }
  for (const [af, au] of addedRanges) {
    if (af > au) continue
    await reassignAbsentSupervisorOccurrences(id, supData.shift, af, au)
  }

  return updatedAbsences.find(a => a.id === absenceId)
}