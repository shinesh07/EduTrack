import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const emptyFilters = {
  studentId: '',
  teacherId: '',
  semester: '',
  academicYear: '',
};

const gradeColor = {
  'A+': 'bg-emerald-100 text-emerald-800', A: 'bg-green-100 text-green-800',
  'B+': 'bg-blue-100 text-blue-800', B: 'bg-blue-50 text-blue-700',
  'C+': 'bg-yellow-100 text-yellow-800', C: 'bg-yellow-50 text-yellow-700',
  D: 'bg-orange-100 text-orange-800', F: 'bg-red-100 text-red-800',
};

export default function AdminResults() {
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(emptyFilters);

  const fetchResults = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(nextFilters).filter(([, v]) => v)
      );
      const r = await api.get('/admin/results', { params });
      setResults(r.data.data);
    } catch {
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([api.get('/admin/students'), api.get('/admin/teachers')])
      .then(([s, t]) => { setStudents(s.data.data); setTeachers(t.data.data); });
    fetchResults();
  }, []);

  const passCount = results.filter((r) => r.status === 'pass').length;
  const failCount = results.filter((r) => r.status === 'fail').length;
  const avgGP = results.length > 0
    ? (results.reduce((a, r) => a + (r.gradePoint || 0), 0) / results.length).toFixed(2)
    : 'N/A';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-navy-900">Results Overview</h1>
        <p className="text-gray-500 text-sm mt-1">{results.length} result entries</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card bg-emerald-50 border-0">
          <p className="text-sm font-medium text-gray-600">Passed</p>
          <p className="text-3xl font-display font-bold text-emerald-600">{passCount}</p>
        </div>
        <div className="stat-card bg-red-50 border-0">
          <p className="text-sm font-medium text-gray-600">Failed</p>
          <p className="text-3xl font-display font-bold text-red-600">{failCount}</p>
        </div>
        <div className="stat-card bg-navy-50 border-0">
          <p className="text-sm font-medium text-gray-600">Avg. Grade Point</p>
          <p className="text-3xl font-display font-bold text-navy-700">{avgGP}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <h2 className="text-base font-semibold text-navy-900 mb-4">Filter Results</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select className="input-field" value={filters.studentId} onChange={(e) => setFilters({ ...filters, studentId: e.target.value })}>
            <option value="">All Students</option>
            {students.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select className="input-field" value={filters.teacherId} onChange={(e) => setFilters({ ...filters, teacherId: e.target.value })}>
            <option value="">All Teachers</option>
            {teachers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
          <select className="input-field" value={filters.semester} onChange={(e) => setFilters({ ...filters, semester: e.target.value })}>
            <option value="">All Semesters</option>
            {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Semester {s}</option>)}
          </select>
          <input className="input-field" placeholder="Academic Year (e.g. 2023-24)" value={filters.academicYear} onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })} />
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={fetchResults} className="btn-primary">Apply Filters</button>
          <button
            onClick={() => {
              setFilters(emptyFilters);
              fetchResults(emptyFilters);
            }}
            className="btn-secondary"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        {loading ? <LoadingRows /> : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <span className="text-4xl mb-3">📈</span>
            <p className="text-sm">No results found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-navy-50 border-b border-navy-100">
                <tr>
                  {['Student', 'Roll No.', 'Subject', 'Sem', 'Year', 'Theory', 'Practical', 'Internal', 'Grade', 'GP', 'Status'].map((h) => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td font-semibold text-sm">{r.student?.name}</td>
                    <td className="table-td font-mono text-xs">{r.student?.rollNumber || '—'}</td>
                    <td className="table-td text-sm">{r.subject}</td>
                    <td className="table-td text-center">{r.semester}</td>
                    <td className="table-td text-sm">{r.academicYear}</td>
                    <td className="table-td text-center">{r.marks?.theory}/{r.totalMarks?.theory}</td>
                    <td className="table-td text-center">{r.marks?.practical}/{r.totalMarks?.practical}</td>
                    <td className="table-td text-center">{r.marks?.internal}/{r.totalMarks?.internal}</td>
                    <td className="table-td">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${gradeColor[r.grade] || ''}`}>
                        {r.grade || '—'}
                      </span>
                    </td>
                    <td className="table-td font-semibold text-center">{r.gradePoint ?? '—'}</td>
                    <td className="table-td">
                      <span className={r.status === 'pass' ? 'badge-pass' : r.status === 'fail' ? 'badge-fail' : 'badge-late'}>
                        {r.status}
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
