import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';

const gradeColor = {
  'A+': 'bg-emerald-100 text-emerald-800', A: 'bg-green-100 text-green-800',
  'B+': 'bg-blue-100 text-blue-800', B: 'bg-blue-50 text-blue-700',
  'C+': 'bg-yellow-100 text-yellow-800', C: 'bg-yellow-50 text-yellow-700',
  D: 'bg-orange-100 text-orange-800', F: 'bg-red-100 text-red-800',
};

const emptyForm = {
  studentId: '', subject: '', semester: '', academicYear: '',
  marks: { theory: 0, practical: 0, internal: 0 },
  totalMarks: { theory: 100, practical: 50, internal: 30 },
  remarks: '',
};

export default function TeacherResults() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'add', data: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    studentId: searchParams.get('studentId') || '',
    semester: '',
    academicYear: '',
  });

  const subjects = user?.subjects || [];

  useEffect(() => {
    api.get('/teacher/students').then((r) => setStudents(r.data.data));
  }, []);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const r = await api.get('/teacher/results', { params });
      setResults(r.data.data);
    } catch {
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const openAdd = () => {
    setForm(emptyForm);
    setModal({ open: true, mode: 'add', data: null });
  };

  const openEdit = (r) => {
    setForm({
      studentId: r.student?._id || '',
      subject: r.subject,
      semester: r.semester.toString(),
      academicYear: r.academicYear,
      marks: { ...r.marks },
      totalMarks: { ...r.totalMarks },
      remarks: r.remarks || '',
    });
    setModal({ open: true, mode: 'edit', data: r });
  };

  const handleSave = async () => {
    if (!form.studentId || !form.subject || !form.semester || !form.academicYear) {
      toast.error('Student, subject, semester, and academic year are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, semester: Number(form.semester) };
      if (modal.mode === 'add') {
        await api.post('/teacher/results', payload);
        toast.success('Result saved');
      } else {
        await api.put(`/teacher/results/${modal.data._id}`, payload);
        toast.success('Result updated');
      }
      setModal({ open: false });
      fetchResults();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this result?')) return;
    try {
      await api.delete(`/teacher/results/${id}`);
      setResults((prev) => prev.filter((r) => r._id !== id));
      toast.success('Result deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const updateMark = (type, field, value) => {
    setForm((prev) => ({ ...prev, [type]: { ...prev[type], [field]: Number(value) } }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-navy-900">Results Management</h1>
          <p className="text-gray-500 text-sm mt-1">Enter and manage student results</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><span>➕</span> Add Result</button>
      </div>

      {/* Filters */}
      <div className="card !py-4 flex flex-col sm:flex-row gap-3">
        <select className="input-field" value={filters.studentId} onChange={(e) => setFilters({ ...filters, studentId: e.target.value })}>
          <option value="">All Students</option>
          {students.map((s) => <option key={s._id} value={s._id}>{s.name} — {s.rollNumber}</option>)}
        </select>
        <select className="input-field sm:w-40" value={filters.semester} onChange={(e) => setFilters({ ...filters, semester: e.target.value })}>
          <option value="">All Sems</option>
          {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Sem {s}</option>)}
        </select>
        <input className="input-field sm:w-44" placeholder="Academic Year" value={filters.academicYear} onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })} />
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        {loading ? <LoadingRows /> : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <span className="text-4xl mb-3">📈</span>
            <p className="text-sm">No results found. Add one to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-navy-50 border-b border-navy-100">
                <tr>{['Student', 'Subject', 'Sem', 'Year', 'Theory', 'Practical', 'Internal', 'Grade', 'GP', 'Status', 'Actions'].map((h) => <th key={h} className="table-th">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((r) => {
                  const total = r.marks.theory + r.marks.practical + r.marks.internal;
                  const max = r.totalMarks.theory + r.totalMarks.practical + r.totalMarks.internal;
                  return (
                    <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-td">
                        <p className="font-semibold text-sm">{r.student?.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{r.student?.rollNumber}</p>
                      </td>
                      <td className="table-td text-sm">{r.subject}</td>
                      <td className="table-td text-center">{r.semester}</td>
                      <td className="table-td text-sm">{r.academicYear}</td>
                      <td className="table-td text-center text-sm">{r.marks?.theory}/{r.totalMarks?.theory}</td>
                      <td className="table-td text-center text-sm">{r.marks?.practical}/{r.totalMarks?.practical}</td>
                      <td className="table-td text-center text-sm">{r.marks?.internal}/{r.totalMarks?.internal}</td>
                      <td className="table-td">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${gradeColor[r.grade] || ''}`}>{r.grade || '—'}</span>
                      </td>
                      <td className="table-td text-center font-semibold">{r.gradePoint ?? '—'}</td>
                      <td className="table-td">
                        <span className={r.status === 'pass' ? 'badge-pass' : r.status === 'fail' ? 'badge-fail' : 'badge-late'}>{r.status}</span>
                      </td>
                      <td className="table-td">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(r)} className="text-xs bg-navy-50 text-navy-700 px-2 py-1 rounded hover:bg-navy-100 font-medium">Edit</button>
                          <button onClick={() => handleDelete(r._id)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 font-medium">Del</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modal.open} onClose={() => setModal({ open: false })} title={modal.mode === 'add' ? 'Add Result' : 'Edit Result'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
              <select className="input-field" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} disabled={modal.mode === 'edit'}>
                <option value="">Select student</option>
                {students.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.rollNumber})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <select className="input-field" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                <option value="">Select subject</option>
                {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
              <select className="input-field" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>
                <option value="">Select semester</option>
                {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
              <input className="input-field" placeholder="2023-24" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} />
            </div>
          </div>

          {/* Marks */}
          <div className="border border-gray-100 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-navy-900 mb-3">Marks Obtained / Total</h3>
            <div className="grid grid-cols-3 gap-3">
              {['theory', 'practical', 'internal'].map((field) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{field}</label>
                  <div className="flex gap-1.5">
                    <input type="number" min="0" max={form.totalMarks[field]}
                      className="input-field !py-2 text-center"
                      value={form.marks[field]}
                      onChange={(e) => updateMark('marks', field, e.target.value)}
                      placeholder="Obt."
                    />
                    <span className="text-gray-400 self-center">/</span>
                    <input type="number" min="0"
                      className="input-field !py-2 text-center bg-gray-50"
                      value={form.totalMarks[field]}
                      onChange={(e) => updateMark('totalMarks', field, e.target.value)}
                      placeholder="Max"
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Total: {form.marks.theory + form.marks.practical + form.marks.internal} /
              {form.totalMarks.theory + form.totalMarks.practical + form.totalMarks.internal}
              ({Math.round(((form.marks.theory + form.marks.practical + form.marks.internal) /
                (form.totalMarks.theory + form.totalMarks.practical + form.totalMarks.internal)) * 100) || 0}%)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
            <input className="input-field" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Any remarks…" />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Saving…' : modal.mode === 'add' ? 'Add Result' : 'Save Changes'}
            </button>
            <button onClick={() => setModal({ open: false })} className="btn-secondary flex-1 justify-center">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function LoadingRows() {
  return <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>;
}
