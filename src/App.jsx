// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'

// import Home               from './pages/Home'
import AdminLayout        from './pages/admin/AdminLayout'
import AdminOverview      from './pages/admin/AdminOverview'
import AdminUsers         from './pages/admin/AdminUsers'
// import AdminSessions      from './pages/admin/AdminSessions'
import SupervisorLayout   from './pages/supervisor/SupervisorLayout'
// import SupervisorStudents from './pages/supervisor/SupervisorStudents'
import SupervisorPostpone from './pages/supervisor/SupervisorPostpone'
import SupervisorHalaqas from './pages/supervisor/SupervisorHalaqas'
import Login from './pages/login/Login'

export default function App() {
  return (
    <AppProvider>
      <Routes>
        {/* <Route path="/" element={<Home />} /> */}
         <Route path="/login" element={<Login />} /> 


        {/* Admin */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index         element={<AdminOverview />} />
          <Route path="users"    element={<AdminUsers />} />
          {/* <Route path="sessions" element={<AdminSessions />} /> */}
        </Route>

        {/* Supervisor */}
         <Route path="/supervisor" element={<SupervisorLayout />}>
          <Route index             element={<SupervisorHalaqas />} />
          <Route path="students"   element={<AdminUsers />} />
          <Route path="postpone"   element={<SupervisorPostpone />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
     </AppProvider>
  )
}
