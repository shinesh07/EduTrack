import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const statusColor = {
  present: 'badge-present',
  absent: 'badge-absent',
  late: 'badge-late',
};

const findTodayRecord = (records, course) =>
  records.find((record) => {
    const recordCourseId = String(record.semesterCourse || '');
    return recordCourseId
      ? recordCourseId === String(course._id)
      : record.subject === course.title;
  });

export default function StudentAttendance() {
  const [overview, setOverview] = useState(null);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [todayRecords, setTodayRecords] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(null);
  const [filterSubject, setFilterSubject] = useState('');
  const [tab, setTab] = useState('today');

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const response = await api.get('/student/semester-overview');
      setOverview(response.data.data);
    } catch {
      toast.error('Failed to load your semester courses');
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterSubject ? { subject: filterSubject } : {};
      const [attendanceRes, todayRes] = await Promise.all([
        api.get('/student/attendance', { params }),
        api.get('/student/attendance/today'),
      ]);
      setRecords(attendanceRes.data.data);
      setSummary(attendanceRes.data.summary || {});
      setTodayRecords(todayRes.data.data);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [filterSubject]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleMark = async (course) => {
    setMarking(course._id);
    try {
      const response = await api.post('/student/attendance', {
        semesterCourseId: course._id,
        status: 'present',
      });
      setTodayRecords((prev) => [...prev, response.data.data]);
      setSummary((prev) => {
        const current = prev[course.title] || { total: 0, present: 0, absent: 0, late: 0 };
        return {
          ...prev,
          [course.title]: {
            ...current,
            total: current.total + 1,
            present: current.present + 1,
          },
        };
      });
      toast.success(`Attendance marked for ${course.title}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setMarking(null);
    }
  };

  const courses = overview?.courses || [];
  const markableCourses = useMemo(
    () => courses.filter((course) => course.teacher),
    [courses]
  );
  const availableSubjects = [...new Set([
    ...Object.keys(summary),
    ...courses.map((course) => course.title),
  ])];
  const markedToday = markableCourses.filter((course) => findTodayRecord(todayRecords, course)).length;
  const allDoneToday = markableCourses.length > 0 && markedToday >= markableCourses.length;
  const todayDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-navy-900">My Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">{todayDate}</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'today', label: "📋 Today's Classes" },
          { key: 'history', label: '📅 History' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === item.key ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'today' && (
        <div className="space-y-5">
          {overviewLoading ? (
            <div className="card text-center py-12 text-gray-400">
              <div className="w-8 h-8 mx-auto border-4 border-navy-200 border-t-navy-900 rounded-full animate-spin" />
              <p className="text-sm mt-3">Loading your courses…</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <span className="text-4xl mb-3 block">📚</span>
              <p className="text-sm">No courses configured for your semester yet.</p>
            </div>
          ) : (
            <>
              <div className="card !py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-navy-900">Today&apos;s Progress</p>
                  <p className="text-sm font-bold text-navy-700">
                    {markedToday} / {markableCourses.length} markable courses
                  </p>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      allDoneToday ? 'bg-emerald-500' : 'bg-navy-600'
                    }`}
                    style={{
                      width: `${markableCourses.length > 0 ? (markedToday / markableCourses.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Courses without a teacher assignment cannot be marked yet.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => {
                  const todayRecord = findTodayRecord(todayRecords, course);
                  const isMarked = Boolean(todayRecord);
                  const subjectSummary = summary[course.title];
                  const rate = subjectSummary?.total > 0
                    ? Math.round((subjectSummary.present / subjectSummary.total) * 100)
                    : null;

                  return (
                    <div
                      key={course._id}
                      className={`card transition-all duration-200 border-2 ${
                        isMarked
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-gray-100 hover:border-navy-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            {course.code || 'No code'}
                          </p>
                          <p className="font-semibold text-gray-800 text-sm leading-tight mt-1">
                            {course.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {course.teacher?.name || 'Teacher not assigned'}
                          </p>
                        </div>
                        <span className={isMarked ? 'badge-present' : course.teacher ? 'badge-late' : 'badge-absent'}>
                          {isMarked ? 'Present' : course.teacher ? 'Pending' : 'No Teacher'}
                        </span>
                      </div>

                      {rate !== null && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Overall attendance</span>
                            <span className={`font-semibold ${rate >= 75 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {rate}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${rate >= 75 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {subjectSummary.present}/{subjectSummary.total} classes attended
                          </p>
                        </div>
                      )}

                      {!course.teacher ? (
                        <div className="w-full bg-gray-100 text-gray-500 text-sm font-semibold py-2.5 rounded-xl text-center mt-1">
                          Teacher assignment pending
                        </div>
                      ) : isMarked ? (
                        <div className="w-full bg-emerald-100 text-emerald-700 text-sm font-semibold py-2.5 rounded-xl text-center mt-1 border border-emerald-200">
                          ✅ Attendance Recorded
                        </div>
                      ) : (
                        <button
                          onClick={() => handleMark(course)}
                          disabled={Boolean(marking)}
                          className="w-full bg-navy-900 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-navy-800 transition-all duration-200 mt-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {marking === course._id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Marking…
                            </>
                          ) : (
                            '✓ Mark Present'
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          <div className="card !py-4 flex flex-col sm:flex-row gap-3">
            <select
              className="input-field sm:w-72"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="">All Courses</option>
              {availableSubjects.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            <button onClick={fetchAttendance} className="btn-secondary">Refresh</button>
          </div>

          {Object.keys(summary).length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-navy-900 mb-4">Overall Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(summary).map(([subject, subjectSummary]) => {
                  const rate = subjectSummary.total > 0
                    ? Math.round((subjectSummary.present / subjectSummary.total) * 100)
                    : 0;
                  return (
                    <div key={subject} className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-semibold text-gray-800 truncate">{subject}</p>
                          <span className={`text-sm font-bold ${rate >= 75 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600'} ml-2`}>
                            {rate}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${rate >= 75 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <div className="flex gap-3 text-xs text-gray-400 mt-1.5">
                          <span className="text-emerald-600">{subjectSummary.present}P</span>
                          <span className="text-red-500">{subjectSummary.absent}A</span>
                          {subjectSummary.late > 0 && <span className="text-amber-500">{subjectSummary.late}L</span>}
                          <span className="ml-auto">{subjectSummary.total} total</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="card !p-0 overflow-hidden">
            {loading ? (
              <LoadingRows />
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <span className="text-4xl mb-3">📋</span>
                <p className="text-sm">No attendance records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-navy-50 border-b border-navy-100">
                    <tr>
                      {['Course', 'Teacher', 'Date', 'Status', 'Marked By'].map((header) => (
                        <th key={header} className="table-th">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {records.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-td font-semibold">{record.subject}</td>
                        <td className="table-td">{record.teacher?.name || '—'}</td>
                        <td className="table-td text-sm">
                          {new Date(record.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="table-td">
                          <span className={statusColor[record.status]}>{record.status}</span>
                        </td>
                        <td className="table-td">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${record.markedBy === 'student' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                            {record.markedBy}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="p-8 space-y-3">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}
