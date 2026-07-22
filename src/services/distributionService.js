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

// ── شفت وقت معيّن ──
export function getShiftForTime(time) {
  if (!time) return null;
  const hour = parseInt(time.split(":")[0]);
  if (hour >= 4 && hour < 12) return "morning";
  if (hour >= 12 && hour < 20) return "afternoon";
  return "evening";
}

// ← للتوافق مع كود قديم بيستخدمها لغرض تاني (زي reassignAbsentSupervisorOccurrences تحت)
export function getSessionShift(session) {
  const time =
    session.status === "trial"
      ? (session.trialTeacherTime || session.trialTime)
      : session.status === "active"
        ? (session.regularDates?.[0]?.teacherTime || session.regularDates?.[0]?.time)
        : "";
  return getShiftForTime(time);
}

const NO_SUPERVISOR_STATUSES = ["cancelled", "paused"];

// ← تاريخ اليوم بصيغة YYYY-MM-DD بتوقيت القاهرة (مش UTC) — مستخدمة في redistributeShift
function todayStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
}

// ── المشرف "الأقل عددًا" لشفت معيّن — بتعدّ كل معاد (مش كل حلقة) في نفس الشفت ──
export async function pickSupervisorForShift(shift, excludeSessionId = null) {
  if (!shift) return { supervisorId: null, supervisorName: "" };

  const supsSnap = await getDocs(
    query(
      collection(db, "supervisors"),
      where("shift", "==", shift),
      where("isActive", "==", true),
      where("isDeleted", "==", false),
    ),
  );
  const availableSups = supsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (!availableSups.length) return { supervisorId: null, supervisorName: "" };

  const allSnap = await getDocs(
    query(collection(db, "sessions"), where("isDeleted", "==", false)),
  );
  const existingSessions = allSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => s.id !== excludeSessionId && !NO_SUPERVISOR_STATUSES.includes(s.status));

  const counts = {};
  availableSups.forEach((s) => { counts[s.id] = 0; });

  existingSessions.forEach((s) => {
    if (s.status === "trial") {
      if (getShiftForTime(s.trialTeacherTime || s.trialTime) === shift && s.supervisorId && counts[s.supervisorId] !== undefined) {
        counts[s.supervisorId]++;
      }
      return;
    }
    (s.regularDates || []).forEach((rd) => {
      if (getShiftForTime(rd.teacherTime || rd.time) === shift && rd.supervisorId && counts[rd.supervisorId] !== undefined) {
        counts[rd.supervisorId]++;
      }
    });
  });

  // ← الإصلاح هنا: بنمسك أقل supervisor object (بخاصية .id الحقيقية)،
  //   وبنحوّله لـ {supervisorId, supervisorName} في الآخر بس
  const best = availableSups.reduce(
    (min, s) => (counts[s.id] < counts[min.id] ? s : min),
    availableSups[0],
  );

  return { supervisorId: best.id, supervisorName: best.name };
}

// ── تخصيص مشرف لكل معاد في regularDates — نفس الشفت جوه نفس الحلقة ياخد
//   نفس المشرف، والمعاد اللي متغيرش (يوم+وقت زي القديم) يفضل زي ما هو ──
export async function assignSupervisorsToRegularDates(newRegularDates = [], oldRegularDates = [], excludeSessionId = null) {
  // ← المفتاح بقى يشمل teacherTime كمان، مش وقت الطالب بس، عشان أي تغيير
  //   في الشفت الفعلي (حتى لو حصل بسبب تغيير الدولة/التايم زون من غير ما
  //   يتغيّر رقم وقت الطالب نفسه) يكسر التطابق ويجبر إعادة حساب المشرف
  const keyOf = (rd) => `${rd.day}__${rd.time}__${rd.teacherTime || ''}`

  const oldMap = new Map(
    (oldRegularDates || [])
      .filter((rd) => rd.day && rd.time)
      .map((rd) => [keyOf(rd), rd]),
  );

  const shiftCache = new Map();


  newRegularDates.forEach((rd) => {
    const existing = oldMap.get(keyOf(rd));
    const shift = getShiftForTime(rd.teacherTime || rd.time);
    if (existing?.supervisorId && shift && !shiftCache.has(shift)) {
      shiftCache.set(shift, { supervisorId: existing.supervisorId, supervisorName: existing.supervisorName });
    }
  });

  const result = [];
  for (const rd of newRegularDates) {
    const existing = oldMap.get(keyOf(rd));
    if (existing?.supervisorId) {
      result.push({ ...rd, supervisorId: existing.supervisorId, supervisorName: existing.supervisorName });
      continue;
    }

   const shift = getShiftForTime(rd.teacherTime || rd.time);   // ← تأكد إن ده اتصلح فعلاً هنا برضو
    if (shift && shiftCache.has(shift)) {
      result.push({ ...rd, ...shiftCache.get(shift) });
    } else {
      const assigned = await pickSupervisorForShift(shift, excludeSessionId);
      if (shift) shiftCache.set(shift, assigned);
      result.push({ ...rd, ...assigned });
    }
  }
  return result;
}

