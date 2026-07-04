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
      ? session.trialTime
      : session.status === "active"
        ? session.regularDates?.[0]?.time
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
      if (getShiftForTime(s.trialTime) === shift && s.supervisorId && counts[s.supervisorId] !== undefined) {
        counts[s.supervisorId]++;
      }
      return;
    }
    (s.regularDates || []).forEach((rd) => {
      if (getShiftForTime(rd.time) === shift && rd.supervisorId && counts[rd.supervisorId] !== undefined) {
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
  const oldMap = new Map(
    (oldRegularDates || [])
      .filter((rd) => rd.day && rd.time)
      .map((rd) => [`${rd.day}__${rd.time}`, rd]),
  );

  const shiftCache = new Map();

  newRegularDates.forEach((rd) => {
    const existing = oldMap.get(`${rd.day}__${rd.time}`);
    const shift = getShiftForTime(rd.time);
    if (existing?.supervisorId && shift && !shiftCache.has(shift)) {
      shiftCache.set(shift, { supervisorId: existing.supervisorId, supervisorName: existing.supervisorName });
    }
  });

  const result = [];
  for (const rd of newRegularDates) {
    const existing = oldMap.get(`${rd.day}__${rd.time}`);
    if (existing?.supervisorId) {
      result.push({ ...rd, supervisorId: existing.supervisorId, supervisorName: existing.supervisorName });
      continue;
    }

    const shift = getShiftForTime(rd.time);
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
    .filter((s) => getShiftForTime(s.trialTime) === shift);

  const activeSessions = activeSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => (s.regularDates || []).some(
      (rd) => rd.supervisorId === absentId && getShiftForTime(rd.time) === shift,
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
      if (rd.supervisorId !== absentId || getShiftForTime(rd.time) !== shift) return rd;
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
  const today = todayStr();

  // ← قبل أي تغيير: اعمل snapshot للحصص اللي فاتت بالمشرف الحالي (قبل التبديل)
  for (const s of allSessions) {
    if (getSessionShift(s) !== shift && !(s.regularDates || []).some(rd => getShiftForTime(rd.time) === shift)) continue
    const pastDates = buildSessionOccurrences(s, new Map(), { rangeEnd: today })
      .map(o => o.date)
      .filter(d => d <= today)
    for (const date of pastDates) {
      await OccurrencesService.snapshotOccurrenceSupervisor(s.id, date, {
        supervisorId: s.supervisorId,
        supervisorName: s.supervisorName,
      })
    }
  }

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
  let idx = 0;
  const nextSup = () => (supervisors.length ? supervisors[idx++ % supervisors.length] : null);
  let touched = false;

  allSessions.forEach((s) => {
    if (s.status === "trial") {
      if (getShiftForTime(s.trialTime) !== shift) return;
      touched = true;
      const sup = nextSup();
      batch.update(doc(db, "sessions", s.id), {
        supervisorId: sup?.id ?? null,
        supervisorName: sup?.name ?? "",
        reassignedAt: new Date().toISOString(),
      });
      return;
    }

    const rds = s.regularDates || [];
    let changed = false;
    const newRds = rds.map((rd) => {
      if (getShiftForTime(rd.time) !== shift) return rd;
      changed = true;
      const sup = nextSup();
      return { ...rd, supervisorId: sup?.id ?? null, supervisorName: sup?.name ?? "" };
    });
    if (!changed) return;

    touched = true;
    batch.update(doc(db, "sessions", s.id), {
      regularDates: newRds,
      supervisorId: newRds[0]?.supervisorId ?? null,
      supervisorName: newRds[0]?.supervisorName ?? "",
      reassignedAt: new Date().toISOString(),
    });
  });

  if (touched) await batch.commit();
}

function regularDatesChanged(oldDates, newDates) {
  const a = oldDates || [];
  const b = newDates || [];
  if (a.length !== b.length) return true;
  return JSON.stringify(a) !== JSON.stringify(b);
}

// ── توزيع مشرف/مشرفين لحلقة واحدة — تُستدعى من updateSession ──
export async function reassignSessionOnStatusChange(sessionId, oldStatus, newStatus, sessionData) {
  const { regularDates, oldRegularDates, trialTime } = sessionData;

  if (oldStatus === newStatus && !regularDatesChanged(oldRegularDates, regularDates)) {
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
  if (!shift || !fromDate || !toDate) {
    console.warn("[reassignAbsentSupervisorOccurrences] محتاج shift + fromDate + toDate");
    return;
  }

  const sessionsSnap = await getDocs(
    query(
      collection(db, "sessions"),
      where("status", "not-in", NO_SUPERVISOR_STATUSES),
      where("isDeleted", "==", false),
    ),
  );
  const mySessions = sessionsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) =>
      s.status === "trial"
        ? s.supervisorId === absentId && getShiftForTime(s.trialTime) === shift
        : (s.regularDates || []).some((rd) => rd.supervisorId === absentId && getShiftForTime(rd.time) === shift),
    );

  if (!mySessions.length) return;

  const supsSnap = await getDocs(
    query(
      collection(db, "supervisors"),
      where("shift", "==", shift),
      where("isActive", "==", true),
      where("isDeleted", "==", false),
    ),
  );
  const others = supsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => s.id !== absentId);

  if (!others.length) {
    console.warn(`[reassignAbsentSupervisorOccurrences] مفيش مشرفين تانيين متاحين في شيفت "${shift}"`);
    return;
  }

  let cursor = 0;
  for (const session of mySessions) {
    const dates = buildSessionOccurrences(session, new Map(), {
      rangeStart: fromDate,
      rangeEnd: toDate,
    }).map((o) => o.date);

    for (const date of dates) {
      const sub = others[cursor % others.length];
      cursor++;
      await OccurrencesService.upsertOccurrence(session.id, date, {
        supervisorId: sub.id,
        supervisorName: sub.name,
        substituteFor: absentId,
      });
    }
  }
}

export async function clearFutureSubstituteOverrides(absentId, fromDate) {
  const snap = await getDocs(
    query(
      collection(db, "sessionOccurrences"),
      where("substituteFor", "==", absentId),
      where("date", ">=", fromDate),
    ),
  );
  await Promise.all(snap.docs.map((d) => OccurrencesService.unsetSupervisorOverride(d.id)));
}