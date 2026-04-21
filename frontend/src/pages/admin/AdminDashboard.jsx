import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

function StatCard({ icon, label, value, sub, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`stat-card ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className={`text-3xl font-display font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then((response) => setStats(response.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-navy-200 border-t-navy-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-navy-900">
          Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s an overview of your institution today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="👩‍🏫"
          label="Total Teachers"
          value={stats?.teachers ?? 0}
          color="text-blue-600"
          onClick={() => navigate('/admin/teachers')}
        />
        <StatCard
          icon="🎓"
          label="Total Students"
          value={stats?.students ?? 0}
          color="text-emerald-600"
          onClick={() => navigate('/admin/students')}
        />
        <StatCard
          icon="📋"
          label="Attendance Records"
          value={stats?.attendanceRecords ?? 0}
          color="text-purple-600"
          onClick={() => navigate('/admin/attendance')}
        />
        <StatCard
          icon="📈"
          label="Result Entries"
          value={stats?.results ?? 0}
          color="text-gold-600"
          onClick={() => navigate('/admin/results')}
        />
      </div>

      <div
        className={`card border-2 ${
          stats?.semesterEditEnabled
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-amber-200 bg-amber-50'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-navy-900">Semester Change Window</p>
            <p className="text-sm text-gray-600 mt-1">
              {stats?.semesterEditEnabled
                ? 'Students can currently move to their next semester.'
                : 'Students are currently locked from changing semester.'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-500">Configured semester courses</p>
              <p className="text-2xl font-display font-bold text-navy-800">
                {stats?.semesterCourses ?? 0}
              </p>
            </div>
            <button onClick={() => navigate('/admin/semester-courses')} className="btn-secondary">
              Open Setup
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-display font-semibold text-navy-900">Recent Students</h2>
            <button
              onClick={() => navigate('/admin/students')}
              className="text-xs text-navy-600 hover:text-navy-900 font-medium"
            >
              View all →
            </button>
          </div>
          {stats?.recentStudents?.length > 0 ? (
            <div className="space-y-3">
              {stats.recentStudents.map((student) => (
                <div key={student._id} className="flex items-center gap-3 py-2">
                  <div className="w-9 h-9 bg-navy-100 rounded-full flex items-center justify-center text-navy-700 font-bold text-sm flex-shrink-0">
                    {student.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{student.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {student.rollNumber || student.email} · {student.department || 'No dept'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(student.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="🎓" msg="No students yet" />
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-display font-semibold text-navy-900">Recent Results</h2>
            <button
              onClick={() => navigate('/admin/results')}
              className="text-xs text-navy-600 hover:text-navy-900 font-medium"
            >
              View all →
            </button>
          </div>
          {stats?.recentResults?.length > 0 ? (
            <div className="space-y-3">
              {stats.recentResults.map((result) => (
                <div key={result._id} className="flex items-center gap-3 py-2">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      result.grade === 'F' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {result.grade}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {result.student?.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {result.subject} · Sem {result.semester}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      result.status === 'pass'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {result.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="📈" msg="No results yet" />
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-display font-semibold text-navy-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { icon: '➕', label: 'Add Teacher', path: '/admin/teachers' },
            { icon: '🎓', label: 'Add Student', path: '/admin/students' },
            { icon: '🗂️', label: 'Semester Setup', path: '/admin/semester-courses' },
            { icon: '📋', label: 'View Attendance', path: '/admin/attendance' },
            { icon: '📈', label: 'View Results', path: '/admin/results' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-navy-50 hover:border-gold-500 hover:bg-gold-50 transition-all duration-200"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-xs font-semibold text-navy-700">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, msg }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
      <span className="text-3xl mb-2">{icon}</span>
      <p className="text-sm">{msg}</p>
    </div>
  );
}

function getGreeting() {
  const hours = new Date().getHours();
  if (hours < 12) return 'morning';
  if (hours < 17) return 'afternoon';
  return 'evening';
}