function roundRobin(sessions, supervisors) {
  return sessions.map((session, i) => {
    const sup = supervisors[i % supervisors.length];
    return { ...session, supervisorId: sup.id, supervisorName: sup.name };
  });
}

export async function reassignAbsentSupervisor(absentId, shift) {
  if (!shift) return;

  const [trialSnap, activeSnap] = await Promise.all([
    getDocs(query(
      collection(db, "sessions"),
      where("status", "==", "trial"),
      where("supervisorId", "==", absentId),
      where("isDeleted", "==", false),
    )),
    getDocs(query(
      collection(db, "sessions"),
      where("status", "==", "active"),
      where("isDeleted", "==", false),
    )),
  ]);

  const trialSessions = trialSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => getShiftForTime(s.trialTeacherTime || s.trialTime) === shift);

  const activeSessions = activeSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => (s.regularDates || []).some(
      (rd) => rd.supervisorId === absentId && getShiftForTime(rd.teacherTime || rd.time) === shift,
    ));

  if (!trialSessions.length && !activeSessions.length) return;

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
  let idx = 0;
  const nextSup = () => (available.length ? available[idx++ % available.length] : null);

  trialSessions.forEach((s) => {
    const sup = nextSup();
    batch.update(doc(db, "sessions", s.id), {
      supervisorId: sup?.id ?? null,
      supervisorName: sup?.name ?? "",
      reassignedFrom: absentId,
      reassignedAt: new Date().toISOString(),
    });
  });

  activeSessions.forEach((s) => {
    const newRds = (s.regularDates || []).map((rd) => {
      if (rd.supervisorId !== absentId || getShiftForTime(rd.teacherTime || rd.time) !== shift) return rd;
      const sup = nextSup();
      return { ...rd, supervisorId: sup?.id ?? null, supervisorName: sup?.name ?? "" };
    });
    batch.update(doc(db, "sessions", s.id), {
      regularDates: newRds,
      supervisorId: newRds[0]?.supervisorId ?? s.supervisorId ?? null,
      supervisorName: newRds[0]?.supervisorName ?? s.supervisorName ?? "",
      reassignedFrom: absentId,
      reassignedAt: new Date().toISOString(),
    });
  });

  await batch.commit();
}

export async function redistributeShift(shift) {
  if (!shift) return;

  const snapshot = await getDocs(
    query(
      collection(db, "sessions"),
      where("status", "not-in", NO_SUPERVISOR_STATUSES),
      where("isDeleted", "==", false),
    ),
  );
  const allSessions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  const supsSnap = await getDocs(
    query(
      collection(db, "supervisors"),
      where("shift", "==", shift),
      where("isActive", "==", true),
      where("isDeleted", "==", false),
    ),
  );
  const supervisors = supsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  let idx = 0;
  const nextSup = () => (supervisors.length ? supervisors[idx++ % supervisors.length] : null);
  const updates = []; // { id, payload }

  allSessions.forEach((s) => {
    if (s.status === "trial") {
      if (getShiftForTime(s.trialTeacherTime || s.trialTime) !== shift) return;
      const sup = nextSup();
      updates.push({
        id: s.id,
        payload: {
          supervisorId: sup?.id ?? null,
          supervisorName: sup?.name ?? "",
          reassignedAt: new Date().toISOString(),
        },
      });
      return;
    }

    const rds = s.regularDates || [];
    let changed = false;
    const newRds = rds.map((rd) => {
      if (getShiftForTime(rd.teacherTime || rd.time) !== shift) return rd;
      changed = true;
      const sup = nextSup();
      return { ...rd, supervisorId: sup?.id ?? null, supervisorName: sup?.name ?? "" };
    });
    if (!changed) return;

    updates.push({
      id: s.id,
      payload: {
        regularDates: newRds,
        supervisorId: newRds[0]?.supervisorId ?? null,
        supervisorName: newRds[0]?.supervisorName ?? "",
        reassignedAt: new Date().toISOString(),
      },
    });
  });

  // ← بيقسّم على batches ≤450 عشان سقف الـ 500 عملية بتاع Firestore
  for (let i = 0; i < updates.length; i += 450) {
    const chunk = updates.slice(i, i + 450);
    const b = writeBatch(db);
    chunk.forEach(({ id, payload }) => b.update(doc(db, "sessions", id), payload));
    await b.commit();
  }
}

