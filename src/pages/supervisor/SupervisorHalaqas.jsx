import { useState, useMemo, useEffect } from "react";
import {
  BookOpen,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  Phone,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  HelpCircle,
  RefreshCw,
  Pencil,
  X,
  Save,CalendarClock,
  Plus
} from "lucide-react";
import StudentSessionForm from "../../components/ui/StudentSessionForm";
import { useApp } from "../../context/AppContext"; // ← استبدل BASE بالـ Context
import MakeupModal from "../../components/ui/MakeupModal"; 
import { createPortal } from "react-dom";
import { useRef } from "react";

// ─── Status Badge (بدون تغيير) ────────────────────────────────
const StatusBadge = ({ status }) => {
  const config = {
    active: {
      icon: CheckCircle,
      className: "bg-green-50 text-green-700 border-green-200",
      label: "نشط",
    },
    trial: {
      icon: ClockIcon,
      className: "bg-amber-50 text-amber-700 border-amber-200",
      label: "تجريبي",
    },
    paused: {
      icon: ClockIcon,
      className: "bg-orange-50 text-orange-700 border-orange-200",
      label: "متوقف",
    },
    pending: {
      icon: ClockIcon,
      className: "bg-blue-50 text-blue-700 border-blue-200",
      label: "في الانتظار",
    },
    confirmed: {
      icon: CheckCircle,
      className: "bg-green-50 text-green-700 border-green-200",
      label: "مؤكد",
    },
    no_show: {
      icon: XCircle,
      className: "bg-red-50 text-red-600 border-red-200",
      label: "غياب",
    },
    postponed: {
      icon: ClockIcon,
      className: "bg-amber-50 text-amber-700 border-amber-200",
      label: "طلب تأجيل",
    },
    cancelled: {
      icon: XCircle,
      className: "bg-red-50 text-red-600 border-red-200",
      label: "ملغي",
    },
  };
  const cfg = config[status] || {
    icon: HelpCircle,
    className: "bg-gray-50 text-gray-500 border-gray-200",
    label: status,
  };
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.className}`}
    >
      <Icon size={12} /> {cfg.label}
    </span>
  );
};

// ─── Attendance Status Dropdown (جديد) ─────────────────────────
// ← بادج حالة الحضور + سهم بيفتح قائمة لتغيير الحالة يدويًا
const ATTENDANCE_OPTIONS = ["confirmed", "no_show", "postponed", "pending"];



function AttendanceStatusDropdown({ session }) {
  const { updateAttendanceStatus } = useApp();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);

  const current = session.attendanceStatus || "pending";

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((p) => !p);
  };

  const handlePick = async (newStatus) => {
    if (newStatus === current) {
      setOpen(false);
      return;
    }
    try {
      setSaving(true);
      await updateAttendanceStatus(session.id, newStatus);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        onClick={handleToggle}
        disabled={saving}
        className="flex items-center gap-1 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50"
      >
        <StatusBadge status={current} />
        {saving ? (
          <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
        ) : (
          <ChevronDown size={12} className="text-slate-400" />
        )}
      </button>

      {open &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
            />
            <div
              className="fixed z-[9999] bg-white border border-slate-100 rounded-xl shadow-lg py-1 min-w-[150px]"
              style={{ top: pos.top, right: pos.right }}
              dir="rtl"
            >
              {ATTENDANCE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePick(opt);
                  }}
                  className={`w-full text-right px-3 py-2 text-xs hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 ${
                    opt === current ? "bg-slate-50" : ""
                  }`}
                >
                  <StatusBadge status={opt} />
                  {opt === current && (
                    <CheckCircle size={12} className="text-teal-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

// ─── Map session → form shape (بدون تغيير) ────────────────────
const sessionToForm = (s) => ({
  name: s.studentName || "",
  phone: s.studentPhone || "",
  country: s.country || "",
  contactMethod: s.contactMethod || "",
  teacherId: s.teacherId || "",
  program: s.program || "",
  status: s.status || "trial",
  trialDate: s.trialDate || "",
  trialTime: s.trialTime || "",
  trialTeacherTime: s.trialTeacherTime || "",
  regularDates: s.regularDates || [],
  pauseType: s.pauseType || "",
  pauseUntil: s.pauseUntil || "",
  notes: s.notes || "",
  flagged: s.flagged || false,
  makeup: s.makeup ?? null,
  _hasBeenActive: ["active", "paused", "cancelled"].includes(s.status),
});

// ─── Edit Modal ────────────────────────────────────────────────
function EditModal({ session, teachers, programs, onClose, onSave }) {
  const { updateSession } = useApp(); // ← من Context مباشر
  const [form, setForm] = useState(sessionToForm(session));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      // updateSession(id, form, teacherName) — نفس signature الموجود في Context
      await updateSession(session.id, form);
      await onSave?.();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800">تعديل الحلقة</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              #{session.sessionNumber} — {session.studentName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <StudentSessionForm
            form={form}
            setForm={setForm}
            teachers={teachers}
            programs={programs}
            editItem={session}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white rounded-xl transition-all shadow-sm"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
          </button>
        </div>
      </div>
    </div>
  );
}

function isMakeupPast(makeup) {
  if (!makeup?.date || !makeup?.studentTime) return false
  return new Date(`${makeup.date}T${makeup.studentTime}`) < new Date()
}

function MakeupCell({ session, onOpen, onClearRequest }) {
  const { makeup } = session

  // ← الشرط الصحيح: يظهر بس لو فيه طلب تأجيل معلّق ومفيش makeup مؤكد
  const eligible = session.attendanceStatus === 'postponed' && !makeup?.confirmed

  if (!makeup?.confirmed) {
    if (!eligible) return null   // ← مش —، خالص ميظهرش حاجة
    return (
      <button onClick={() => onOpen(session)}
        className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-xs font-semibold hover:bg-purple-100 transition-all">
        <Plus size={12}/> تعويض
      </button>
    )
  }

  const past = isMakeupPast(makeup)
  if (past) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-slate-400 line-through">{makeup.date} — {makeup.studentTime}</span>
        <button onClick={() => onOpen(session)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-xs font-semibold hover:bg-purple-100 transition-all">
          <Clock size={12}/> تعويض جديد
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 group relative min-w-[100px]">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0 animate-pulse"/>
        <span className="text-xs font-semibold text-purple-700">{makeup.day}</span>
      </div>
      <span className="text-xs text-slate-600 font-mono">{makeup.date}</span>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────
export default function SupervisorHalaqas({ teachers, programs }) {

  const[loadData, setLoadData] = useState(false);

  const {
    sessionsPerDay,
    sessionsForSupervisorLoading: loading,
    sessionsForSupervisorError: error,
    fetchSessionsForSupervisor,
    sessionsForSupervisor,
updateMakeupLocal,
 resolvePostpone  // لو محتاج زر تحديث يدوي
  } = useApp();

  const supervisorId = localStorage.getItem("uid");

  useEffect(()=>{
    const fetchSessions = async () => {
    try{
    setLoadData(true);
    await fetchSessionsForSupervisor(supervisorId);
    setLoadData(false);
    }
    catch(e){
      console.log(e.message);
    }
    }  
    fetchSessions();
  },[supervisorId]);

  console.log(sessionsForSupervisor);
  

const [postponeResolving, setPostponeResolving] = useState(null)

 

  const [expanded, setExpanded] = useState({});
  const [editSession, setEditSession] = useState(null);

  const toggleExpand = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const [confirm, setConfirm] = useState(null)

const handleClearMakeup = async (id) => {
  await updateMakeupLocal(id, null)
  setConfirm(null)
}

  // تجميع حسب المعلم + الوقت
  const groups = useMemo(() => {
  if (!sessionsForSupervisor?.length) return []; // ← guard

  const grouped = sessionsForSupervisor?.reduce((acc, s) => {
    const key = `${s.teacherId}_${s.trialTime || s.regularDates?.[0]?.time || ""}`;
    if (!acc[key])
      acc[key] = {
        key,
        teacherName: s.teacherName || "—",
        time: s.trialTime || s.regularDates?.[0]?.time || "—",
        sessions: [],
      };
    acc[key].sessions.push(s);
    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => a.time.localeCompare(b.time));
}, [sessionsForSupervisor]);
  const getStats = (sess) => ({
    active: sess.filter((s) => s.status === "active").length,
    trial: sess.filter((s) => s.status === "trial").length,
    paused: sess.filter((s) => s.status === "paused").length,
    cancelled: sess.filter((s) => s.status === "cancelled").length,
  });

    const [makeupModal,   setMakeupModal]   = useState(false);
  const [makeupSession, setMakeupSession] = useState(null);
  const [makeupForm,    setMakeupForm]    = useState({
    day: '', date: '', studentTime: '', teacherTime: '', timezone: 'Africa/Cairo'
  });

   const openMakeup = (s) => {
    setMakeupSession(s);
    setMakeupForm({ day:'', date:'', studentTime:'', teacherTime:'', timezone:'Africa/Cairo' });
    setMakeupModal(true);
  };

const saveMakeup = async () => {
  console.log('Saving makeup for session ID:', makeupSession.id)   // ← أضف ده مؤقتاً
  await updateMakeupLocal(makeupSession.id, { ...makeupForm, confirmed: true })
  // if (postponeResolving) {
  //   console.log('Resolving postpone for:', postponeResolving)   // ← وده
  //   await resolvePostpone(postponeResolving, makeupForm.date, makeupForm.studentTime)
  //   setPostponeResolving(null)
  // }

  setMakeupModal(false)
}

  if (loading)
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full ml-2" />
        جاري تحميل الحلقات...
      </div>
    );

  if (error)
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-3">⚠️ {error}</p>
        <button
          onClick={()=> fetchSessionsForSupervisor(supervisorId)}
          className="text-sm text-teal-600 hover:underline"
        >
          إعادة المحاولة
        </button>
      </div>
    );

  return (
    <div dir="rtl" className="space-y-5 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">حلقاتي</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {sessionsForSupervisor?.length} حلقة مخصصة لك
          </p>
        </div>
        {/* الـ Context بيعمل refetch تلقائي، بس تقدر تسيب الزرار */}
        <button
          onClick={()=> fetchSessionsForSupervisor(supervisorId)}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all"
        >
          <RefreshCw size={14} /> تحديث
        </button>
      </div>

      {/* Empty */}
      {groups.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={24} className="text-teal-400" />
          </div>
          <p className="text-gray-400 font-medium">
            لا توجد حلقات موزعة عليك حالياً
          </p>
        </div>
      )}

      {/* Groups */}
      <div className="flex flex-col gap-4">
        {groups.map((group) => {
          const isOpen = expanded[group.key] === true;
          const stats = getStats(group.sessions);

          return (
            <div
              key={group.key}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm "
            >
              {/* Group Header */}
              <button
                className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-5 hover:bg-gray-50/50 transition-colors text-right"
                onClick={() => toggleExpand(group.key)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={20} className="text-teal-600" />
                  </div>
                  <div>
                    {/* <div className="font-bold text-gray-800 text-base">
                      {group.teacherName}
                    </div> */} 

                       <div className="font-bold text-gray-800 text-base">
                      {group.sessions[0]?.sessionNumber}
                     </div> 
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {group.time}
                      </span>
                      {/* <span className="flex items-center gap-1">
                        <Users size={11} /> {group.sessions.length} حلقة
                      </span> */}
                    </div>

                   {/* ← بدل الشرط القديم بده */}
                    {!isOpen && (
                      <div className="flex flex-col gap-1 mt-2">
                        {group.sessions.slice(0, 3).map((s) => (
                          <>
                          <span
                            key={s.id}
                            className="text-xs text-gray-500 flex items-center gap-3"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                            {s.studentName}
                            {s.studentPhone && (
                              <span className="flex items-center gap-1 text-gray-400">
                                <Phone size={11} /> {s.studentPhone}
                              </span>
                            )}
                            <StatusBadge status={s.attendanceStatus || "لم يُحدَّد"} />
                          </span>

</>
                          
                          
                        )
                        )
                        }

                        {group.sessions.length > 3 && (
                          <span className="text-xs text-gray-400 mr-4">
                            +{group.sessions.length - 3} أخرى...
                          </span>
                        )}


                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start md:self-center">
                  <div className="flex gap-2 flex-wrap">
                    {stats.active > 0 && (
                      <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-xl font-semibold">
                        {stats.active} نشط
                      </span>
                    )}
                    {stats.trial > 0 && (
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-xl font-semibold">
                        {stats.trial} تجريبي
                      </span>
                    )}
                    {stats.paused > 0 && (
                      <span className="text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2.5 py-1 rounded-xl font-semibold">
                        {stats.paused} متوقف
                      </span>
                    )}
                    {stats.cancelled > 0 && (
                      <span className="text-xs bg-red-50 text-red-600 border border-red-100 px-2.5 py-1 rounded-xl font-semibold">
                        {stats.cancelled} ملغي
                      </span>
                    )}

                  </div>
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                      isOpen
                        ? "bg-teal-50 text-teal-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isOpen ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </div>
                </div>
              </button>

              {/* Table */}
              {isOpen && (
                <div className="border-t border-gray-100 overflow-x-auto z-[0] ">
                  <table className="w-full min-w-[560px]">
                    <thead>
                      <tr className="bg-gray-50/80">
                        {[
                          "رقم الحلقة",
                          "الطالب",
                          "الهاتف",
                          "المعلم",
                          "البلد",
                          "الموعد",
                          "الحالة",
                          "حالة الحضور",
                          " إجراء",
                        ].map((h, i) => (
                          <th
                            key={i}
                            className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {group.sessions.map((s) => {
                        const dateDisplay =
                          s.trialDate || s.regularDates?.[0]?.day || "—";
                        const timeDisplay =
                          s.trialTime || s.regularDates?.[0]?.time || "";
                        return (
                          <tr
                            key={s.id}
                            className="hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="px-5 py-4">
                              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                                #{s.sessionNumber}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-700 flex-shrink-0">
                                  {s.studentName?.charAt(0) || "؟"}
                                </div>
                                <span className="font-medium text-gray-800">
                                  {s.studentName || "—"}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-xs text-gray-500 font-mono">
                              {s.studentPhone ? (
                                <span className="flex items-center gap-1">
                                  <Phone size={11} /> {s.studentPhone}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                              <td className="px-5 py-4 text-xs text-gray-500">
                              {s.teacherName || "—"}
                            </td>
                            <td className="px-5 py-4 text-xs text-gray-500">
                              {s.country || "—"}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-gray-700 font-mono">
                                  {dateDisplay}
                                </span>
                                {timeDisplay && (
                                  <span className="text-xs text-gray-400 font-mono">
                                    {timeDisplay}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge status={s.status} />
                            </td>

                            <td className="px-5 py-4">
                              <AttendanceStatusDropdown session={s}  />
                            </td>


                           

                            <td className="px-4 py-4">
  <div className="flex items-center gap-1.5">
   <MakeupCell session={s} onOpen={openMakeup}
    onClearRequest={(id) => setConfirm({ id, type: 'makeup' })}/>
                    

    <button
      onClick={(e) => { e.stopPropagation(); setEditSession(s); }}
      title="تعديل الحلقة"
      className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-all"
    >
      <Pencil size={14} />
    </button>
  </div>
</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editSession && (
        <EditModal
          session={editSession}
          teachers={teachers}
          programs={programs}
          onClose={() => setEditSession(null)}
          onSave={null} // مش محتاج — Context بيعمل refetch تلقائي
        />
      )}

      {/* ← Makeup Modal الجديد */}
     {makeupModal && makeupSession && (
      <MakeupModal
      session={makeupSession}
      form={makeupForm}
      setForm={setMakeupForm}
      onClose={() => setMakeupModal(false)}
      onSave={saveMakeup}
    />
  )}

  {/* Confirm Dialog */}
{confirm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto text-2xl">🗑️</div>
      <p className="text-slate-700 text-center font-medium">هل تريد حذف ميعاد التعويض؟</p>
      <div className="flex gap-3 justify-center">
        <button onClick={() => setConfirm(null)}
          className="px-5 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm">إلغاء</button>
        <button onClick={() => handleClearMakeup(confirm.id)}
          className="px-5 py-2 rounded-xl text-white text-sm font-medium bg-red-500 hover:bg-red-600">تأكيد الحذف</button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}