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
      .then((response) => setStats(response.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const assignedCourses = stats?.assignedCourses || [];
  const coursePreview = assignedCourses.slice(0, 3).map((course) => course.code || course.title).join(', ');

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-navy-900">
            Welcome, {user?.name?.split(' ')[0]} 👩‍🏫
          </h1>
          <p className="text-gray-500 mt-1">
            {user?.department || 'No department'} · {coursePreview || 'No semester courses assigned'}
          </p>
        </div>
        <button onClick={() => navigate('/teacher/courses')} className="btn-secondary">
          <span>📚</span> View Courses
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Assigned Courses', value: stats?.assignedCourseCount ?? 0, icon: '📚', color: 'text-gold-600', path: '/teacher/courses' },
          { label: 'My Students', value: stats?.studentCount ?? 0, icon: '🎓', color: 'text-emerald-600', path: '/teacher/students' },
          { label: 'Attendance Records', value: stats?.attendanceCount ?? 0, icon: '📋', color: 'text-blue-600', path: '/teacher/attendance' },
          { label: 'Result Entries', value: stats?.resultCount ?? 0, icon: '📈', color: 'text-slate-600', path: '/teacher/results' },
        ].map((stat) => (
          <div
            key={stat.label}
            onClick={() => navigate(stat.path)}
            className="stat-card cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                <p className={`text-3xl font-display font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </div>
              <span className="text-3xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-display font-semibold text-navy-900">Recently Eligible Students</h2>
          <button onClick={() => navigate('/teacher/students')} className="text-xs text-navy-600 hover:text-navy-900 font-medium">
            View all →
          </button>
        </div>
        {stats?.recentStudents?.length > 0 ? (
          <div className="space-y-3">
            {stats.recentStudents.map((student) => (
              <div key={student._id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                  {student.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{student.name}</p>
                  <p className="text-xs text-gray-400">{student.rollNumber} · {student.department} · Sem {student.semester}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <span className="text-3xl">🎓</span>
            <p className="text-sm mt-2">No students available from your assigned semester courses yet</p>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-xl font-display font-semibold text-navy-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '📚', label: 'View Courses', path: '/teacher/courses' },
            { icon: '📋', label: 'Manage Attendance', path: '/teacher/attendance' },
            { icon: '📝', label: 'Enter Results', path: '/teacher/results' },
            { icon: '👥', label: 'View Students', path: '/teacher/students' },
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

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-navy-200 border-t-navy-900 rounded-full animate-spin" />
    </div>
  );
}