function regularDatesChanged(oldDates, newDates) {
  const a = oldDates || [];
  const b = newDates || [];
  if (a.length !== b.length) return true;
  return JSON.stringify(a) !== JSON.stringify(b);
}

// ── توزيع مشرف/مشرفين لحلقة واحدة — تُستدعى من updateSession ──
export async function reassignSessionOnStatusChange(sessionId, oldStatus, newStatus, sessionData) {
  const { regularDates, oldRegularDates, trialTime, oldTrialTime } = sessionData;

  // ← جديد: لو الحلقة لسه/هتبقى trial ووقتها (بتوقيت مصر) اتغيّر، ده لازم
  //   يستدعي إعادة توزيع حتى لو الحالة نفسها متغيرتش
  const trialTimeChanged = newStatus === "trial" && oldTrialTime !== trialTime;

  if (oldStatus === newStatus && !regularDatesChanged(oldRegularDates, regularDates) && !trialTimeChanged) {
    return;
  }

  const sessionRef = doc(db, "sessions", sessionId);


  if (NO_SUPERVISOR_STATUSES.includes(newStatus)) {
    await updateDoc(sessionRef, {
      supervisorId: null,
      supervisorName: "",
      unassignedAt: new Date().toISOString(),
    });
    return;
  }

  if (newStatus === "trial") {
    const assigned = await pickSupervisorForShift(getShiftForTime(trialTime), sessionId);
    await updateDoc(sessionRef, {
      supervisorId: assigned.supervisorId,
      supervisorName: assigned.supervisorName,
      reassignedAt: new Date().toISOString(),
    });
    return;
  }

  if (newStatus === "active") {
    if (!regularDates?.length) return;
    const newRds = await assignSupervisorsToRegularDates(
      regularDates,
      oldStatus === "active" ? oldRegularDates : [],
      sessionId,
    );
    await updateDoc(sessionRef, {
      regularDates: newRds,
      supervisorId: newRds[0]?.supervisorId ?? null,
      supervisorName: newRds[0]?.supervisorName ?? "",
      reassignedAt: new Date().toISOString(),
    });
  }
}

import { buildSessionOccurrences } from "../utils/generateOccurrences";
import * as OccurrencesService from "./occurrencesService";

