import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function StudentCourses() {
  const { refreshUser } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/student/semester-overview');
      setOverview(response.data.data);
    } catch {
      toast.error('Failed to load semester courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handlePromote = async () => {
    setPromoting(true);
    try {
      const response = await api.post('/student/semester/promote');
      await refreshUser();
      toast.success(response.data.message || 'Semester updated');
      await fetchOverview();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update semester');
    } finally {
      setPromoting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-navy-200 border-t-navy-900 rounded-full animate-spin" />
      </div>
    );
  }

  const courses = overview?.courses || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-navy-900">My Courses</h1>
          <p className="text-gray-500 text-sm mt-1">
            Fixed courses for {overview?.department || 'your department'} in Semester {overview?.semester || '—'}.
          </p>
        </div>
        <button
          onClick={handlePromote}
          disabled={!overview?.canChangeSemester || promoting}
          className={overview?.canChangeSemester ? 'btn-primary' : 'btn-secondary opacity-70 cursor-not-allowed'}
        >
          {promoting
            ? 'Updating…'
            : overview?.canChangeSemester
              ? `Move to Semester ${overview?.nextSemester}`
              : overview?.semesterEditEnabled
                ? 'Final Semester Reached'
                : 'Semester Change Locked'}
        </button>
      </div>

      <div
        className={`card border-2 ${
          overview?.semesterEditEnabled
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-amber-200 bg-amber-50'
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">{overview?.semesterEditEnabled ? '✅' : '🔒'}</span>
          <div>
            <p className="font-semibold text-navy-900">Semester promotion rule</p>
            <p className="text-sm text-gray-600 mt-1">
              {overview?.canChangeSemester
                ? `You can now move only to Semester ${overview?.nextSemester}. Courses for the next semester will be assigned automatically from your department.`
                : overview?.semesterEditEnabled
                  ? 'You are already in the final semester, so there is no higher semester to move into.'
                  : 'Admin has not opened the semester change window yet, so your semester cannot be changed right now.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-sm text-gray-500 font-medium">Department</p>
          <p className="text-xl font-display font-bold text-navy-800 mt-1">{overview?.department || '—'}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500 font-medium">Current Semester</p>
          <p className="text-3xl font-display font-bold text-blue-600 mt-1">{overview?.semester || '—'}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500 font-medium">Assigned Courses</p>
          <p className="text-3xl font-display font-bold text-emerald-600 mt-1">{courses.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500 font-medium">Assigned Teachers</p>
          <p className="text-3xl font-display font-bold text-gold-600 mt-1">{overview?.teacherCount ?? 0}</p>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <span className="text-4xl mb-3 block">📚</span>
          <p className="text-sm">No courses configured for this semester yet</p>
          <p className="text-xs mt-1">Ask the admin to complete the semester setup.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {courses.map((course) => (
            <div key={course._id} className="card">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    {course.code || 'No course code'}
                  </p>
                  <h2 className="text-xl font-display font-semibold text-navy-900 mt-1">
                    {course.title}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {course.department} · Semester {course.semester}
                  </p>
                </div>
                <span className={course.teacher ? 'badge-present' : 'badge-late'}>
                  {course.teacher ? 'Teacher Assigned' : 'Teacher Pending'}
                </span>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
                {course.teacher ? (
                  <>
                    <p className="text-sm font-semibold text-navy-900">{course.teacher.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {course.teacher.department || 'Department not set'}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">
                    Admin has not assigned a teacher to this course yet.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
