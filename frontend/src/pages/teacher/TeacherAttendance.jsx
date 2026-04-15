import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const STATUS_OPTIONS = ['present', 'absent', 'late'];

export default function TeacherAttendance() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('mark'); // 'mark' | 'view'
  const [saving, setSaving] = useState(false);

  // Mark attendance state
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});

  // View filters
  const [viewFilters, setViewFilters] = useState({
    studentId: searchParams.get('studentId') || '',
    subject: '',
    startDate: '',
    endDate: '',
  });

  const subjects = user?.subjects || [];

  const fetchStudents = useCallback(() => {
    api.get('/teacher/students').then((r) => setStudents(r.data.data));
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(viewFilters).filter(([, v]) => v));
      const r = await api.get('/teacher/attendance', { params });
      setRecords(r.data.data);
    } catch {
      toast.error('Failed to load records');
    } finally {
      setLoading(false);
    }
  }, [viewFilters]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    if (tab === 'view') fetchRecords();
  }, [tab, fetchRecords]);

  // Initialize attendance map when students or subject/date changes
  useEffect(() => {
    if (students.length > 0) {
      const map = {};
      students.forEach((s) => { map[s._id] = 'present'; });
      setAttendanceMap(map);
    }
  }, [students, selectedSubject, selectedDate]);

  const handleMarkAll = (status) => {
    const map = {};
    students.forEach((s) => { map[s._id] = status; });
    setAttendanceMap(map);
  };

  const handleSaveAttendance = async () => {
    if (!selectedSubject) { toast.error('Please select a subject'); return; }
    if (students.length === 0) { toast.error('No students to mark attendance for'); return; }

    setSaving(true);
    try {
      const recordsPayload = students.map((s) => ({
        studentId: s._id,
        subject: selectedSubject,
        date: selectedDate,
        status: attendanceMap[s._id] || 'present',
      }));

      await api.post('/teacher/attendance', { records: recordsPayload });
      toast.success(`Attendance saved for ${students.length} students`);
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
      setRecords((prev) => prev.filter((r) => r._id !== id));
      toast.success('Record deleted');
    } catch {
      toast.error('Failed to delete');
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
        <p className="text-gray-500 text-sm mt-1">Mark and manage student attendance</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {['mark', 'view'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-200
              ${tab === t ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'mark' ? '✏️ Mark Attendance' : '📋 View Records'}
          </button>
        ))}
      </div>

      {tab === 'mark' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-lg font-semibold text-navy-900 mb-4">Session Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <select className="input-field" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                  <option value="">Select subject</option>
                  {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                  {subjects.length === 0 && <option disabled>No subjects assigned</option>}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" className="input-field" value={selectedDate} max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)} />
              </div>
            </div>
          </div>

          {students.length > 0 ? (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-navy-900">Students ({students.length})</h2>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button key={s} onClick={() => handleMarkAll(s)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-navy-400
                                 font-medium capitalize transition-colors text-gray-600 hover:text-navy-700">
                      All {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {students.map((s, i) => (
                  <div key={s._id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="text-xs text-gray-400 w-6 text-center font-mono">{i + 1}</span>
                    <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center
                                    text-emerald-700 font-bold text-sm flex-shrink-0">
                      {s.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.rollNumber || 'No roll no.'}</p>
                    </div>
                    <div className="flex gap-1">
                      {STATUS_OPTIONS.map((status) => (
                        <button key={status} onClick={() => setAttendanceMap({ ...attendanceMap, [s._id]: status })}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-all
                            ${attendanceMap[s._id] === status
                              ? statusBtnColor[status]
                              : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex gap-3">
                <button onClick={handleSaveAttendance} disabled={saving} className="btn-primary">
                  {saving ? 'Saving…' : `💾 Save Attendance (${students.length} students)`}
                </button>
              </div>
            </div>
          ) : (
            <div className="card text-center py-12 text-gray-400">
              <span className="text-3xl">🎓</span>
              <p className="text-sm mt-2">No students assigned to you yet</p>
            </div>
          )}
        </div>
      )}

      {tab === 'view' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="card">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <select className="input-field" value={viewFilters.studentId} onChange={(e) => setViewFilters({ ...viewFilters, studentId: e.target.value })}>
                <option value="">All Students</option>
                {students.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              <select className="input-field" value={viewFilters.subject} onChange={(e) => setViewFilters({ ...viewFilters, subject: e.target.value })}>
                <option value="">All Subjects</option>
                {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="date" className="input-field" value={viewFilters.startDate} onChange={(e) => setViewFilters({ ...viewFilters, startDate: e.target.value })} />
              <input type="date" className="input-field" value={viewFilters.endDate} onChange={(e) => setViewFilters({ ...viewFilters, endDate: e.target.value })} />
            </div>
            <button onClick={fetchRecords} className="btn-primary mt-3">Apply Filters</button>
          </div>

          <div className="card !p-0 overflow-hidden">
            {loading ? <LoadingRows /> : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <span className="text-4xl mb-3">📋</span>
                <p className="text-sm">No records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-navy-50 border-b border-navy-100">
                    <tr>{['Student', 'Roll No.', 'Subject', 'Date', 'Status', 'Marked By', 'Delete'].map((h) => <th key={h} className="table-th">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {records.map((r) => (
                      <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-td font-semibold">{r.student?.name}</td>
                        <td className="table-td font-mono text-xs">{r.student?.rollNumber || '—'}</td>
                        <td className="table-td">{r.subject}</td>
                        <td className="table-td text-sm">{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="table-td"><span className={statusColor[r.status]}>{r.status}</span></td>
                        <td className="table-td"><span className={`text-xs px-2 py-0.5 rounded-full ${r.markedBy === 'student' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>{r.markedBy}</span></td>
                        <td className="table-td">
                          <button onClick={() => handleDeleteRecord(r._id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
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
  return <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>;
}
