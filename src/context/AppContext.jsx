import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../../firebase'
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import * as SupervisorsService from '../services/supervisorsService'
import * as TeachersService    from '../services/teachersService'
import * as ProgramsService    from '../services/programsService'
import * as SessionsService    from '../services/sessionsService'
import * as DistributionService from '../services/distributionService'
import * as PostponeService from '../services/postponeService'
import * as OccurrencesService from '../services/occurrencesService' // ← جديد
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore'


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

// ← جديد: الحصص المعدَّلة (overrides فوق الجدول الافتراضي للحلقات) — sessionOccurrences
const [occurrences,        setOccurrences]        = useState([])
const [occurrencesLoading, setOccurrencesLoading] = useState(false)
const [occurrencesError,   setOccurrencesError]   = useState(null)


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
      // ← قبل الجلب، رجّع أي طالب "متوقف لفترة محددة" انتهت مدته لحالة نشط تلقائيًا
      // await SessionsService.checkAndRevertPausedSessions();
      // await SessionsService.checkAndActivatePendingPauses();   // ← جديد

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

  // ← جديد: جلب كل الـ occurrences (overrides) مرة واحدة عند فتح الصفحة
  const fetchOccurrences = useCallback(async () => {
    try {
      setOccurrencesLoading(true); setOccurrencesError(null)
      const data = await OccurrencesService.getAllOccurrences()
      setOccurrences(data)
    } catch (err) { setOccurrencesError(err.message) }
    finally { setOccurrencesLoading(false) }
  }, [])


