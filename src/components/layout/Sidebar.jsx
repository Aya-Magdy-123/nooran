// src/components/layout/Sidebar.jsx
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import logo from '../../assets/logo.png'

export default function Sidebar({ role, links }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile burger button */}
      <button
        onClick={() => setIsOpen(true)}
  className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-brand-dark"
        aria-label="فتح القائمة"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-black/40 z-40"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 right-0 h-screen z-50
          w-64 md:w-56
          bg-white border-l border-gray-100 flex flex-col shadow-sm shrink-0
          transform transition-transform duration-300 ease-in-out
          md:translate-x-0
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                <img src={logo} alt="ZAD of Quran" className="w-full h-full object-contain p-1" />
              </div>
              <div>
                <div className="text-sm font-bold text-brand-dark leading-tight">  جدول مواعيد زاد </div>
                <div className="text-[10px] text-gray-400">
                  {role === 'admin' ? 'لوحة الأدمن' : 'لوحة المشرف'}
                </div>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-50"
              aria-label="إغلاق القائمة"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          {links.map(link => (
            link.divider
              ? <div key={link.label} className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest px-3 pt-4 pb-1">{link.label}</div>
              : <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) => isActive ? 'nav-item-active' : 'nav-item'}
                >
                  <link.icon size={17} />
                  <span>{link.label}</span>
                </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100">
          <NavLink to="/login" onClick={() => setIsOpen(false)} className="nav-item text-xs">
            <span>↩</span>
            <span>العودة للرئيسية</span>
          </NavLink>
        </div>
      </aside>
    </>
  )
}