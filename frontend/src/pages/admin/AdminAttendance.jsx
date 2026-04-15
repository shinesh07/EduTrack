import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function AdminAttendance() {
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ studentId: '', teacherId: '', subject: '', startDate: '', endDate: '' });

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const r = await api.get('/admin/attendance', { params });
      setRecords(r.data.data);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([api.get('/admin/students'), api.get('/admin/teachers')])
      .then(([s, t]) => { setStudents(s.data.data); setTeachers(t.data.data); });
    fetchRecords();
  }, []);

  const statusColor = { present: 'badge-present', absent: 'badge-absent', late: 'badge-late' };

  const summary = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-navy-900">Attendance Records</h1>
        <p className="text-gray-500 text-sm mt-1">{records.length} records total</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Present', count: summary.present || 0, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '✅' },
          { label: 'Absent', count: summary.absent || 0, color: 'text-red-600', bg: 'bg-red-50', icon: '❌' },
          { label: 'Late', count: summary.late || 0, color: 'text-amber-600', bg: 'bg-amber-50', icon: '⏰' },
        ].map((s) => (
          <div key={s.label} className={`stat-card ${s.bg} border-0`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{s.label}</p>
                <p className={`text-3xl font-display font-bold ${s.color}`}>{s.count}</p>
              </div>
              <span className="text-2xl">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card">
        <h2 className="text-base font-semibold text-navy-900 mb-4">Filter Records</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <select className="input-field" value={filters.studentId} onChange={(e) => setFilters({ ...filters, studentId: e.target.value })}>
            <option value="">All Students</option>
            {students.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select className="input-field" value={filters.teacherId} onChange={(e) => setFilters({ ...filters, teacherId: e.target.value })}>
            <option value="">All Teachers</option>
            {teachers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
          <input className="input-field" placeholder="Subject" value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value })} />
          <input type="date" className="input-field" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
          <input type="date" className="input-field" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={fetchRecords} className="btn-primary">Apply Filters</button>
          <button onClick={() => { setFilters({ studentId: '', teacherId: '', subject: '', startDate: '', endDate: '' }); fetchRecords(); }} className="btn-secondary">Clear</button>
        </div>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        {loading ? <LoadingRows /> : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <span className="text-4xl mb-3">📋</span>
            <p className="text-sm">No attendance records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-navy-50 border-b border-navy-100">
                <tr>
                  {['Student', 'Roll No.', 'Subject', 'Date', 'Status', 'Teacher', 'Marked By'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-semibold">{r.student?.name}</td>
                    <td className="table-td font-mono text-xs">{r.student?.rollNumber || '—'}</td>
                    <td className="table-td">{r.subject}</td>
                    <td className="table-td text-sm">{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="table-td"><span className={statusColor[r.status]}>{r.status}</span></td>
                    <td className="table-td text-sm">{r.teacher?.name}</td>
                    <td className="table-td">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.markedBy === 'student' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                        {r.markedBy}
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
  );
}

function LoadingRows() {
  return <div className="p-8 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>;
}
