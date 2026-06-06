// src/components/layout/Sidebar.jsx
import { NavLink } from 'react-router-dom'
import logo from '../../assets/logo.png'

export default function Sidebar({ role, links }) {
  return (
    <aside className="w-56 bg-white border-l border-gray-100 flex flex-col h-screen sticky top-0 shadow-sm shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
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
                className={({ isActive }) => isActive ? 'nav-item-active' : 'nav-item'}
              >
                <link.icon size={17} />
                <span>{link.label}</span>
              </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100">
        <NavLink to="/login" className="nav-item text-xs">
          <span>↩</span>
          <span>العودة للرئيسية</span>
        </NavLink>
      </div>
    </aside>
  )
}