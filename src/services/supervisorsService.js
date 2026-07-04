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
} from "./distributionService";  // ← جديد

import {
  reassignAbsentSupervisorOccurrences,
  clearFutureSubstituteOverrides,
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

// ── تسجيل/إلغاء غياب المشرف ────────────────────────────────────
// ← دعم إجازة بفترة: لو absentFrom في المستقبل، المشرف يفضل حاضر فعليًا
//   لحد ما checkAbsentSupervisorsJob (يوميًا 4 الفجر) يفعّل الغياب تلقائيًا.
//   absentFrom في الماضي/النهاردة (أو مش متبعتة) = غياب فوري.


export async function toggleAbsent(id, absentFrom = null, absentUntil = null) {
  const docSnap = await getDoc(doc(db, COL, id));
  if (!docSnap.exists()) throw new Error("المشرف مش موجود");

  const supData = docSnap.data();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })

  if (supData.isActive) {
    const startsToday = !absentFrom || absentFrom <= today

    await updateDoc(doc(db, COL, id), {
      isActive: !startsToday,
      absentFrom: absentFrom || null,
      absentUntil: absentUntil || null,
    });

    if (startsToday) {
      if (absentUntil) {
        // ← بدل تغيير المشرف الدائم لكل الحلقات: نوزّع بس أيام الغياب الفعلية
        await reassignAbsentSupervisorOccurrences(
          id, supData.shift, absentFrom || today, absentUntil
        );
      } else {
        console.warn("غياب من غير absentUntil — هيفضل مسجّل غائب من غير توزيع تلقائي، لازم يترجع يدوي");
      }
    }
    // لو absentFrom في المستقبل، cron الساعة 4ص هو اللي هيستدعي نفس الدالة وقتها

    return !startsToday
  }

  // ← رجوع يدوي فوري (قبل absentUntil الأصلي أو بعد ما كان مسجّل غائب فوري)
  await updateDoc(doc(db, COL, id), {
    isActive: true,
    absentFrom: null,
    absentUntil: null,
  });
  // مفيش داعي لـ redistributeShift للشيفت كله — بس ننضّف أي أيام مستقبلية
  // كانت هتتوزع كبديل مؤقت، وباقي الأيام بترجع لصاحبها الأصلي تلقائيًا
  await clearFutureSubstituteOverrides(id, today);

  return true
}