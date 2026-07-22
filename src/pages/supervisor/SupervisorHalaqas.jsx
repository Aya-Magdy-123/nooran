import { useState, useMemo, useEffect } from "react";
import {
  BookOpen,
  Clock,
  Phone,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  HelpCircle,
  RefreshCw,
  Pencil,
  X,
  Save,
  Plus
} from "lucide-react";
import StudentSessionForm from "../../components/ui/StudentSessionForm";
import { useApp } from "../../context/AppContext";
import MakeupModal from "../../components/ui/MakeupModal";
import { createPortal } from "react-dom";
import { useRef } from "react";
// ← توليد الحصص (occurrences) ديناميكيًا فوق الحلقات — نفس اللي بتستخدمه AdminSessions
import { generateOccurrences } from "../../utils/generateOccurrences";

// ─── Status Badge ────────────────────────────────
// ← بقى فيه نوعين من الحالات بيتعرضوا بنفس المكوّن:
//   1) حالة الحلقة نفسها (session.status): active/trial/paused/cancelled
//   2) حالة الحصة (occurrence.status): pending/confirmed/absent/postponed/makeup/cancelled
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
      label: "قيد الانتظار",
    },
    confirmed: {
      icon: CheckCircle,
      className: "bg-green-50 text-green-700 border-green-200",
      label: "سيحضر",
    },
        cancelled: {
      icon: XCircle,
      className: "bg-red-50 text-red-600 border-red-200",
      label: "لن يحضر",
    },

    postponed: {
      icon: ClockIcon,
      className: "bg-amber-50 text-amber-700 border-amber-200",
      label: "طلب تعويض",
    },
    makeup: {
      icon: ClockIcon,
      className: "bg-purple-50 text-purple-700 border-purple-200",
      label: "تعويض محدَّد",
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

// ─── Attendance Status Dropdown ─────────────────────────
// ← بقت شغالة على مستوى الحصة (occurrence) مش الحلقة. أي تغيير هنا بيكتب
//   على sessionOccurrences عبر upsertOccurrenceLocal، بنفس منطق AdminSessions
//   تمامًا (بما فيه فتح postponeRequest تلقائي عند اختيار "postponed").
const ATTENDANCE_OPTIONS = ["confirmed", "absent", "postponed", "pending"];

function AttendanceStatusDropdown({ occurrence, parentSession }) {
  const { updateSessionLocal, allSessions } = useApp();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);

  const current = occurrence.status || "pending";

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
      const patch = { status: newStatus };
      if (newStatus !== "makeup") {
        patch.makeupDate = null;
        patch.makeup = null; // ← امسح ميعاد التعويض بالكامل لو رجّعنا الحالة لغير makeup
      }
      await upsertOccurrenceLocal(occurrence.sessionId, occurrence.date, patch, {
        studentName: occurrence.studentName || parentSession?.studentName,
        studentPhone: occurrence.studentPhone || parentSession?.studentPhone,
        teacherName: occurrence.teacherName || parentSession?.teacherName,
        supervisorId: occurrence.supervisorId || parentSession?.supervisorId,
        supervisorName: occurrence.supervisorName || parentSession?.supervisorName,
        time: occurrence.time,
        teacherTime: occurrence.teacherTime,
        teacherTime: occurrence.teacherTime,
      });
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

// ← Fix: كان ناقص import لـ ChevronDown هنا (كان جاي ضمنيًا من فوق) — أضفناه
import { ChevronDown, ChevronUp, Users } from "lucide-react";

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
  sessionNumber: s.sessionNumber || "",
  makeup: s.makeup ?? null,
  _hasBeenActive: ["active", "paused", "cancelled"].includes(s.status),
});

