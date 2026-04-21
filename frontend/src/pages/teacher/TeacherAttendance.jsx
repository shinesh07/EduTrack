import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const STATUS_OPTIONS = ['present', 'absent', 'late'];

export default function TeacherAttendance() {
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('mark');
  const [saving, setSaving] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [viewFilters, setViewFilters] = useState({
    studentId: searchParams.get('studentId') || '',
    courseId: '',
    startDate: '',
    endDate: '',
  });

  const fetchMeta = useCallback(async () => {
    try {
      const [coursesRes, studentsRes] = await Promise.all([
        api.get('/teacher/courses'),
        api.get('/teacher/students'),
      ]);
      setCourses(coursesRes.data.data);
      setStudents(studentsRes.data.data);
      if (coursesRes.data.data.length > 0) {
        setSelectedCourseId((prev) => prev || coursesRes.data.data[0]._id);
      }
    } catch {
      toast.error('Failed to load your teaching data');
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(viewFilters).filter(([, value]) => value));
      const response = await api.get('/teacher/attendance', { params });
      setRecords(response.data.data);
    } catch {
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  }, [viewFilters]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    if (tab === 'view') {
      fetchRecords();
    } else {
      setLoading(false);
    }
  }, [tab, fetchRecords]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course._id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  const eligibleStudents = useMemo(() => {
    if (!selectedCourse) return [];
    return students.filter(
      (student) =>
        student.department === selectedCourse.department &&
        Number(student.semester) === Number(selectedCourse.semester)
    );
  }, [selectedCourse, students]);

  useEffect(() => {
    if (eligibleStudents.length === 0) {
      setAttendanceMap({});
      return;
    }

    const nextMap = {};
    eligibleStudents.forEach((student) => {
      nextMap[student._id] = attendanceMap[student._id] || 'present';
    });
    setAttendanceMap(nextMap);
  }, [eligibleStudents]);

  const handleMarkAll = (status) => {
    const nextMap = {};
    eligibleStudents.forEach((student) => {
      nextMap[student._id] = status;
    });
    setAttendanceMap(nextMap);
  };

  const handleSaveAttendance = async () => {
    if (!selectedCourse) {
      toast.error('Please select a course');
      return;
    }
    if (eligibleStudents.length === 0) {
      toast.error('No students available for this course');
      return;
    }

    setSaving(true);
    try {
      const recordsPayload = eligibleStudents.map((student) => ({
        studentId: student._id,
        status: attendanceMap[student._id] || 'present',
      }));

      await api.post('/teacher/attendance', {
        courseId: selectedCourse._id,
        date: selectedDate,
        records: recordsPayload,
      });

      toast.success(`Attendance saved for ${eligibleStudents.length} students`);
      setViewFilters((prev) => ({ ...prev, courseId: selectedCourse._id }));
      setTab('view');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    try {
      await api.delete(`/teacher/attendance/${id}`);
      setRecords((prev) => prev.filter((record) => record._id !== id));
      toast.success('Record deleted');
    } catch {
      toast.error('Failed to delete record');
    }
  };

  const statusColor = { present: 'badge-present', absent: 'badge-absent', late: 'badge-late' };
  const statusBtnColor = {
    present: 'bg-emerald-500 text-white',
    absent: 'bg-red-500 text-white',
    late: 'bg-amber-500 text-white',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-navy-900">Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">Mark and manage attendance for your assigned semester courses</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {['mark', 'view'].map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200 ${
              tab === item ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {item === 'mark' ? '✏️ Mark Attendance' : '📋 View Records'}
          </button>
        ))}
      </div>

      {courses.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <span className="text-3xl">📚</span>
          <p className="text-sm mt-2">No semester courses assigned to you yet</p>
        </div>
      ) : tab === 'mark' ? (
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-lg font-semibold text-navy-900 mb-4">Session Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
                <select
                  className="input-field"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                >
                  <option value="">Select course</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.code ? `${course.code} · ` : ''}{course.title} · {course.department} · Sem {course.semester}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={selectedDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>
            {selectedCourse && (
              <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                {selectedCourse.department} · Semester {selectedCourse.semester} · {eligibleStudents.length} eligible student(s)
              </div>
            )}
          </div>

          {selectedCourse && eligibleStudents.length > 0 ? (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-navy-900">Students ({eligibleStudents.length})</h2>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleMarkAll(status)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-navy-400 font-medium capitalize transition-colors text-gray-600 hover:text-navy-700"
                    >
                      All {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {eligibleStudents.map((student, index) => (
                  <div key={student._id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="text-xs text-gray-400 w-6 text-center font-mono">{index + 1}</span>
                    <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                      {student.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800">{student.name}</p>
                      <p className="text-xs text-gray-400">{student.rollNumber || 'No roll no.'}</p>
                    </div>
                    <div className="flex gap-1">
                      {STATUS_OPTIONS.map((status) => (
                        <button
                          key={status}
                          onClick={() => setAttendanceMap((prev) => ({ ...prev, [student._id]: status }))}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
                            attendanceMap[student._id] === status
                              ? statusBtnColor[status]
                              : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-400'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex gap-3">
                <button onClick={handleSaveAttendance} disabled={saving} className="btn-primary">
                  {saving ? 'Saving…' : `💾 Save Attendance (${eligibleStudents.length} students)`}
                </button>
              </div>
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-400">
              <span className="text-3xl">🎓</span>
              <p className="text-sm mt-2">
                {selectedCourse ? 'No students found for this department and semester' : 'Select a course to begin'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                className="input-field"
                value={viewFilters.studentId}
                onChange={(e) => setViewFilters({ ...viewFilters, studentId: e.target.value })}
              >
                <option value="">All Students</option>
                {students.map((student) => (
                  <option key={student._id} value={student._id}>{student.name}</option>
                ))}
              </select>
              <select
                className="input-field"
                value={viewFilters.courseId}
                onChange={(e) => setViewFilters({ ...viewFilters, courseId: e.target.value })}
              >
                <option value="">All Courses</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.code ? `${course.code} · ` : ''}{course.title}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="input-field"
                value={viewFilters.startDate}
                onChange={(e) => setViewFilters({ ...viewFilters, startDate: e.target.value })}
              />
              <input
                type="date"
                className="input-field"
                value={viewFilters.endDate}
                onChange={(e) => setViewFilters({ ...viewFilters, endDate: e.target.value })}
              />
            </div>
            <button onClick={fetchRecords} className="btn-primary mt-3">Apply Filters</button>
          </div>

          <div className="card !p-0 overflow-hidden">
            {loading ? (
              <LoadingRows />
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <span className="text-4xl mb-3">📋</span>
                <p className="text-sm">No records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-navy-50 border-b border-navy-100">
                    <tr>
                      {['Student', 'Roll No.', 'Course', 'Date', 'Status', 'Marked By', 'Delete'].map((header) => (
                        <th key={header} className="table-th">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {records.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-td font-semibold">{record.student?.name}</td>
                        <td className="table-td font-mono text-xs">{record.student?.rollNumber || '—'}</td>
                        <td className="table-td">{record.subject}</td>
                        <td className="table-td text-sm">
                          {new Date(record.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="table-td"><span className={statusColor[record.status]}>{record.status}</span></td>
                        <td className="table-td">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${record.markedBy === 'student' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                            {record.markedBy}
                          </span>
                        </td>
                        <td className="table-td">
                          <button onClick={() => handleDeleteRecord(record._id)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                            Delete
                          </button>
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
