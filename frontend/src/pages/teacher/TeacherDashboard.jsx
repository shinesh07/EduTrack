import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/teacher/stats')
      .then((r) => setStats(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-navy-900">
          Welcome, {user?.name?.split(' ')[0]} 👩‍🏫
        </h1>
        <p className="text-gray-500 mt-1">
          {user?.department} · {(user?.subjects || []).join(', ') || 'No subjects assigned'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'My Students', value: stats?.studentCount ?? 0, icon: '🎓', color: 'text-emerald-600', path: '/teacher/students' },
          { label: 'Attendance Records', value: stats?.attendanceCount ?? 0, icon: '📋', color: 'text-blue-600', path: '/teacher/attendance' },
          { label: 'Result Entries', value: stats?.resultCount ?? 0, icon: '📈', color: 'text-purple-600', path: '/teacher/results' },
        ].map((s) => (
          <div key={s.label} onClick={() => navigate(s.path)}
            className="stat-card cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{s.label}</p>
                <p className={`text-3xl font-display font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
              <span className="text-3xl">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-display font-semibold text-navy-900">My Students</h2>
          <button onClick={() => navigate('/teacher/students')} className="text-xs text-navy-600 hover:text-navy-900 font-medium">View all →</button>
        </div>
        {stats?.recentStudents?.length > 0 ? (
          <div className="space-y-3">
            {stats.recentStudents.map((s) => (
              <div key={s._id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.rollNumber} · {s.department} · Sem {s.semester}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <span className="text-3xl">🎓</span>
            <p className="text-sm mt-2">No students assigned yet</p>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-xl font-display font-semibold text-navy-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '📋', label: 'Mark Attendance', path: '/teacher/attendance' },
            { icon: '📝', label: 'Enter Results', path: '/teacher/results' },
            { icon: '👥', label: 'View Students', path: '/teacher/students' },
          ].map((a) => (
            <button key={a.label} onClick={() => navigate(a.path)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-navy-50
                         hover:border-gold-500 hover:bg-gold-50 transition-all duration-200">
              <span className="text-2xl">{a.icon}</span>
              <span className="text-xs font-semibold text-navy-700">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-navy-200 border-t-navy-900 rounded-full animate-spin" /></div>;
}
