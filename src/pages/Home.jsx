// src/pages/Home.jsx
import { Link } from 'react-router-dom'
import { ShieldCheck, User } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-6" dir="rtl">
      <div className="text-center max-w-md w-full">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-brand-gold flex items-center justify-center mx-auto mb-6">
          <span className="text-brand-dark text-2xl font-black">ن</span>
        </div>
        <h1 className="text-3xl font-black text-white mb-2">أكاديمية نوران</h1>
        <p className="text-gray-400 text-sm mb-10">نظام إدارة المواعيد والحلقات</p>

        <div className="flex flex-col gap-4">
          <Link
            to="/admin"
            className="group bg-brand-primary hover:bg-[#1e3472] transition-all text-white
                       rounded-2xl p-5 flex items-center gap-4 text-right"
          >
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">لوحة الأدمن</div>
              <div className="text-sm text-blue-200">إدارة المستخدمين والحصص والإحصائيات</div>
            </div>
          </Link>

          <Link
            to="/supervisor"
            className="group bg-white/10 hover:bg-white/15 transition-all text-white
                       rounded-2xl p-5 flex items-center gap-4 text-right border border-white/10"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-gold/20 flex items-center justify-center shrink-0">
              <User size={22} className="text-brand-gold" />
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">لوحة المشرف</div>
              <div className="text-sm text-gray-400">متابعة الطلاب وإدارة الحصص وطلبات التأجيل</div>
            </div>
          </Link>
        </div>

        <p className="text-gray-600 text-xs mt-8">نسخة تجريبية — مايو 2026</p>
      </div>
    </div>
  )
}