const fetchSessionsForSupervisor = useCallback (async(supervisorId)=> {
  try{
    setSessionsForSupervisorLoading(true);
    // ← بدل getSessionsPerDay() (بتجيب حصص اليوم بس) + فلترة يدوية،
    //   هات كل حلقات المشرف مباشرة من Firestore بغض النظر عن التاريخ
    const sessionsPerSupervisor = await SessionsService.getSupervisorSessions(supervisorId);
    setSessionsForSupervisor(sessionsPerSupervisor);
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
    // ← sessions / occurrences / postponeRequests بقوا realtime عن طريق onSnapshot (تحت)، مش محتاجين fetch يدوي هنا
  }, [authReady, currentUser, fetchSupervisors, fetchTeachers, fetchPrograms])

  // ← فحص "رجوع الطلاب المتوقفين نشط تلقائيًا" مرة واحدة بس عند فتح الصفحة
  //   (الفحص الحقيقي/اليومي شغال على السيرفر عبر resumePausedSessionsJob،
  //   واللي بيكتب على Firestore مباشرة — والـ onSnapshot تحت هيستقبل نتيجته
  //   لحظيًا زي أي تغيير تاني، من غير ما نحتاج نستدعيه إحنا تاني)
  const pausedCheckedRef = useRef(false)

  // ═══════════════════════════════════════════════════════════
  // ─── Realtime listeners (Firestore onSnapshot) ────────────────
  // بدل ما نجيب sessions / occurrences / postponeRequests مرة واحدة بس
  // وبعدين نعتمد على polling، بنعمل subscribe مباشر عليهم. أي تغيير يحصل
  // من برّه اللوحة (رد الطالب على الواتساب عبر الويب هوك، أو الجوب اليومي
  // اللي بيرجّع الطلاب المتوقفين نشط) بيوصل فورًا لكل تاب مفتوح من غير أي
  // refresh يدوي أو تأخير.
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!authReady || !currentUser) return

    setAllSessionsLoading(true)
    const unsub = onSnapshot(
      collection(db, 'sessions'),
      (snap) => {
        setAllSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setAllSessionsLoading(false)
        setAllSessionsError(null)

        //  if (!pausedCheckedRef.current) {
        //   pausedCheckedRef.current = true
        //   // ← شبكة أمان، صامتة لو فشلت: ترجيع المتوقفين اللي خلصت مدتهم +
        //   //   تفعيل التوقفات المجدولة اللي وصل معادها فعليًا
        //   Promise.all([
        //     SessionsService.checkAndRevertPausedSessions(),
        //     SessionsService.checkAndActivatePendingPauses(),
        //   ]).catch(() => {})
        // }
      },
      (err) => { setAllSessionsError(err.message); setAllSessionsLoading(false) }
    )
    return () => unsub()
  }, [authReady, currentUser])

  useEffect(() => {
    if (!authReady || !currentUser) return

    setOccurrencesLoading(true)
    const unsub = onSnapshot(
      collection(db, 'sessionOccurrences'),
      (snap) => {
        setOccurrences(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setOccurrencesLoading(false)
        setOccurrencesError(null)
      },
      (err) => { setOccurrencesError(err.message); setOccurrencesLoading(false) }
    )
    return () => unsub()
  }, [authReady, currentUser])

  useEffect(() => {
    if (!authReady || !currentUser) return

    setPostponeLoading(true)
    const unsub = onSnapshot(
      collection(db, 'postponeRequests'),
      (snap) => {
        setPostponeRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setPostponeLoading(false)
        setPostponeError(null)
      },
      (err) => { setPostponeError(err.message); setPostponeLoading(false) }
    )
    return () => unsub()
  }, [authReady, currentUser])

  // ─── Supervisors CRUD ──────────────────────────────────────
  const addSupervisor = async (form) => {
    await SupervisorsService.addSupervisor({ ...form, isActive: form.status === 'active' })
    await fetchSupervisors()
  }
const updateSupervisor = async (s) => {
  const before = supervisors.find(sup => sup.id === s.id)   // ← الشيفت القديم قبل التعديل
  await SupervisorsService.updateSupervisor(s.id, {
    name: s.name, phone: s.phone, shift: s.shift, isActive: s.status === 'active'
  })
  await fetchSupervisors()

  // ← لو الشيفت اتغيّر، أعد توزيع الشيفتين (القديم والجديد) تلقائيًا
  if (before && before.shift !== s.shift) {
    await DistributionService.redistributeShift(before.shift)
    await DistributionService.redistributeShift(s.shift)
  }
}
  const deleteSupervisor  = async (id, shift) => { await SupervisorsService.deleteSupervisor(id, shift);  await fetchSupervisors() }
  const restoreSupervisor = async (id, shift) => { await SupervisorsService.restoreSupervisor(id, shift); await fetchSupervisors() }
  // ← بقت بتاخد absentFrom (بداية الإجازة) و absentUntil (نهايتها) بدل ما كانت تاريخ واحد بس
const addAbsence = async (id, absentFrom, absentUntil) => {
  await SupervisorsService.addAbsence(id, absentFrom, absentUntil)
  await fetchSupervisors()
}

const deleteAbsence = async (id, absenceId) => {
  await SupervisorsService.deleteAbsence(id, absenceId)
  await fetchSupervisors()
}

const updateAbsence = async (id, absenceId, from, until) => {
  await SupervisorsService.updateAbsence(id, absenceId, from, until)
  await fetchSupervisors()
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

// إضافة حلقة — الاعتماد الكامل على onSnapshot لتحديث allSessions، بدون أي setAllSessions يدوي
const addSessionLocal = async (form, teacherName) => {
  const teacher = teachers.find(t => t.id === form.teacherId)
  const result  = await SessionsService.addSession(form, teacher?.name || teacherName || '')
  // ← ملحوظة: مفيش setAllSessions هنا خالص — onSnapshot هيستقبل الإضافة تلقائيًا
  return result
}

// تعديل حلقة — نفس الفكرة، onSnapshot هيحدّث allSessions تلقائيًا
const updateSessionLocal = async (id, form, teacherName) => {
  const teacher = teachers.find(t => t.id === form.teacherId)
  await SessionsService.updateSession(id, form, teacher?.name || teacherName || '')
  const fresh = await SessionsService.getSessionById(id) // لو محتاجه للـ return value بس (زي استخدامه في saveMakeup)
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
      const resolvedList = await PostponeService.resolvePostponeBySessionId(id, makeup.date, makeup.studentTime)
      for (const r of resolvedList) {
        if (!r.originalDate) continue
        await upsertOccurrenceLocal(r.sessionId, r.originalDate, {
          status: 'makeup',
          makeupDate: makeup.date,
        })
      }
    }

    setAllSessions(prev => prev.map(s => s.id === id ? { ...s, makeup: makeup ?? null } : s))
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
    const resolved = await PostponeService.resolvePostponeRequest(id, newDate, newTime)

    if (resolved?.originalDate) {
      await upsertOccurrenceLocal(resolved.sessionId, resolved.originalDate, {
        status: 'makeup',
        makeupDate: newDate,
      })
    }

    await fetchPostponeRequests()
  }

  const deletePostponeRequestLocal = async (sessionId, originalDate) => {
  await PostponeService.deletePostponeRequestBySessionAndDate(sessionId, originalDate)
  setPostponeRequests(prev =>
    prev.filter(r => !(r.sessionId === sessionId && r.originalDate === originalDate))
  )
}
  // ═══════════════════════════════════════════════════════════
  // ─── Occurrences (حصص الحلقات) ───────────────────────────────
  // ← جديد: تحديث/إنشاء override لحصة واحدة محليًا، بدون إعادة جلب كل الـ occurrences.
  //   لو الـ patch فيه status، بنستخدم updateOccurrenceStatus (نفس منطق الواتساب:
  //   confirmed / absent / postponed / pending... مع فتح postponeRequest تلقائي
  //   عند postponed). أي حقول تانية (زي makeupDate يدوي) بتتطبّق فوقها بـ upsert عادي.
  //
  //   meta (اختياري): { studentName, studentPhone, teacherName, supervisorId, time }
  //   بتُستخدم بس لو الحالة postponed عشان بناء postponeRequest كامل البيانات
  // ═══════════════════════════════════════════════════════════
  const upsertOccurrenceLocal = async (sessionId, date, patch = {}, meta = {}) => {
    let result

    if (patch.status) {
      result = await OccurrencesService.updateOccurrenceStatus(sessionId, date, patch.status, meta)

      // لو فيه حقول إضافية اتبعتت مع status (مثلاً makeupDate يدوي من المشرف)
      const extra = { ...patch }
      delete extra.status
      if (Object.keys(extra).length) {
        result = await OccurrencesService.upsertOccurrence(sessionId, date, extra)
      }
    } else {
      result = await OccurrencesService.upsertOccurrence(sessionId, date, patch)
    }

    setOccurrences(prev => {
      const idx = prev.findIndex(o => o.sessionId === sessionId && o.date === date)
      if (idx === -1) return [...prev, result]
      const next = [...prev]
      next[idx] = { ...next[idx], ...result }
      return next
    })

    // لو اتحولت لـ postponed، حدّث قائمة طلبات التأجيل عشان تظهر فورًا
    if (patch.status === 'postponed') {
      await fetchPostponeRequests()
    }

    // ← جديد: لو الحالة اتغيّرت *بعيدًا* عن postponed (لأي حاجة غير makeup،
    //   لأن makeup بيتصرف ليها في مسارها الخاص عن طريق resolvePostpone)،
    //   امسح أي طلب تأجيل معلّق مرتبط بنفس الحصة، عشان يختفي فورًا من
    //   جدول "طلبات التأجيل"
    if (patch.status && patch.status !== 'postponed' && patch.status !== 'makeup') {
      await PostponeService.deletePostponeRequestBySessionAndDate(sessionId, date)
      setPostponeRequests(prev =>
        prev.filter(r => !(r.sessionId === sessionId && r.originalDate === date))
      )
    }

    return result
  }

  // حذف override — رجوع الحصة لحالتها الافتراضية المتولّدة
  const deleteOccurrenceLocal = async (occurrenceId, sessionId, date) => {
    await OccurrencesService.deleteOccurrence(occurrenceId)
    setOccurrences(prev => prev.filter(o => o.id !== occurrenceId))
  }



  const addHalaqa    = h   => setHalaqas(p => [...p, { ...h, id: Date.now() }])
  const updateHalaqa = h   => setHalaqas(p => p.map(x => x.id === h.id ? h : x))
  const deleteHalaqa = id  => setHalaqas(p => p.filter(x => x.id !== id))

  return (
    <AppContext.Provider value={{
       authReady, currentUser,
      supervisors, supervisorsLoading, supervisorsError,
      addSupervisor, updateSupervisor, deleteSupervisor, addAbsence, updateAbsence, deleteAbsence, restoreSupervisor,
      teachers, teachersLoading, teachersError,
      addTeacher, updateTeacher, deleteTeacher,
      programs, programsLoading, programsError,
      addProgram, updateProgram, deleteProgram,

      fetchAllSessions, allSessions, allSessionsLoading, allSessionsError,

      // ← جديد: occurrences
      occurrences, occurrencesLoading, occurrencesError, fetchOccurrences,
      upsertOccurrenceLocal, deleteOccurrenceLocal,

      sessionsPerDay, sessionsPerDayError, sessionsPerDayLoading, fetchSessionsPerDay, sessionsForSupervisor, fetchSessionsForSupervisor,
      sessionsForSupervisorLoading, sessionsForSupervisorError,

      addSessionLocal, updateSessionLocal, deleteSessionLocal, toggleFlagLocal, updateMakeupLocal, updateAttendanceStatus,
      halaqas, addHalaqa, updateHalaqa, deleteHalaqa,
       resolvePostpone,redistributeShift,postponeRequests,deletePostponeRequestLocal,
       postponeLoading, postponeError, fetchPostponeRequests, distributionSessions
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)