import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as SupervisorsService from '../services/supervisorsService'
import * as TeachersService    from '../services/teachersService'
import * as ProgramsService    from '../services/programsService'
import * as SessionsService    from '../services/sessionsService'
import * as DistributionService from '../services/distributionService'


const AppContext = createContext(null)
const mapSupervisor = s => ({ ...s, status: s.isActive ? 'active' : 'absent' })

export function AppProvider({ children }) {

  // ─── States ────────────────────────────────────────────────
  const [supervisors,       setSupervisors]       = useState([])
  const [supervisorsLoading, setSupervisorsLoading] = useState(true)
  const [supervisorsError,   setSupervisorsError]   = useState(null)

  const [teachers,       setTeachers]       = useState([])
  const [teachersLoading, setTeachersLoading] = useState(true)
  const [teachersError,   setTeachersError]   = useState(null)

  const [programs,       setPrograms]       = useState([])
  const [programsLoading, setProgramsLoading] = useState(true)
  const [programsError,   setProgramsError]   = useState(null)

const [sessions,        setSessions]        = useState([])
const [sessionsLoading, setSessionsLoading] = useState(true)
const [sessionsError,   setSessionsError]   = useState(null)
const [sessionsPage,    setSessionsPage]    = useState(1)
const [sessionsTotal,   setSessionsTotal]   = useState(0)
const [sessionsLastDoc, setSessionsLastDoc] = useState(null)
const [sessionsHasMore, setSessionsHasMore] = useState(false)
// cursor stack — كل عنصر هو lastDoc للصفحة اللي قبلها
const [cursorStack,     setCursorStack]     = useState([])

const PAGE_SIZE = 20

  const [postponeRequests, setPostponeRequests] = useState([])
  const [halaqas,          setHalaqas]          = useState([])

  // ─── Fetch ─────────────────────────────────────────────────
  const fetchSupervisors = useCallback(async () => {
    try {
      setSupervisorsLoading(true); setSupervisorsError(null)
      const data = await SupervisorsService.getSupervisors()
      setSupervisors(data.map(mapSupervisor))
    } catch (err) { setSupervisorsError(err.message) }
    finally { setSupervisorsLoading(false) }
  }, [])

  const fetchTeachers = useCallback(async () => {
    try {
      setTeachersLoading(true); setTeachersError(null)
      setTeachers(await TeachersService.getTeachers())
    } catch (err) { setTeachersError(err.message) }
    finally { setTeachersLoading(false) }
  }, [])

  const fetchPrograms = useCallback(async () => {
    try {
      setProgramsLoading(true); setProgramsError(null)
      setPrograms(await ProgramsService.getPrograms())
    } catch (err) { setProgramsError(err.message) }
    finally { setProgramsLoading(false) }
  }, [])

 const fetchSessions = useCallback(async () => {
  try {
    setSessionsLoading(true); setSessionsError(null)
    const [{ sessions, lastDoc, hasMore }, total] = await Promise.all([
      SessionsService.getSessionsPage(),
      // SessionsService.getSessionsCount(),
    ])
    setSessions(sessions)
    setSessionsLastDoc(lastDoc)
    setSessionsHasMore(hasMore)
    setSessionsTotal(total)
    setSessionsPage(1)
    setCursorStack([])
  } catch (err) { setSessionsError(err.message) }
  finally { setSessionsLoading(false) }
}, [])

const nextPage = async () => {
  if (!sessionsHasMore || sessionsLoading) return
  try {
    setSessionsLoading(true)
    const { sessions, lastDoc, hasMore } = await SessionsService.getSessionsPage(sessionsLastDoc)
    setCursorStack(p => [...p, sessionsLastDoc])   // احفظ cursor الصفحة الحالية
    setSessions(sessions)
    setSessionsLastDoc(lastDoc)
    setSessionsHasMore(hasMore)
    setSessionsPage(p => p + 1)
  } catch (err) { setSessionsError(err.message) }
  finally { setSessionsLoading(false) }
}

const prevPage = async () => {
  if (sessionsPage <= 1 || sessionsLoading) return
  try {
    setSessionsLoading(true)
    const stack      = [...cursorStack]
    const prevCursor = stack.length > 1 ? stack[stack.length - 2] : null
    const { sessions, lastDoc, hasMore } = await SessionsService.getSessionsPage(prevCursor)
    stack.pop()
    setCursorStack(stack)
    setSessions(sessions)
    setSessionsLastDoc(lastDoc)
    setSessionsHasMore(hasMore)
    setSessionsPage(p => p - 1)
  } catch (err) { setSessionsError(err.message) }
  finally { setSessionsLoading(false) }
}



  const redistributeShift = async (shift) => {
  await DistributionService.redistributeShift(shift)
  await fetchSessions()
}

  useEffect(() => {
    fetchSupervisors()
    fetchTeachers()
    fetchPrograms()
    fetchSessions()
  }, [fetchSupervisors, fetchTeachers, fetchPrograms, fetchSessions])

  // ─── Supervisors CRUD ──────────────────────────────────────
  const addSupervisor = async (form) => {
    await SupervisorsService.addSupervisor({ ...form, isActive: form.status === 'active' })
    await fetchSupervisors()
  }
  const updateSupervisor = async (s) => {
    await SupervisorsService.updateSupervisor(s.id, {
      name: s.name, phone: s.phone, shift: s.shift, isActive: s.status === 'active'
    })
    await fetchSupervisors()
  }
  const deleteSupervisor  = async (id) => { await SupervisorsService.deleteSupervisor(id);  await fetchSupervisors() }
  const restoreSupervisor = async (id) => { await SupervisorsService.restoreSupervisor(id); await fetchSupervisors() }
  const toggleAbsent      = async (id) => { await SupervisorsService.toggleAbsent(id);      await fetchSupervisors(); await fetchSessions() }

  // ─── Teachers CRUD ─────────────────────────────────────────
  const addTeacher    = async (form) => { await TeachersService.addTeacher(form);         await fetchTeachers() }
  const updateTeacher = async (t)    => { await TeachersService.updateTeacher(t.id, t);   await fetchTeachers() }
  const deleteTeacher = async (id)   => { await TeachersService.deleteTeacher(id);        await fetchTeachers() }

  // ─── Programs CRUD ─────────────────────────────────────────
  const addProgram    = async (form) => { await ProgramsService.addProgram(form);         await fetchPrograms() }
  const updateProgram = async (p)    => { await ProgramsService.updateProgram(p.id, p);   await fetchPrograms() }
  const deleteProgram = async (p)    => { await ProgramsService.deleteProgram(p.id);      await fetchPrograms() }

  // ─── Sessions CRUD ─────────────────────────────────────────
  const addSession = async (form, teacherName) => {
    const teacher = teachers.find(t => t.id === form.teacherId)
    const result  = await SessionsService.addSession(form, teacher?.name || teacherName || '')
    await fetchSessions()
    return result
  }
  const updateSession = async (id, form, teacherName) => {
    const teacher = teachers.find(t => t.id === form.teacherId)
    await SessionsService.updateSession(id, form, teacher?.name || teacherName || '')
    await fetchSessions()
  }
  const deleteSession  = async (id)          => { await SessionsService.deleteSession(id);        await fetchSessions() }
  const toggleFlag     = async (id)          => { await SessionsService.toggleFlag(id);           await fetchSessions() }
  const updateMakeup   = async (id, makeup)  => { await SessionsService.updateMakeup(id, makeup); await fetchSessions() }

  // ─── Postpone (لسه local) ──────────────────────────────────
  const resolvePostpone = (id, newDate, newTime) =>
    setPostponeRequests(p => p.map(x =>
      x.id === id ? { ...x, status: 'resolved', newDate, newTime } : x))

  const addHalaqa    = h   => setHalaqas(p => [...p, { ...h, id: Date.now() }])
  const updateHalaqa = h   => setHalaqas(p => p.map(x => x.id === h.id ? h : x))
  const deleteHalaqa = id  => setHalaqas(p => p.filter(x => x.id !== id))

  return (
    <AppContext.Provider value={{
      supervisors, supervisorsLoading, supervisorsError,
      addSupervisor, updateSupervisor, deleteSupervisor, toggleAbsent, restoreSupervisor,
      teachers, teachersLoading, teachersError,
      addTeacher, updateTeacher, deleteTeacher,
      programs, programsLoading, programsError,
      addProgram, updateProgram, deleteProgram,
      sessions, sessionsLoading, sessionsError, fetchSessions,
      sessionsPage, sessionsTotal, sessionsHasMore,
      nextPage, prevPage,
 
      addSession, updateSession, deleteSession, toggleFlag, updateMakeup,
      halaqas, addHalaqa, updateHalaqa, deleteHalaqa,
      postponeRequests, resolvePostpone,redistributeShift,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)