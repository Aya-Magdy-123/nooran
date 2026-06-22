// src/App.jsx

import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'

// import Home               from './pages/Home'
import AdminLayout        from './pages/admin/AdminLayout'
import AdminOverview      from './pages/admin/AdminOverview'
import AdminUsers         from './pages/admin/AdminUsers'
import AdminSessions      from './pages/admin/AdminSessions'
import SupervisorLayout   from './pages/supervisor/SupervisorLayout'
// import SupervisorStudents from './pages/supervisor/SupervisorStudents'
import SupervisorPostpone from './pages/supervisor/SupervisorPostpone'
import SupervisorHalaqas from './pages/supervisor/SupervisorHalaqas'
import Login from './pages/login/Login'
// import Supervisorsessions from './pages/supervisor/Supervisorsessions'
import Settings from './pages/Settings'

import ProtectedRoute from './components/ProtectedRoute'


export default function App() {
  return (
<AppProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute><AdminLayout /></ProtectedRoute>
        }>
          <Route index         element={<AdminOverview />} />
          <Route path="users"    element={<AdminUsers />} />
          <Route path="sessions" element={<AdminSessions />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Supervisor */}
        <Route path="/supervisor" element={
          <ProtectedRoute><SupervisorLayout /></ProtectedRoute>
        }>
          <Route index           element={<SupervisorHalaqas />} />
          <Route path="students" element={<AdminUsers />} />
          <Route path="postpone" element={<SupervisorPostpone />} />
          <Route path="sessions" element={<AdminSessions />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </AppProvider>
  )
}
