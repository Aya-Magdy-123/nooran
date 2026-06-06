// src/components/layout/DashboardLayout.jsx
import Sidebar from './Sidebar'

export default function DashboardLayout({ role, links, children }) {
  return (
    <div className="flex min-h-screen bg-brand-light" dir="rtl">
      <Sidebar role={role} links={links} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
