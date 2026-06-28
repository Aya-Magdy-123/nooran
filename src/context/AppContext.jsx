import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../firebase'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as SupervisorsService from '../services/supervisorsService'
import * as TeachersService    from '../services/teachersService'
import * as ProgramsService    from '../services/programsService'
import * as SessionsService    from '../services/sessionsService'
import * as DistributionService from '../services/distributionService'
import * as PostponeService from '../services/postponeService'
import { collection, getDocs } from 'firebase/firestore'



const AppContext = createContext(null)
const mapSupervisor = s => ({ ...s, status: s.isActive && !s.isDeleted ? 'active' : s.isDeleted? 'deleted': 'absent' })

export function AppProvider({ children }) {

    const [authReady, setAuthReady] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
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

const [distributionSessions, setDistributionSessions]        = useState([]);

const [sessionsPerDay, setSessionsPerDay] = useState([]);
const [sessionsPerDayLoading, setsessionsPerDayLoading] = useState(false)
const [sessionsPerDayError,   setsessionsPerDayError]   = useState(null)

const [sessionsForSupervisorLoading, setSessionsForSupervisorLoading] = useState(false)
const [sessionsForSupervisorError,   setSessionsForSupervisorError]   = useState(null)
const[ sessionsForSupervisor , setSessionsForSupervisor] = useState([]);

const [postponeRequests,       setPostponeRequests]       = useState([])
const [postponeLoading,        setPostponeLoading]        = useState(true)
const [postponeError,          setPostponeError]          = useState(null)
const [halaqas,          setHalaqas]          = useState([])

// ← المصدر الوحيد للحلقات دلوقتي: allSessions (تتحمل مرة واحدة، والفلاتر/الـ pagination كلها client-side)
const[allSessions, setAllSessions]= useState([]);
const[allSessionsLoading, setAllSessionsLoading]= useState(false);
const[allSessionsError, setAllSessionsError]= useState(false);


  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setAuthReady(true)
    })
    return unsub
  }, [])
  // ─── Fetch ─────────────────────────────────────────────────
  const fetchSupervisors = useCallback(async () => {
    try {
      setSupervisorsLoading(true); setSupervisorsError(null)
      const data = await SupervisorsService.getSupervisors()
      setSupervisors(data.map(mapSupervisor))
    } catch (err) { setSupervisorsError(err.message) }
    finally { setSupervisorsLoading(false) }
  }, [])

  const fetchSessionsPerDay = useCallback (async()=> {
    try{
      setsessionsPerDayLoading(true);
      const res = await SessionsService.getSessionsPerDay();
      console.log(res);
      
      setSessionsPerDay(res);
      setsessionsPerDayLoading(false);
    }
    catch(e){
      setsessionsPerDayError(e.message);
    }
    finally{
      setsessionsPerDayLoading(false);
    }
  },[]);

   const fetchAllSessions = useCallback (async()=> {
    try{
      setAllSessionsLoading(true);
      const res = await SessionsService.getAllSessions();
      console.log(res);
      
      setAllSessions(res);
      setAllSessionsLoading(false);
    }
    catch(e){
      setAllSessionsError(e.message);
    }
    finally{
      setAllSessionsLoading(false);
    }
  },[]);


  const fetchSessionsForSupervisor = useCallback (async(supervisorId)=> {
    try{
      setSessionsForSupervisorLoading(true);
      const sessions = await SessionsService.getSessionsPerDay();
      const sessionsPerSupervisor = sessions.filter((s) => s.supervisorId === supervisorId);

      setSessionsForSupervisor(sessionsPerSupervisor);
      setSessionsForSupervisorLoading(false);
    }
    catch(e){
      setSessionsForSupervisorError(e.message);
    }
    finally{
      setSessionsForSupervisorLoading(false);
    }
  },[]);



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

