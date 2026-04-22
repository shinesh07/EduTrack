import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function TeacherCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/teacher/courses')
      .then((response) => setCourses(response.data.data))
      .catch(() => toast.error('Failed to load assigned courses'))
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-navy-900">My Courses</h1>
          <p className="text-gray-500 text-sm mt-1">
            These semester courses were assigned to you by the admin.
          </p>
        </div>
        <div className="stat-card !p-4 min-w-[140px]">
          <p className="text-sm text-gray-500 font-medium">Assigned Courses</p>
          <p className="text-2xl font-display font-bold text-emerald-600 mt-1">{courses.length}</p>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <span className="text-4xl mb-3 block">📚</span>
          <p className="text-sm">No semester courses assigned yet</p>
          <p className="text-xs mt-1">Ask the admin to link you to semester courses.</p>
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
                <span className="badge-present">{course.studentCount ?? 0} students</span>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
                <p className="text-sm text-gray-600">
                  Use this course when managing individual attendance or entering results for students in {course.department}, Semester {course.semester}.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
