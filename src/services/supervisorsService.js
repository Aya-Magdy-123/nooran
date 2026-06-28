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
} from "./distributionService"; // ← جديد

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

  // لو المشرف حاضر دلوقتي وعاملينله تسجيل غياب
  if (supData.isActive) {
    // لو تاريخ البداية مش متبعت أو هو النهاردة/فات → غياب فوري
    const startsToday = !absentFrom || absentFrom <= today

    await updateDoc(doc(db, COL, id), {
      isActive: !startsToday,         // لسه حاضر لو الإجازة لسه ما بدأتش
      absentFrom: absentFrom || null,
      absentUntil: absentUntil || null,
    });

    if (startsToday) {
      await reassignAbsentSupervisor(id, supData.shift);
    }
    // لو الإجازة في المستقبل، الـ cron هو اللي هيفعّل الغياب وقت ما يجي absentFrom

    return !startsToday
  }

  // لو المشرف غائب دلوقتي وعاملينله "رجوع" يدوي فوري
  await updateDoc(doc(db, COL, id), {
    isActive: true,
    absentFrom: null,
    absentUntil: null,
  });
  await redistributeShift(supData.shift);

  return true
}