const fetchSessionsForDistribution = useCallback(async() => {
  const snapshot = await getDocs(query(collection(db, "sessions"), where("status", "!=", "cancelled")));
  const sessions = snapshot.docs.map((doc)=> {
    const today = new Date().toISOString().split('T')[0];
    const arr = [];
    if( today >= doc.data().startDate )
      arr.push({id: doc.id, ...doc.data()});
    
    return arr;
  });
  setDistributionSessions(sessions);

},[])

   const fetchPostponeRequests = useCallback(async () => {
  try {
    setPostponeLoading(true); setPostponeError(null)
    setPostponeRequests(await PostponeService.getPostponeRequests())
  } catch (err) { setPostponeError(err.message) }
  finally { setPostponeLoading(false) }
}, [])

  const redistributeShift = async (shift) => {
  await DistributionService.redistributeShift(shift)
  await fetchAllSessions()
}

 useEffect(() => {
    if (!authReady || !currentUser) return   // ← ميبدأش غير لما الأوث يكون جاهز ومسجل

    fetchSupervisors()
    fetchTeachers()
    fetchPrograms()
    fetchPostponeRequests()
    fetchAllSessions()   // ← تحميل كل الحلقات مرة واحدة عند فتح الصفحة (للفلاتر/الـ pagination الـ client-side)
  }, [authReady, currentUser, fetchSupervisors, fetchTeachers, fetchPrograms, fetchPostponeRequests, fetchAllSessions])

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
  const deleteSupervisor  = async (id, shift) => { await SupervisorsService.deleteSupervisor(id, shift);  await fetchSupervisors() }
  const restoreSupervisor = async (id, shift) => { await SupervisorsService.restoreSupervisor(id, shift); await fetchSupervisors() }
  // ← بقت بتاخد absentFrom (بداية الإجازة) و absentUntil (نهايتها) بدل ما كانت تاريخ واحد بس
  const toggleAbsent      = async (id, absentFrom = null, absentUntil = null) => {
    await SupervisorsService.toggleAbsent(id, absentFrom, absentUntil)
    await fetchSupervisors()
    await fetchAllSessions()
  }

  // ─── Teachers CRUD ─────────────────────────────────────────
  const addTeacher    = async (form) => { await TeachersService.addTeacher(form);         await fetchTeachers() }
  const updateTeacher = async (t)    => { await TeachersService.updateTeacher(t.id, t);   await fetchTeachers() }
  const deleteTeacher = async (id)   => { await TeachersService.deleteTeacher(id);        await fetchTeachers() }

  // ─── Programs CRUD ─────────────────────────────────────────
  const addProgram    = async (form) => { await ProgramsService.addProgram(form);         await fetchPrograms() }
  const updateProgram = async (p)    => { await ProgramsService.updateProgram(p.id, p);   await fetchPrograms() }
  const deleteProgram = async (p)    => { await ProgramsService.deleteProgram(p.id);      await fetchPrograms() }

  // ─── Sessions CRUD — بتشتغل على allSessions محليًا، بدون إعادة جلب كل الحلقات ──
  // كل عملية هنا بتعمل أقل عدد قراءات ممكن: قراءة واحدة (getDoc) بعد الكتابة، أو صفر قراءات للحذف/الفلاج.

  // إضافة حلقة — كتابة واحدة + قراءة واحدة (getDoc) للتأكد من تطابق البيانات، بعدين إضافة النتيجة محليًا
  const addSessionLocal = async (form, teacherName) => {
    const teacher = teachers.find(t => t.id === form.teacherId)
    const result  = await SessionsService.addSession(form, teacher?.name || teacherName || '')
    const fresh   = await SessionsService.getSessionById(result.id)   // قراءة واحدة بس
    if (fresh) setAllSessions(prev => [fresh, ...prev])
    return result
  }

  // تعديل حلقة — كتابة + قراءة واحدة (getDoc)، بعدين استبدال العنصر محليًا في allSessions
  const updateSessionLocal = async (id, form, teacherName) => {
    const teacher = teachers.find(t => t.id === form.teacherId)
    await SessionsService.updateSession(id, form, teacher?.name || teacherName || '')
    const fresh = await SessionsService.getSessionById(id)   // قراءة واحدة بس
    if (fresh) setAllSessions(prev => prev.map(s => s.id === id ? fresh : s))
    return fresh
  }

  // حذف (soft delete) — بعد تأكيد الكتابة في Firestore، نشيل العنصر محليًا بدون أي قراءة إضافية
  const deleteSessionLocal = async (id) => {
    await SessionsService.deleteSession(id)
    setAllSessions(prev => prev.filter(s => s.id !== id))
  }

  // فلاج — toggleFlag بترجع القيمة الجديدة من نفسها، فبنحدّث محليًا بدون أي قراءة إضافية
  const toggleFlagLocal = async (id) => {
    const newValue = await SessionsService.toggleFlag(id)
    setAllSessions(prev => prev.map(s => s.id === id ? { ...s, flagged: newValue } : s))
    return newValue
  }

  // تعويض — بعد تأكيد الكتابة، نحدّث محليًا بنفس القيمة اللي بعتناها (بدون قراءة إضافية)