export async function reassignAbsentSupervisorOccurrences(absentId, shift, fromDate, toDate) {
  if (!fromDate || !toDate) {
    console.warn("[reassignAbsentSupervisorOccurrences] محتاج fromDate + toDate");
    return;
  }

  // ── كل المشرفين النشطين في نفس الشيفت (غير absentId)، بكامل بياناتهم
  //    (بما فيها absences) عشان نقدر نستبعد أي حد منهم يبقى هو نفسه
  //    غايب في نفس التاريخ بالظبط بإجازة تانية ليه ──
  const supsSnap = await getDocs(
    query(
      collection(db, "supervisors"),
      where("shift", "==", shift),
      where("isActive", "==", true),
      where("isDeleted", "==", false),
    ),
  );
  const shiftSupervisors = supsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const others = shiftSupervisors.filter((s) => s.id !== absentId);

  if (!others.length) {
    console.warn(`[reassignAbsentSupervisorOccurrences] مفيش مشرفين تانيين في شيفت "${shift}"`);
    return;
  }

  // ← هل مشرف معيّن غايب في تاريخ معيّن (بناءً على absences[] بتاعته)؟
  const isAbsentOnDate = (sup, date) =>
    (sup.absences || []).some((a) => a.from <= date && date <= a.until);

  // ← البدلاء المتاحين فعليًا في تاريخ معيّن — مش absentId، ومش غايبين هما
  //   نفسهم في نفس اليوم ده بأي إجازة تانية ليهم
  const availableOn = (date) => others.filter((s) => !isAbsentOnDate(s, date));

  // ═══ المصدر 1: حلقات absentId مالكها فعليًا في regularDates ═══
  const sessionsSnap = await getDocs(
    query(
      collection(db, "sessions"),
      where("status", "not-in", NO_SUPERVISOR_STATUSES),
      where("isDeleted", "==", false),
    ),
  );
  const candidateSessions = sessionsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) =>
      s.status === "trial"
        ? s.supervisorId === absentId
        : (s.regularDates || []).some((rd) => rd.supervisorId === absentId),
    );

  // ═══ المصدر 2: occurrences مخزّنة فعليًا وسوپرفايزرها الحالي absentId ═══
  // بيغطي حالة إن absentId كان بديل لحد تاني على حصة معيّنة، مش صاحبها
  // الأصلي في regularDates (زي ما حصل مع منى وقت غياب عائشة سابقًا)
  const overrideSnap = await getDocs(
    query(
      collection(db, "sessionOccurrences"),
      where("supervisorId", "==", absentId),
      where("date", ">=", fromDate),
    ),
  );
  const overrideDocs = overrideSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((o) => o.date <= toDate);

  if (!candidateSessions.length && !overrideDocs.length) {
    console.log(`[reassignAbsentSupervisorOccurrences] ${absentId}: مفيش حلقات ولا حصص مملوكة له.`);
    return;
  }

  let writes = 0;
  const handledKeys = new Set();
  // ← cursor مستقل لكل تاريخ، عشان توزيع round-robin يفضل عادل حتى لو
  //   قائمة المتاحين بتختلف من يوم للتاني (حد تاني غايب في يوم بعينه)
  const cursorPerDate = {};

  const assignNext = (date) => {
    const pool = availableOn(date);
    if (!pool.length) return null; // ← محدش متاح خالص في اليوم ده
    const idx = (cursorPerDate[date] ?? 0) % pool.length;
    cursorPerDate[date] = idx + 1;
    return pool[idx];
  };

  for (const session of candidateSessions) {
    const allDates = buildSessionOccurrences(session, new Map(), {
      rangeStart: fromDate,
      rangeEnd: toDate,
    });
    const ownedDates = allDates.filter((o) => {
      if (session.status === "trial") return session.supervisorId === absentId;
      const dow = new Date(`${o.date}T00:00:00`).getDay();
      const rd = (session.regularDates || []).find((r) => r.dayNumber === dow);
      return rd?.supervisorId === absentId;
    });

    for (const o of ownedDates) {
      const key = `${session.id}__${o.date}`;
      if (handledKeys.has(key)) continue;
      handledKeys.add(key);

     const sub = assignNext(o.date);
      // ← لو مفيش بديل متاح (كل مشرفين الشيفت غايبين في نفس اليوم)، بنسجل
      //   الحصة صراحة بـ"لا يوجد مشرف" بدل ما نسيبها من غير تحديث خالص
      await OccurrencesService.upsertOccurrence(session.id, o.date, {
        supervisorId: sub?.id ?? null,
        supervisorName: sub?.name ?? "لا يوجد مشرف",
        substituteFor: absentId,
      });
      if (!sub) {
        console.warn(`[reassignAbsentSupervisorOccurrences] مفيش بديل متاح ليوم ${o.date} (الكل غايب) — اتسجلت "لا يوجد مشرف"`);
      }
      writes++;
    }
  }

  for (const o of overrideDocs) {
    const key = `${o.sessionId}__${o.date}`;
    if (handledKeys.has(key)) continue;
    handledKeys.add(key);

   const sub = assignNext(o.date);
    await OccurrencesService.upsertOccurrence(o.sessionId, o.date, {
      supervisorId: sub?.id ?? null,
      supervisorName: sub?.name ?? "لا يوجد مشرف",
      // ← حافظ على صاحب الحلقة الأصلي لو كانت أصلاً بديل لحد تاني قبل كده
      //   (مش absentId نفسه)، عشان لما صاحبها الحقيقي يرجع من إجازته
      //   الحصة ترجعله تلقائي مهما عدد الاستبدالات المتسلسلة اللي حصلت
      substituteFor: o.substituteFor || absentId,
    });
    if (!sub) {
      console.warn(`[reassignAbsentSupervisorOccurrences] مفيش بديل متاح ليوم ${o.date} (الكل غايب) — اتسجلت "لا يوجد مشرف"`);
    }
    writes++;
  }

  console.log(`[reassignAbsentSupervisorOccurrences] ${absentId}: ${writes} حصة اتوزّعت من ${fromDate} لـ ${toDate}.`);
}



export async function clearSubstituteOverridesInRange(absentId, fromDate, toDate) {
  const q = query(
    collection(db, 'sessionOccurrences'),
    where('substituteFor', '==', absentId),
    where('date', '>=', fromDate),
  )
  const snap = await getDocs(q)
  const batch = writeBatch(db)
  let count = 0

  snap.docs.forEach(d => {
    const data = d.data()
    if (toDate && data.date > toDate) return // برّه نطاق الرينج المحذوف
    batch.update(doc(db, 'sessionOccurrences', d.id), {
      supervisorId: null,
      supervisorName: null,
      substituteFor: null,
      updatedAt: new Date().toISOString(),
    })
    count++
  })

  if (count) await batch.commit()
  return count
}