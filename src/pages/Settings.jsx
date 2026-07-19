// src/pages/Settings.jsx
import { useState, useEffect } from 'react'
import { changePassword } from '../services/authService'
import { addAdmin, getAdmins, toggleAdminStatus} from '../services/adminsService'
import { KeyRound, Eye, EyeOff, ShieldCheck, UserPlus, Ban, CheckCircle2, X, Loader2, AlertTriangle } from 'lucide-react'

export default function Settings() {
  const name = localStorage.getItem('name') || 'المستخدم'
  const role = localStorage.getItem('role') || ''
  const isAdmin = role === 'admin'

  const [form,    setForm]    = useState({ current: '', next: '', confirm: '' })
  const [show,    setShow]    = useState({ current: false, next: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState(null)

  const toggleShow = (field) => setShow(p => ({ ...p, [field]: !p[field] }))
  const valid = form.current && form.next.length >= 6 && form.next === form.confirm

  const handle = async (e) => {
    e.preventDefault()
    if (!valid) return
    try {
      setLoading(true); setMsg(null)
      await changePassword(form.current, form.next)
      setMsg({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح ✓' })
      setForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      setMsg({ type: 'error', text: err.code === 'auth/wrong-password' ? 'كلمة المرور الحالية غلط' : 'حدث خطأ، حاول مرة أخرى' })
    } finally {
      setLoading(false)
    }
  }

  const ic = "w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all pr-4 pl-10"
  const plainInput = "w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all"

  // ── حالة قسم إدارة الأدمنز ──────────────────────────────────
  const [admins,      setAdmins]      = useState([])
  const [adminsLoad,  setAdminsLoad]  = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [newAdmin,    setNewAdmin]    = useState({email: ''})
  const [addLoading,  setAddLoading]  = useState(false)
  const [addErr,      setAddErr]      = useState(null)
  const [togglingId,  setTogglingId]  = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null) // الأدمن اللي هيتوقف/يتفعل دلوقتي

  useEffect(() => {
    if (!isAdmin) return
    fetchAdmins()
  }, [isAdmin])

  const fetchAdmins = async () => {
    try {
      setAdminsLoad(true)
      const list = await getAdmins()
      setAdmins(list)
    } catch (err) {
      console.error(err)
    } finally {
      setAdminsLoad(false)
    }
  }

const handleAddAdmin = async (e) => {
  e.preventDefault()
  if (!newAdmin.email) return
  try {
    setAddLoading(true); setAddErr(null)
    const created = await addAdmin(newAdmin)
    setAdmins(p => [...p, created])
    setNewAdmin({ email: '' })
    setShowModal(false)
  } catch (err) {
    setAddErr(err.code === 'auth/email-already-in-use' ? 'الإيميل ده مستخدم قبل كده' : 'حصل خطأ، حاول تاني')
  } finally {
    setAddLoading(false)
  }
}

  const handleToggle = (admin) => {
    setConfirmTarget(admin) // بيفتح مودال التأكيد بدل window.confirm
  }

  const confirmToggle = async () => {
    if (!confirmTarget) return
    const admin = confirmTarget
    const willDisable = !admin.disabled
    setConfirmTarget(null)

    try {
      setTogglingId(admin.id)
      await toggleAdminStatus(admin.id, willDisable)
      setAdmins(p => p.map(a => a.id === admin.id ? { ...a, disabled: willDisable } : a))
    } catch (err) {
      console.error(err)
      alert('حصل خطأ، حاول تاني')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div dir="rtl" className="w-full mx-auto py-10 px-4 font-sans">

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">الإعدادات</h1>
        <p className="text-sm text-slate-500 mt-0.5">مرحباً، {name}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <KeyRound size={18} className="text-teal-600"/>
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">تغيير كلمة المرور</p>
            <p className="text-xs text-slate-400">يجب أن تكون 6 أحرف على الأقل</p>
          </div>
        </div>

        <form onSubmit={handle} className="px-6 py-5 space-y-4 ">

          {/* كلمة المرور الحالية */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">كلمة المرور الحالية</label>
            <div className="relative">
              <input type={show.current ? 'text' : 'password'} placeholder="••••••"
                value={form.current} onChange={e => setForm(p => ({ ...p, current: e.target.value }))}
                className={ic}/>
              <button type="button" onClick={() => toggleShow('current')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {show.current ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>

          {/* كلمة المرور الجديدة */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">كلمة المرور الجديدة</label>
            <div className="relative">
              <input type={show.next ? 'text' : 'password'} placeholder="6 أحرف على الأقل"
                value={form.next} onChange={e => setForm(p => ({ ...p, next: e.target.value }))}
                className={ic}/>
              <button type="button" onClick={() => toggleShow('next')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {show.next ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>

          {/* تأكيد كلمة المرور */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">تأكيد كلمة المرور</label>
            <div className="relative">
              <input type={show.confirm ? 'text' : 'password'} placeholder="أعد كتابة كلمة المرور"
                value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                className={ic}/>
              <button type="button" onClick={() => toggleShow('confirm')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {show.confirm ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>

          {form.next && form.next.length < 6 && (
            <p className="text-xs text-amber-500">كلمة المرور قصيرة جداً</p>
          )}
          {form.next && form.confirm && form.next !== form.confirm && (
            <p className="text-xs text-red-500">كلمتا المرور غير متطابقتين</p>
          )}

          {msg && (
            <div className={`flex items-center gap-2 text-xs px-4 py-3 rounded-xl font-medium ${
              msg.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {msg.type === 'success' && <ShieldCheck size={14}/>}
              {msg.text}
            </div>
          )}

          <button type="submit" disabled={!valid || loading}
            className={`px-4  py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${
              valid && !loading ? 'bg-teal-600 hover:bg-teal-700 shadow-sm' : 'bg-slate-300 cursor-not-allowed'
            }`}>
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                  جاري الحفظ...
                </span>
              : 'حفظ كلمة المرور'}
          </button>
        </form>
      </div>

      {/* ── قسم إدارة الأدمنز — للأدمن بس ─────────────────────── */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                <ShieldCheck size={18} className="text-teal-600"/>
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">إدارة الأدمن</p>
                <p className="text-xs text-slate-400">{admins.length} أدمن مسجل</p>
              </div>
            </div>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all">
              <UserPlus size={15}/>
              إضافة أدمن
            </button>
          </div>

          <div className="px-6 py-5">
            {adminsLoad ? (
              <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
                <Loader2 size={16} className="animate-spin"/> جاري التحميل...
              </div>
            ) : admins.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-10">لا يوجد أدمنز حتى الآن</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-right text-xs text-slate-400 border-b border-slate-100">
                      {/* <th className="pb-3 font-semibold">الاسم</th> */}
                      <th className="pb-3 font-semibold">الإيميل</th>
                      {/* <th className="pb-3 font-semibold">الهاتف</th> */}
                      <th className="pb-3 font-semibold">الحالة</th>
                      <th className="pb-3 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map(a => (
                      <tr key={a.id} className="border-b border-slate-50 last:border-0">
                        {/* <td className="py-3 font-medium text-slate-700">{a.name}</td> */}
                        <td className="py-3 text-slate-500">{a.email}</td>
                        {/* <td className="py-3 text-slate-500">{a.phone || '—'}</td> */}
                        <td className="py-3">
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                            a.disabled ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
                          }`}>
                            {a.disabled ? 'موقوف' : 'نشط'}
                          </span>
                        </td>
                        <td className="py-3 text-left">
                          <button onClick={() => handleToggle(a)} disabled={togglingId === a.id}
                            className={`flex items-center gap-1 text-xs font-medium disabled:opacity-40 transition-colors ${
                              a.disabled ? 'text-green-600 hover:text-green-800' : 'text-red-500 hover:text-red-700'
                            }`}>
                            {togglingId === a.id
                              ? <Loader2 size={14} className="animate-spin"/>
                              : a.disabled ? <CheckCircle2 size={14}/> : <Ban size={14}/>}
                            {a.disabled ? 'تفعيل' : 'إيقاف'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── مودال إضافة أدمن ─────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-800 text-base">إضافة أدمن جديد</h3>
              <button onClick={() => { setShowModal(false); setAddErr(null) }}
                className="text-slate-400 hover:text-slate-600">
                <X size={18}/>
              </button>
            </div>

            <form onSubmit={handleAddAdmin} className="space-y-3">
              {/* <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">الاسم</label>
                <input value={newAdmin.name} onChange={e => setNewAdmin(p => ({ ...p, name: e.target.value }))}
                  className={plainInput} placeholder="اسم الأدمن" required/>
              </div> */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">الإيميل</label>
                <input type="email" value={newAdmin.email} onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))}
                  className={plainInput} placeholder="admin@example.com" required/>
              </div>
              {/* <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">الهاتف</label>
                <input value={newAdmin.phone} onChange={e => setNewAdmin(p => ({ ...p, phone: e.target.value }))}
                  className={plainInput} placeholder="01xxxxxxxxx"/>
              </div> */}

              <p className="text-[11px] text-slate-400">كلمة المرور الافتراضية: <span className="font-mono">123456</span> </p>

              {addErr && (
                <div className="text-xs px-4 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200">
                  {addErr}
                </div>
              )}

              <button type="submit" disabled={addLoading}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2">
                {addLoading ? <><Loader2 size={15} className="animate-spin"/> جاري الإضافة...</> : 'إضافة'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── مودال تأكيد إيقاف/تفعيل الأدمن ────────────────────── */}
      {confirmTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center" dir="rtl">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
              confirmTarget.disabled ? 'bg-green-50' : 'bg-red-50'
            }`}>
              {confirmTarget.disabled
                ? <CheckCircle2 size={26} className="text-green-600"/>
                : <AlertTriangle size={26} className="text-red-500"/>}
            </div>

            <h3 className="font-bold text-slate-800 text-base mb-1.5">
              {confirmTarget.disabled ? 'تفعيل الأدمن' : 'إيقاف الأدمن'}
            </h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              {confirmTarget.disabled
                ? <>متأكد إنك عايز ترجّع صلاحية <span className="font-semibold text-slate-700">{confirmTarget.email}</span>؟</>
                : <>متأكد إنك عايز توقف صلاحية <span className="font-semibold text-slate-700">{confirmTarget.email}</span>؟</>}
            </p>

            <div className="flex items-center gap-3">
              <button onClick={() => setConfirmTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">
                إلغاء
              </button>
              <button onClick={confirmToggle}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm ${
                  confirmTarget.disabled ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'
                }`}>
                {confirmTarget.disabled ? 'تفعيل' : 'إيقاف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}