// ─── Edit Modal ────────────────────────────────────
function EditModal({ session, teachers, programs, onClose, onSave }) {
  // ← Fix: الـ AppContext بيصدّر updateSessionLocal مش updateSession —
  //   كان بيرمي error عند الحفظ (undefined is not a function)
    const { updateSessionLocal, allSessions } = useApp();   // ← ضيف allSessions هنا
  const [form, setForm] = useState(sessionToForm(session));
  const [saving, setSaving] = useState(false);
    const isDuplicateSessionNumber = (() => {
    const trimmed = String(form.sessionNumber || '').trim();
    if (!trimmed) return false;
    return (allSessions || []).some(s =>
      !s.isDeleted &&
      s.id !== session.id &&
      String(s.sessionNumber || '').trim().toLowerCase() === trimmed.toLowerCase()
    );
  })();

  const handleSave = async () => {
      if (isDuplicateSessionNumber) return;
      if (isDuplicateSessionNumber) return;
    try {
      setSaving(true);
      await updateSessionLocal(session.id, form);
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

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <StudentSessionForm
            form={form}
            setForm={setForm}
            teachers={teachers}
            programs={programs}
            editItem={session}
          />
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
             disabled={saving || isDuplicateSessionNumber}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl transition-all shadow-sm ${
                isDuplicateSessionNumber
                  ? 'bg-slate-300 cursor-not-allowed text-white'
                  : 'bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white'
              }`}
             disabled={saving || isDuplicateSessionNumber}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl transition-all shadow-sm ${
                isDuplicateSessionNumber
                  ? 'bg-slate-300 cursor-not-allowed text-white'
                  : 'bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white'
              }`}
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
  if (!makeup?.date || !makeup?.studentTime) return false;
  return new Date(`${makeup.date}T${makeup.studentTime}`) < new Date();
}

// ← تاريخ اليوم + رقم يوم الأسبوع بتوقيت القاهرة
function getTodayInfo() {
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const todayNumber = new Date(todayStr + "T00:00:00").getDay();
  return { todayStr, todayNumber };
}

// ← شفت وقت معيّن — مستخدمة في حساب مشرف التعويض الجديد (زي AdminSessions)
function getShiftForTime(time) {
  if (!time) return null;
  const hour = parseInt(time.split(":")[0]);
  if (hour >= 4 && hour < 12) return "morning";
  if (hour >= 12 && hour < 20) return "afternoon";
  return "evening";
}

// ─── MakeupCell — بقت شغالة على مستوى الحصة (occurrence) مش الحلقة ──
function MakeupCell({ occurrence, onOpen, onClearRequest }) {
  const { makeup } = occurrence;

  // ← الشرط الصحيح بقى على حالة *الحصة* نفسها، مش حالة الحلقة كلها
  const eligible = occurrence.status === "postponed" && !makeup?.confirmed;

  if (!makeup?.confirmed) {
    if (!eligible) return null;
    return (
      <button
        onClick={() => onOpen(occurrence)}
        className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-xs font-semibold hover:bg-purple-100 transition-all"
      >
        <Plus size={12} /> تعويض
      </button>
    );
  }

  const past = isMakeupPast(makeup);
  if (past) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-slate-400 line-through">
          {makeup.date} — {makeup.studentTime}
        </span>
        <button
          onClick={() => onOpen(occurrence)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-xs font-semibold hover:bg-purple-100 transition-all"
        >
          <Clock size={12} /> تعويض جديد
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 group relative min-w-[100px]">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0 animate-pulse" />
        <span className="text-xs font-semibold text-purple-700">{makeup.day}</span>
      </div>
      <span className="text-xs text-slate-600 font-mono">{makeup.date}</span>
      <button
        onClick={() => onClearRequest(occurrence)}
        className="absolute -top-1 -left-1 opacity-0 group-hover:opacity-100 w-5 h-5 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-xs hover:bg-red-200 transition-all"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────
export default function SupervisorHalaqas({ teachers, programs }) {
  const [loadData, setLoadData] = useState(false);

  const {
    sessionsForSupervisorLoading: loading,
    sessionsForSupervisorError: error,
    fetchSessionsForSupervisor,
    sessionsForSupervisor,
    occurrences, // ← جديد: مصدر حالات الحصص الحقيقي (نفس اللي AdminSessions بتستخدمه)
    upsertOccurrenceLocal,
    updateMakeupLocal,
    supervisors, // ← محتاجينها لحساب مشرف الشيفت الجديد وقت تحديد تعويض
  } = useApp();

  const supervisorId = localStorage.getItem("uid");

  const { todayStr, todayNumber } = useMemo(() => getTodayInfo(), []);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoadData(true);
        await fetchSessionsForSupervisor(supervisorId);
      } catch (e) {
        console.log(e.message);
      } finally {
        setLoadData(false);
      }
    };
    fetchSessions();
  }, [supervisorId]);

  const [expanded, setExpanded] = useState({});
  const [editSession, setEditSession] = useState(null);
  const toggleExpand = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));
  const [confirm, setConfirm] = useState(null);

  // ═══════════════════════════════════════════════════════════
  // ← Fix: sessionsForSupervisor أصلاً جاي مفلتر من السيرفر على المشرف
  //   الحالي (عبر getSupervisorSessions اللي بقت بتاخد في اعتبارها حالة
  //   التعويض confirmed كمان). فلترة تانية هنا على occurrence.supervisorId
  //   كانت بتشيل الحلقات غلط في حالة الـ makeup: الـ supervisorId بتاع
  //   الـ occurrence بيتجمّد (frozen) على قيمة مخزَّنة قديمة في بعض الحالات
  //   (isResolved/isPast/isSubstitute في generateOccurrences)، فمش دايمًا
  //   بيطابق نفس المشرف اللي السيرفر أصلاً رجّع الحلقة عشانه. شيل الفلتر
  //   المزدوج ده وسيب مصدر الحقيقة الوحيد هو getSupervisorSessions.
  // ═══════════════════════════════════════════════════════════
  const todayOccurrences = useMemo(() => {
    if (!sessionsForSupervisor?.length) return [];
    const list = generateOccurrences(sessionsForSupervisor, occurrences, {
      rangeStart: todayStr,
      rangeEnd: todayStr,
    });
    return list.map((o) => ({
      ...o,
      parentSession: sessionsForSupervisor.find((s) => s.id === o.sessionId),
    }));
  }, [sessionsForSupervisor, occurrences, todayStr]);

  // تجميع حصص اليوم حسب المعلم + الوقت
  const groups = useMemo(() => {
    if (!todayOccurrences.length) return [];
    const grouped = todayOccurrences.reduce((acc, o) => {
      const key = `${o.teacherId}_${o.time || ""}`;
      if (!acc[key])
        acc[key] = {
          key,
          teacherName: o.teacherName || "—",
          time: o.time || "—",
          occurrences: [],
        };
      acc[key].occurrences.push(o);
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => a.time.localeCompare(b.time));
  }, [todayOccurrences]);

  const getStats = (occs) => ({
    active: occs.filter((o) => o.parentSession?.status === "active").length,
    trial: occs.filter((o) => o.parentSession?.status === "trial").length,
    paused: occs.filter((o) => o.parentSession?.status === "paused").length,
    cancelled: occs.filter((o) => o.parentSession?.status === "cancelled").length,
  });

  const [makeupModal, setMakeupModal] = useState(false);
  const [makeupOccurrence, setMakeupOccurrence] = useState(null); // ← الحصة اللي بنحدد ليها تعويض
  const [makeupSession, setMakeupSession] = useState(null); // ← بس للعرض (اسم/رقم) جوه المودال
  const [makeupForm, setMakeupForm] = useState({
    day: "",
    date: "",
    studentTime: "",
    teacherTime: "",
    timezone: "Africa/Cairo",
  });

  const openMakeup = (occ) => {
    setMakeupOccurrence(occ);
    setMakeupSession({
      id: occ.sessionId,
      studentName: occ.studentName,
      sessionNumber: occ.sessionNumber,
      makeup: occ.makeup,
    });
    setMakeupForm(
      occ.makeup
        ? { ...occ.makeup }
        : { day: "", date: "", studentTime: "", teacherTime: "", timezone: "Africa/Cairo" }
    );
    setMakeupModal(true);
  };

  // ← تحديد تعويض: بيتسجل على مستوى الحصة (occurrence) — status: 'makeup'،
  //   مع تحديث نسخة الحلقة (session.makeup) كمان عشان reminderJob.js لسه
  //   بيقرا منها عشان يبعت تذكير الواتساب
  const saveMakeup = async () => {
    const makeupData = { ...makeupForm, confirmed: true };

    const makeupShift = getShiftForTime(makeupForm.teacherTime)
    const makeupShift = getShiftForTime(makeupForm.teacherTime)
    const shiftSupervisors = (supervisors || []).filter(
      (s) => s.shift === makeupShift && s.status === "active"
    );
    const newSupervisor = shiftSupervisors[0];

    if (newSupervisor) {
      makeupData.supervisorId = newSupervisor.id;
      makeupData.supervisorName = newSupervisor.name;
    }

    if (makeupOccurrence) {
      await upsertOccurrenceLocal(makeupOccurrence.sessionId, makeupOccurrence.date, {
        status: "makeup",
        makeup: makeupData,
        makeupDate: makeupForm.date,
        supervisorId: newSupervisor?.id || undefined,
        supervisorName: newSupervisor?.name || undefined,
      });
    }

    await updateMakeupLocal(makeupSession.id, makeupData);

    setMakeupModal(false);
    setMakeupOccurrence(null);
  };

  // ← حذف ميعاد التعويض — يرجع الحصة لحالة "طلب تعويض" (زي AdminSessions بالظبط)
  const handleClearMakeup = async (occ) => {
    await upsertOccurrenceLocal(occ.sessionId, occ.date, {
      status: "postponed",
      makeup: null,
      makeupDate: null,
    });
    setConfirm(null);
  };

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
          onClick={() => fetchSessionsForSupervisor(supervisorId)}
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
            {todayOccurrences.length} حصة اليوم ({todayStr})
          </p>
        </div>
        <button
          onClick={() => fetchSessionsForSupervisor(supervisorId)}
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
          <p className="text-gray-400 font-medium">لا توجد حلقات لك اليوم</p>
        </div>
      )}

      {/* Groups */}
      <div className="flex flex-col gap-4">
        {groups.map((group) => {
          const isOpen = expanded[group.key] === true;
          const stats = getStats(group.occurrences);

          return (
            <div key={group.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <button
                className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-5 hover:bg-gray-50/50 transition-colors text-right"
                onClick={() => toggleExpand(group.key)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={20} className="text-teal-600" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-base">
                      {group.occurrences[0]?.sessionNumber}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {group.time}
                      </span>
                    </div>

                    {!isOpen && (
                      <div className="flex flex-col gap-1 mt-2">
                        {group.occurrences.slice(0, 3).map((o) => (
                          <span key={o.id} className="text-xs text-gray-500 flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                            {o.studentName}
                            {o.parentSession?.studentPhone && (
                              <span className="flex items-center gap-1 text-gray-400">
                                <Phone size={11} /> {o.parentSession.studentPhone}
                              </span>
                            )}
                            <StatusBadge status={o.status} />
                          </span>
                        ))}
                        {group.occurrences.length > 3 && (
                          <span className="text-xs text-gray-400 mr-4">
                            +{group.occurrences.length - 3} أخرى...
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
                      isOpen ? "bg-teal-50 text-teal-600" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 overflow-x-auto z-[0]">
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
                          "حالة الحلقة",
                          "حالة الحصة",
                          "إجراء",
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
                      {group.occurrences.map((o) => {
                        const parentSession = o.parentSession;
                        return (
                          <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-4">
                              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                                #{o.sessionNumber}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-sm font-bold text-teal-700 flex-shrink-0">
                                  {o.studentName?.charAt(0) || "؟"}
                                </div>
                                <span className="font-medium text-gray-800">{o.studentName || "—"}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-xs text-gray-500 font-mono">
                              {parentSession?.studentPhone ? (
                                <span className="flex items-center gap-1">
                                  <Phone size={11} /> {parentSession.studentPhone}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-5 py-4 text-xs text-gray-500">{o.teacherName || "—"}</td>
                            <td className="px-5 py-4 text-xs text-gray-500">{parentSession?.country || "—"}</td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-gray-700 font-mono">{o.date}</span>
                                {o.teacherTime && <span className="text-xs text-gray-400 font-mono">مصر: {o.teacherTime}</span>}
                                {o.teacherTime && <span className="text-xs text-gray-400 font-mono">مصر: {o.teacherTime}</span>}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge status={parentSession?.status} />
                            </td>
                            <td className="px-5 py-4">
                              <AttendanceStatusDropdown occurrence={o} parentSession={parentSession} />
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1.5">
                                <MakeupCell
                                  occurrence={o}
                                  onOpen={openMakeup}
                                  onClearRequest={(occ) => setConfirm({ occ, type: "makeup" })}
                                />
                                {parentSession && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditSession(parentSession);
                                    }}
                                    title="تعديل الحلقة"
                                    className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-all"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                )}
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

      {editSession && (
        <EditModal
          session={editSession}
          teachers={teachers}
          programs={programs}
          onClose={() => setEditSession(null)}
          onSave={null}
        />
      )}

      {makeupModal && makeupSession && (
        <MakeupModal
          session={makeupSession}
          form={makeupForm}
          setForm={setMakeupForm}
          onClose={() => setMakeupModal(false)}
          onSave={saveMakeup}
        />
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto text-2xl">🗑️</div>
            <p className="text-slate-700 text-center font-medium">هل تريد حذف ميعاد التعويض؟</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirm(null)}
                className="px-5 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleClearMakeup(confirm.occ)}
                className="px-5 py-2 rounded-xl text-white text-sm font-medium bg-red-500 hover:bg-red-600"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}