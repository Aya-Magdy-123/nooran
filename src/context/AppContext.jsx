import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AppContext = createContext(null)

const BASE = "http://localhost:5000/api" // ← غير للـ URL بتاعك

// helpers
const mapSupervisor = (s) => ({ ...s, status: s.isActive ? 'active' : 'absent' })

export function AppProvider({ children }) {

  // ─── Supervisors ───────────────────────────────────────────────
  const [supervisors, setSupervisors]               = useState([])
  const [supervisorsLoading, setSupervisorsLoading] = useState(true)
  const [supervisorsError, setSupervisorsError]     = useState(null)

  // ─── Teachers ──────────────────────────────────────────────────
  const [teachers, setTeachers]               = useState([])
  const [teachersLoading, setTeachersLoading] = useState(true)
  const [teachersError, setTeachersError]     = useState(null)

  // ─── Programs ──────────────────────────────────────────────────
  const [programs, setPrograms]               = useState([])
  const [programsLoading, setProgramsLoading] = useState(true)
  const [programsError, setProgramsError]     = useState(null)

  // ─── Students ──────────────────────────────────────────────────
  const [students, setStudents]               = useState([])
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [studentsError, setStudentsError]     = useState(null)

  // ───  sessions ──────────────────────────────────────────────────
  const [postponeRequests, setPostponeRequests]     = useState([])
  const [halaqas, setHalaqas]                       = useState([])
  const [sessions, setSessions]               = useState([])
const [sessionsLoading, setSessionsLoading] = useState(true)
const [sessionsError, setSessionsError]     = useState(null)

  // ─── Fetch functions ───────────────────────────────────────────
  const fetchSupervisors = useCallback(async () => {
    try {
      setSupervisorsLoading(true); setSupervisorsError(null)
      const res = await fetch(`${BASE}/supervisors`)
      if (!res.ok) throw new Error("فشل تحميل المشرفين")
      const data = await res.json()
      setSupervisors(data.map(mapSupervisor))
    } catch (err) { setSupervisorsError(err.message) }
    finally { setSupervisorsLoading(false) }
  }, [])

  const fetchTeachers = useCallback(async () => {
    try {
      setTeachersLoading(true); setTeachersError(null)
      const res = await fetch(`${BASE}/teachers`)
      if (!res.ok) throw new Error("فشل تحميل المعلمين")
      setTeachers(await res.json())
    } catch (err) { setTeachersError(err.message) }
    finally { setTeachersLoading(false) }
  }, [])

  const fetchPrograms = useCallback(async () => {
    try {
      setProgramsLoading(true); setProgramsError(null)
      const res = await fetch(`${BASE}/programs`)
      if (!res.ok) throw new Error("فشل تحميل البرامج")
      setPrograms(await res.json())
    } catch (err) { setProgramsError(err.message) }
    finally { setProgramsLoading(false) }
  }, [])

  const fetchStudents = useCallback(async () => {
    try {
      setStudentsLoading(true); setStudentsError(null)
      const res = await fetch(`${BASE}/students`)
      if (!res.ok) throw new Error("فشل تحميل الطلاب")
      setStudents(await res.json())
    } catch (err) { setStudentsError(err.message) }
    finally { setStudentsLoading(false) }
  }, [])

  useEffect(() => {
    fetchSupervisors()
    fetchTeachers()
    fetchPrograms()
    fetchStudents()
  }, [fetchSupervisors, fetchTeachers, fetchPrograms, fetchStudents])

  // ─── Supervisors CRUD ──────────────────────────────────────────
  const addSupervisor = async (form) => {
    await fetch(`${BASE}/supervisors`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, isActive: form.status === 'active' }),
    })
    await fetchSupervisors()
  }
  const updateSupervisor = async (s) => {
    await fetch(`${BASE}/supervisors/${s.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: s.name, phone: s.phone, shift: s.shift, isActive: s.status === 'active' }),
    })
    await fetchSupervisors()
  }
  const deleteSupervisor  = async (id) => { await fetch(`${BASE}/supervisors/${id}`, { method: "DELETE" }); await fetchSupervisors() }
  const restoreSupervisor = async (id) => { await fetch(`${BASE}/supervisors/${id}/restore`, { method: "PATCH" }); await fetchSupervisors() }
  const toggleAbsent      = async (id) => { await fetch(`${BASE}/supervisors/${id}/toggle-absent`, { method: "PATCH" }); await fetchSupervisors() }

  // ─── Teachers CRUD ─────────────────────────────────────────────
  const addTeacher = async (form) => {
    await fetch(`${BASE}/teachers`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, phone: form.phone, program: form.program, shift: form.shift }),
    })
    await fetchTeachers()
  }
  const updateTeacher = async (t) => {
    await fetch(`${BASE}/teachers/${t.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: t.name, phone: t.phone, program: t.program, shift: t.shift }),
    })
    await fetchTeachers()
  }
  const deleteTeacher = async (id) => { await fetch(`${BASE}/teachers/${id}`, { method: "DELETE" }); await fetchTeachers() }

  // ─── Programs CRUD ─────────────────────────────────────────────
  const addProgram = async (form) => {
    await fetch(`${BASE}/programs`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, description: form.description, image: form.image }),
    })
    await fetchPrograms()
  }
  const updateProgram = async (p) => {
    await fetch(`${BASE}/programs/${p.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: p.name, description: p.description, image: p.image }),
    })
    await fetchPrograms()
  }
  const deleteProgram = async (p) => { await fetch(`${BASE}/programs/${p.id}`, { method: "DELETE" }); await fetchPrograms() }

  // ─── Students CRUD ─────────────────────────────────────────────
// const addStudent = async (form) => {
//   await fetch(`${BASE}/students`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       name: form.name,
//       phone: form.phone,
//       country: form.country || '',   // ← جديد
//       status: form.status,
//       teacherId: form.teacherId,
//       program: form.program,
//       notes: form.notes || '',
//       sessions: form.sessions || [],
//       contactMethod: form.contactMethod || '',
//       // sessionNumber مش بتبعته — الباك اند هو اللي بيحسبه
//     }),
//   })
//   await fetchStudents()
// }

// const updateStudent = async (s) => {
//   await fetch(`${BASE}/students/${s.id}`, {
//     method: "PUT",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       name:          s.name,
//       phone:         s.phone         || '',
//       country:       s.country       || '',
//       status:        s.status,
//       teacherId:     s.teacherId     || null,   // ← string أو null
//       program:       s.program       || '',
//       notes:         s.notes         || '',     // ← الاتنين عشان في فرق في التسمية
//       sessions:      s.sessions      || [],
//       contactMethod: s.contactMethod || '',
//       regularDates:  s.regularDates  || [],
//       trialDate:     s.trialDate     || '',
//       trialTime:     s.trialTime     || '',
//       pauseType:     s.pauseType     || '',
//       pauseUntil:    s.pauseUntil    || '',
//     }),
//   })
//   await fetchStudents()
// }
//   const deleteStudent = async (id) => { await fetch(`${BASE}/students/${id}`, { method: "DELETE" }); await fetchStudents() }

  // ─── Halaqas (لسه mock) ────────────────────────────────────────
  const addHalaqa    = (h)  => setHalaqas(p => [...p, { ...h, id: Date.now() }])
  const updateHalaqa = (h)  => setHalaqas(p => p.map(x => x.id === h.id ? h : x))
  const deleteHalaqa = (id) => setHalaqas(p => p.filter(x => x.id !== id))

  // ─── Sessions (لسه mock) ───────────────────────────────────────
// ─── Sessions ──────────────────────────────────────────────────


const fetchSessions = useCallback(async () => {
  try {
    setSessionsLoading(true); setSessionsError(null)
    const res = await fetch(`${BASE}/sessions`)
    if (!res.ok) throw new Error("فشل تحميل الحلقات")
    const data = await res.json()
    setSessions(data.filter(s => !s.isDeleted))
  } catch (err) { setSessionsError(err.message) }
  finally { setSessionsLoading(false) }
}, [])

useEffect(() => {
  fetchSupervisors()
  fetchTeachers()
  fetchPrograms()
  fetchStudents()
  fetchSessions()   // ← أضفها
}, [fetchSupervisors, fetchTeachers, fetchPrograms, fetchStudents, fetchSessions])

const addSession = async (form, teacherName, supervisorId, supervisorName) => {
  const res = await fetch(`${BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentName:    form.name,
      studentPhone:   form.phone,
      country:        form.country       || '',
      contactMethod:  form.contactMethod || '',
      teacherId:      form.teacherId     || null,
      teacherName:    teacherName        || '',
      supervisorId:   supervisorId       || null,
      supervisorName: supervisorName     || '',
      program:        form.program       || '',
      status:         form.status,
      trialDate:      form.trialDate     || '',
      trialTime:      form.trialTime     || '',
      regularDates:   form.regularDates  || [],
      pauseType:      form.pauseType     || '',
      pauseUntil:     form.pauseUntil    || '',
      notes:          form.notes         || '',
      flagged:        false,
      makeup:         null,
    }),
  })
  const data = await res.json()
  await fetchSessions()
  return data
}