const updateMakeupLocal = async (id, makeup) => {
  await SessionsService.updateMakeup(id, makeup)
  if (makeup?.date) {
    await PostponeService.resolvePostponeBySessionId(id, makeup.date, makeup.studentTime)
  }
  setAllSessions(prev => prev.map(s => s.id === id ? { ...s, makeup: makeup ?? null } : s))
  // ← أضف السطر ده
  setSessionsForSupervisor(prev => prev.map(s => s.id === id ? { ...s, makeup: makeup ?? null } : s))
  await fetchPostponeRequests()
}

// ─── تحديث حالة الحضور يدويًا (من لوحة المشرف) ─────────────────
const updateAttendanceStatus = async (id, newStatus) => {
  await SessionsService.updateAttendanceStatus(id, newStatus)
  const fresh = await SessionsService.getSessionById(id)
  if (fresh) {
    // ← حدّث allSessions
    setAllSessions(prev => prev.map(s => s.id === id ? fresh : s))
    // ← حدّث sessionsForSupervisor كمان
    setSessionsForSupervisor(prev => prev.map(s => s.id === id ? fresh : s))
  }
  await fetchPostponeRequests()
}

  // ─── Postpone  ──────────────────────────────────
const resolvePostpone = async (id, newDate, newTime) => {
  await PostponeService.resolvePostponeRequest(id, newDate, newTime)
  await fetchPostponeRequests()
}



  const addHalaqa    = h   => setHalaqas(p => [...p, { ...h, id: Date.now() }])
  const updateHalaqa = h   => setHalaqas(p => p.map(x => x.id === h.id ? h : x))
  const deleteHalaqa = id  => setHalaqas(p => p.filter(x => x.id !== id))

  return (
    <AppContext.Provider value={{
       authReady, currentUser,
      supervisors, supervisorsLoading, supervisorsError,
      addSupervisor, updateSupervisor, deleteSupervisor, toggleAbsent, restoreSupervisor,
      teachers, teachersLoading, teachersError,
      addTeacher, updateTeacher, deleteTeacher,
      programs, programsLoading, programsError,
      addProgram, updateProgram, deleteProgram,

      fetchAllSessions, allSessions, allSessionsLoading, allSessionsError,

      sessionsPerDay, sessionsPerDayError, sessionsPerDayLoading, fetchSessionsPerDay, sessionsForSupervisor, fetchSessionsForSupervisor,
      sessionsForSupervisorLoading, sessionsForSupervisorError,

      addSessionLocal, updateSessionLocal, deleteSessionLocal, toggleFlagLocal, updateMakeupLocal, updateAttendanceStatus,
      halaqas, addHalaqa, updateHalaqa, deleteHalaqa,
       resolvePostpone,redistributeShift,postponeRequests,
       postponeLoading, postponeError, fetchPostponeRequests, distributionSessions
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)