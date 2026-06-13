import {
  collection, doc, getDocs, updateDoc,
  query, where, writeBatch
} from "firebase/firestore"
import { db } from "../firebase"

export function getSessionShift(session) {
  const time = session.trialTime || session.regularDates?.[0]?.time
  if (!time) return null
  const hour = parseInt(time.split(':')[0])
  if (hour >= 4  && hour < 12) return 'morning'
  if (hour >= 12 && hour < 20) return 'afternoon'
  return 'evening'
}

function roundRobin(sessions, supervisors) {
  return sessions.map((session, i) => {
    const sup = supervisors[i % supervisors.length]
    return { ...session, supervisorId: sup.id, supervisorName: sup.name }
  })
}

export async function reassignAbsentSupervisor(absentId, shift) {
  const sessionsSnap = await getDocs(
    query(
      collection(db, "sessions"),
      where("supervisorId", "==", absentId),
      where("isDeleted",    "==", false)
    )
  )
  if (sessionsSnap.empty) return

  const sessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  const supsSnap = await getDocs(
    query(
      collection(db, "supervisors"),
      where("shift",     "==", shift),
      where("isActive",  "==", true),
      where("isDeleted", "==", false)
    )
  )
  const available = supsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => s.id !== absentId)

  if (!available.length) return

  const batch = writeBatch(db)
  roundRobin(sessions, available).forEach(s => {
    batch.update(doc(db, "sessions", s.id), {
      supervisorId:   s.supervisorId,
      supervisorName: s.supervisorName,
      reassignedFrom: absentId,
      reassignedAt:   new Date().toISOString(),
    })
  })
  await batch.commit()
}

export async function redistributeShift(shift) {
  const allSnap = await getDocs(
    query(collection(db, "sessions"), where("isDeleted", "==", false))
  )
  const sessions = allSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => getSessionShift(s) === shift)

  if (!sessions.length) return

  const supsSnap = await getDocs(
    query(
      collection(db, "supervisors"),
      where("shift",     "==", shift),
      where("isActive",  "==", true),
      where("isDeleted", "==", false)
    )
  )
  const supervisors = supsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  if (!supervisors.length) return

  const batch = writeBatch(db)
  roundRobin(sessions, supervisors).forEach(s => {
    batch.update(doc(db, "sessions", s.id), {
      supervisorId:   s.supervisorId,
      supervisorName: s.supervisorName,
      reassignedAt:   new Date().toISOString(),
    })
  })
  await batch.commit()
}