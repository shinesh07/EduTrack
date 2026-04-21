import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [semesterInfo, setSemesterInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/student/stats'),
      api.get('/student/semester-overview'),
    ])
      .then(([statsRes, overviewRes]) => {
        setStats(statsRes.data.data);
        setSemesterInfo(overviewRes.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const attendanceRate = stats?.attendanceRate ?? 0;
  const courses = stats?.courses || [];
  const rateColor =
    attendanceRate >= 75 ? 'text-emerald-600' :
    attendanceRate >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-navy-900 rounded-2xl p-6 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #f0a500 0%, transparent 60%)' }}
        />
        <div className="relative z-10">
          <p className="text-navy-300 text-sm">Welcome back,</p>
          <h1 className="text-3xl font-display font-bold mt-1">{user?.name} 🎓</h1>
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            {user?.rollNumber && (
              <span className="flex items-center gap-1.5 text-navy-200">
                <span className="text-gold-500">🎟</span> {user.rollNumber}
              </span>
            )}
            {user?.department && (
              <span className="flex items-center gap-1.5 text-navy-200">
                <span className="text-gold-500">🏛</span> {user.department}
              </span>
            )}
            {user?.semester && (
              <span className="flex items-center gap-1.5 text-navy-200">
                <span className="text-gold-500">📚</span> Semester {user.semester}
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        className={`card border-2 ${
          semesterInfo?.semesterEditEnabled
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-amber-200 bg-amber-50'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-navy-900">Semester change window</p>
            <p className="text-sm text-gray-600 mt-1">
              {semesterInfo?.canChangeSemester
                ? `You can move to Semester ${semesterInfo?.nextSemester} right now.`
                : semesterInfo?.semesterEditEnabled
                  ? 'You are already in your final semester.'
                  : 'Semester changes are currently locked by the admin.'}
            </p>
          </div>
          <button onClick={() => navigate('/student/courses')} className="btn-secondary">
            Open My Courses
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Attendance Rate</p>
              <p className={`text-3xl font-display font-bold mt-1 ${rateColor}`}>
                {attendanceRate}%
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {stats?.attendanceCount ?? 0} total sessions
              </p>
            </div>
            <span className="text-3xl">📋</span>
          </div>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                attendanceRate >= 75 ? 'bg-emerald-500' :
                attendanceRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Result Entries</p>
              <p className="text-3xl font-display font-bold mt-1 text-navy-800">
                {stats?.resultCount ?? 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">Subjects graded</p>
            </div>
            <span className="text-3xl">📈</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Current Teachers</p>
              <p className="text-3xl font-display font-bold mt-1 text-navy-800">
                {stats?.teacherCount ?? 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                From your semester courses
              </p>
            </div>
            <span className="text-3xl">👩‍🏫</span>
          </div>
        </div>

        <div className="stat-card col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Current Courses</p>
              <p className="text-3xl font-display font-bold mt-1 text-emerald-600">
                {stats?.courseCount ?? 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">Auto-assigned by semester</p>
            </div>
            <span className="text-3xl">📚</span>
          </div>
          {courses.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {courses.slice(0, 4).map((course) => (
                <span key={course._id} className="text-xs bg-navy-50 text-navy-700 px-2 py-0.5 rounded-full">
                  {course.code || course.title}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-display font-semibold text-navy-900">Recent Results</h2>
          <button onClick={() => navigate('/student/results')} className="text-xs text-navy-600 hover:text-navy-900 font-medium">
            View all →
          </button>
        </div>
        {stats?.recentResults?.length > 0 ? (
          <div className="space-y-3">
            {stats.recentResults.map((result) => {
              const total = result.marks?.theory + result.marks?.practical + result.marks?.internal;
              const max = result.totalMarks?.theory + result.totalMarks?.practical + result.totalMarks?.internal;
              const pct = max > 0 ? Math.round((total / max) * 100) : 0;
              return (
                <div key={result._id} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${result.grade === 'F' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {result.grade || '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{result.subject}</p>
                    <p className="text-xs text-gray-400">Sem {result.semester} · {result.academicYear}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-sm text-navy-700">{total}/{max}</p>
                    <p className="text-xs text-gray-400">{pct}%</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${result.status === 'pass' ? 'badge-pass' : result.status === 'fail' ? 'badge-fail' : 'badge-late'}`}>
                    {result.status}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400">
            <span className="text-3xl">📊</span>
            <p className="text-sm mt-2">No results available yet</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '📚', label: 'My Courses', desc: 'See current semester courses', path: '/student/courses', color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100' },
          { icon: '🔁', label: 'Semester Status', desc: semesterInfo?.semesterEditEnabled ? 'Promotion window is open' : 'Promotion window is locked', path: '/student/courses', color: 'bg-gold-50 hover:bg-gold-100 border-amber-100' },
          { icon: '📋', label: 'Mark Attendance', desc: 'Check in for today', path: '/student/attendance', color: 'bg-blue-50 hover:bg-blue-100 border-blue-100' },
          { icon: '📈', label: 'View Results', desc: 'See all grades', path: '/student/results', color: 'bg-slate-100 hover:bg-slate-200 border-slate-200' },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${action.color}`}
          >
            <span className="text-2xl">{action.icon}</span>
            <div className="text-center">
              <p className="text-xs font-semibold text-navy-700">{action.label}</p>
              <p className="text-xs text-gray-500 hidden sm:block">{action.desc}</p>
            </div>
          </button>
        ))}
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