const updateSession = async (id, form, teacherName) => {
  await fetch(`${BASE}/sessions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentName:   form.name,
      studentPhone:  form.phone,
      country:       form.country       || '',
      contactMethod: form.contactMethod || '',
      teacherId:     form.teacherId     || null,
      teacherName:   teacherName        || '',
      program:       form.program       || '',
      status:        form.status,
      trialDate:     form.trialDate     || '',
      trialTime:     form.trialTime     || '',
      regularDates:  form.regularDates  || [],
      pauseType:     form.pauseType     || '',
      pauseUntil:    form.pauseUntil    || '',
      notes:         form.notes         || '',
      flagged:       form.flagged       || false,
      makeup:        form.makeup        ?? null,
    }),
  })
  await fetchSessions()
}

const deleteSession  = async (id) => { await fetch(`${BASE}/sessions/${id}`, { method: "DELETE" }); await fetchSessions() }
const toggleFlag     = async (id) => { await fetch(`${BASE}/sessions/${id}/flag`, { method: "PATCH" }); await fetchSessions() }
const updateMakeup   = async (id, makeup) => {
  await fetch(`${BASE}/sessions/${id}/makeup`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ makeup }),
  })
  await fetchSessions()
}

  // ─── Postpone ──────────────────────────────────────────────────
  const resolvePostpone = (id, newDate, newTime) =>
    setPostponeRequests(p => p.map(x =>
      x.id === id ? { ...x, status: 'resolved', newDate, newTime } : x))

  return (
    <AppContext.Provider value={{
      // Supervisors
      supervisors, supervisorsLoading, supervisorsError,
      addSupervisor, updateSupervisor, deleteSupervisor, toggleAbsent, restoreSupervisor,
      // Teachers
      teachers, teachersLoading, teachersError,
      addTeacher, updateTeacher, deleteTeacher,
      // Programs
      programs, programsLoading, programsError,
      addProgram, updateProgram, deleteProgram,
      // Students
      // students, studentsLoading, studentsError,
      // addStudent, updateStudent, deleteStudent,
      // Halaqas
      halaqas, addHalaqa, updateHalaqa, deleteHalaqa,
      // Sessions
      sessions, sessionsLoading, sessionsError,
      addSession, updateSession, deleteSession, toggleFlag, updateMakeup,
      // Postpone
      postponeRequests, resolvePostpone,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)