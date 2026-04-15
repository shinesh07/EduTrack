import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const navConfig = {
  admin: [
    { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
    { to: '/admin/teachers', label: 'Teachers', icon: '👩‍🏫' },
    { to: '/admin/students', label: 'Students', icon: '🎓' },
    { to: '/admin/attendance', label: 'Attendance', icon: '📋' },
    { to: '/admin/results', label: 'Results', icon: '📈' },
  ],
  teacher: [
    { to: '/teacher', label: 'Dashboard', icon: '📊', end: true },
    { to: '/teacher/students', label: 'My Students', icon: '🎓' },
    { to: '/teacher/attendance', label: 'Attendance', icon: '📋' },
    { to: '/teacher/results', label: 'Results', icon: '📈' },
  ],
  student: [
    { to: '/student', label: 'Dashboard', icon: '📊', end: true },
    { to: '/student/attendance', label: 'My Attendance', icon: '📋' },
    { to: '/student/results', label: 'My Results', icon: '📈' },
  ],
};

const roleBadge = {
  admin: { label: 'Administrator', color: 'bg-gold-500 text-navy-900' },
  teacher: { label: 'Teacher', color: 'bg-blue-500 text-white' },
  student: { label: 'Student', color: 'bg-emerald-500 text-white' },
};

export default function Sidebar({ mobile = false, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = navConfig[user?.role] || [];
  const badge = roleBadge[user?.role];

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-navy-900">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gold-500 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
            🎓
          </div>
          <div>
            <span className="text-white font-display text-xl font-semibold">EduTrack</span>
            <p className="text-navy-300 text-xs">Management System</p>
          </div>
          {mobile && (
            <button
              onClick={onClose}
              className="ml-auto text-navy-300 hover:text-white text-xl"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* User info */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-gold-500 to-gold-600 rounded-full
                          flex items-center justify-center text-navy-900 font-bold text-sm flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-navy-300 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <div className="mt-3">
          <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${badge?.color}`}>
            {badge?.label}
          </span>
          {user?.department && (
            <p className="text-navy-400 text-xs mt-1">{user.department}</p>
          )}
          {user?.rollNumber && (
            <p className="text-navy-400 text-xs mt-0.5">#{user.rollNumber}</p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-navy-400 text-xs font-semibold uppercase tracking-wider px-2 mb-3">
          Navigation
        </p>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={mobile ? onClose : undefined}
            className={({ isActive }) =>
              isActive ? 'sidebar-link-active' : 'sidebar-link'
            }
          >
            <span className="text-base">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <span className="text-base">🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
