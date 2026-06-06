// src/context/AppContext.jsx
import { createContext, useContext, useState } from 'react'
import {
  SUPERVISORS, TEACHERS, STUDENTS,
  SESSIONS, POSTPONE_REQUESTS,HALAQAS, PROGRAMS
} from '../data/mockData'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [supervisors, setSupervisors] = useState(SUPERVISORS)
  const [teachers, setTeachers]       = useState(TEACHERS)
  const [students, setStudents]       = useState(STUDENTS)
  const [sessions, setSessions]       = useState(SESSIONS)
  const[programs, setPrograms]         = useState(PROGRAMS)
  const [postponeRequests, setPostponeRequests] = useState(POSTPONE_REQUESTS)
const [halaqas, setHalaqas] = useState(HALAQAS)

  // ─── Supervisors ───────────────────────────────────────────────
  const addSupervisor = (s)    => setSupervisors(p => [...p, { ...s, id: Date.now() }])
  const updateSupervisor = (s) => setSupervisors(p => p.map(x => x.id === s.id ? s : x))
  const deleteSupervisor = (id)=> setSupervisors(p => p.filter(x => x.id !== id))
  const toggleAbsent = (id)    => setSupervisors(p =>
    p.map(x => x.id === id ? { ...x, status: x.status === 'absent' ? 'active' : 'absent' } : x))

  // ─── Teachers ──────────────────────────────────────────────────
  const addTeacher    = (t) => setTeachers(p => [...p, { ...t, id: Date.now(), students: 0 }])
  const updateTeacher = (t) => setTeachers(p => p.map(x => x.id === t.id ? t : x))
  const deleteTeacher = (id)=> setTeachers(p => p.filter(x => x.id !== id))

  // ___ Programs __________________________________________________
  const addProgram = (q) => setPrograms((p)=> [...p, {...q, id: Date.now()}])
  const updateProgram = (q) => setPrograms((p)=> p.map(x => x.id === q.id ? q : x))
  const deleteProgram = (q) => setPrograms((p)=> p.filter(x => x.id !== q.id))

  // ─── Students ──────────────────────────────────────────────────
  const addStudent    = (s) => setStudents(p => [...p, { ...s, id: Date.now(), attendance: null }])
  const updateStudent = (s) => setStudents(p => p.map(x => x.id === s.id ? s : x))
  const deleteStudent = (id)=> setStudents(p => p.filter(x => x.id !== id))

  // ─── Sessions ──────────────────────────────────────────────────
  const addHalaqa    = (h) => setHalaqas(p => [...p, { ...h, id: Date.now() }])
const updateHalaqa = (h) => setHalaqas(p => p.map(x => x.id === h.id ? h : x))
const deleteHalaqa = (id) => setHalaqas(p => p.filter(x => x.id !== id))
// ------------------------------------
  const addSession = (s) => {
    // Auto-assign to supervisor with least load among non-absent
    const available = supervisors.filter(sv => sv.status !== 'absent')
    const counts = {}
    available.forEach(sv => {
      counts[sv.id] = sessions.filter(
        ss => ss.date === s.date && ss.supervisorId === sv.id
      ).length
    })
    const assigned = available.reduce((min, sv) =>
      (counts[sv.id] || 0) < (counts[min?.id] || Infinity) ? sv : min, available[0])
    const newSession = { ...s, id: Date.now(), supervisorId: assigned?.id || null, flagged: false }
    setSessions(p => [...p, newSession])
    return assigned
  }
  const updateSession = (s) => setSessions(p => p.map(x => x.id === s.id ? s : x))
  const deleteSession = (id)=> setSessions(p => p.filter(x => x.id !== id))

  // ─── Postpone ──────────────────────────────────────────────────
  const resolvePostpone = (id, newDate, newTime) =>
    setPostponeRequests(p => p.map(x =>
      x.id === id ? { ...x, status: 'resolved', newDate, newTime } : x))

  return (
  <AppContext.Provider value={{
    supervisors, teachers, students, programs, sessions, postponeRequests,
    addSupervisor, updateSupervisor, deleteSupervisor, toggleAbsent,
    addTeacher, updateTeacher, deleteTeacher,
    addProgram, updateProgram, deleteProgram,
    addStudent, updateStudent, deleteStudent,
    addSession, updateSession, deleteSession,
    resolvePostpone, halaqas, addHalaqa, updateHalaqa, deleteHalaqa,
  }}>
    {children}
  </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
