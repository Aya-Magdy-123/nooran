// src/pages/Settings.jsx
import { useState } from 'react'
import { changePassword } from '../services/authService'
import { KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react'

export default function Settings() {
  const name = localStorage.getItem('name') || 'المستخدم'

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

  return (
    <div dir="rtl" className="max-w-lg mx-auto py-10 px-4 font-sans">

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

        <form onSubmit={handle} className="px-6 py-5 space-y-4">

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
            className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${
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
    </div>
  )
}