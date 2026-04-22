import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Signup from './pages/Signup';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageTeachers from './pages/admin/ManageTeachers';
import ManageStudents from './pages/admin/ManageStudents';
import AdminAttendance from './pages/admin/AdminAttendance';
import AdminResults from './pages/admin/AdminResults';
import AdminSemesterCourses from './pages/admin/AdminSemesterCourses';
import TeacherLayout from './pages/teacher/TeacherLayout';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherCourses from './pages/teacher/TeacherCourses';
import TeacherStudents from './pages/teacher/TeacherStudents';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherResults from './pages/teacher/TeacherResults';
import StudentLayout from './pages/student/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentCourses from './pages/student/StudentCourses';
import StudentResults from './pages/student/StudentResults';

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return children;
}

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-white font-body text-sm">Loading EduTrack…</p>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={`/${user.role}`} replace /> : <Login />}
      />
      <Route
        path="/forgot-password"
        element={user ? <Navigate to={`/${user.role}`} replace /> : <ForgotPassword />}
      />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={<RequireAuth role="admin"><AdminLayout /></RequireAuth>}
      >
        <Route index element={<AdminDashboard />} />
        <Route path="teachers" element={<ManageTeachers />} />
        <Route path="students" element={<ManageStudents />} />
        <Route path="semester-courses" element={<AdminSemesterCourses />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="results" element={<AdminResults />} />
      </Route>

      {/* Teacher routes */}
      <Route
        path="/teacher"
        element={<RequireAuth role="teacher"><TeacherLayout /></RequireAuth>}
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="courses" element={<TeacherCourses />} />
        <Route path="students" element={<TeacherStudents />} />
        <Route path="attendance" element={<TeacherAttendance />} />
        <Route path="results" element={<TeacherResults />} />
      </Route>

      {/* Student routes */}
      <Route
        path="/student"
        element={<RequireAuth role="student"><StudentLayout /></RequireAuth>}
      >
        <Route index element={<StudentDashboard />} />
        <Route path="courses" element={<StudentCourses />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="results" element={<StudentResults />} />
      </Route>

      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/signup" element={user ? <Navigate to={`/${user.role}`} replace /> : <Signup />} />

      <Route
        path="/"
        element={
          user ? <Navigate to={`/${user.role}`} replace /> : <Home />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
