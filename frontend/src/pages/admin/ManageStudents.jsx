import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import { buildDepartmentOptions } from '../../constants/departments';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  rollNumber: '',
  department: '',
  semester: '',
  phone: '',
  address: '',
  isActive: true,
};

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'add', data: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const departmentOptions = buildDepartmentOptions(form.department);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/students');
      setStudents(response.data.data);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const openAdd = () => {
    setForm(emptyForm);
    setModal({ open: true, mode: 'add', data: null });
  };

  const openEdit = (student) => {
    setForm({
      name: student.name,
      email: student.email,
      password: '',
      rollNumber: student.rollNumber || '',
      department: student.department || '',
      semester: student.semester || '',
      phone: student.phone || '',
      address: student.address || '',
      isActive: student.isActive,
    });
    setModal({ open: true, mode: 'edit', data: student });
  };

  const handleSave = async () => {
    if (!form.name || !form.email || !form.rollNumber) {
      toast.error('Name, email, and roll number are required');
      return;
    }
    if (modal.mode === 'add' && !form.password) {
      toast.error('Password is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        semester: Number(form.semester) || undefined,
      };

      if (modal.mode === 'add') {
        const response = await api.post('/admin/students', payload);
        setStudents((prev) => [response.data.data, ...prev]);
        toast.success('Student added successfully');
      } else {
        const response = await api.put(`/admin/students/${modal.data._id}`, payload);
        setStudents((prev) =>
          prev.map((student) =>
            student._id === modal.data._id ? response.data.data : student
          )
        );
        toast.success('Student updated');
      }

      setModal({ open: false, mode: 'add', data: null });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/students/${id}`);
      setStudents((prev) => prev.filter((student) => student._id !== id));
      toast.success('Student and all records deleted');
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleResendVerification = async (id) => {
    try {
      await api.post(`/admin/resend-verification/${id}`);
      toast.success('Verification email resent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend');
    }
  };

  const filtered = students.filter((student) =>
    student.name.toLowerCase().includes(search.toLowerCase()) ||
    student.email.toLowerCase().includes(search.toLowerCase()) ||
    (student.rollNumber || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-navy-900">Manage Students</h1>
          <p className="text-gray-500 text-sm mt-1">{students.length} student(s) enrolled</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <span>➕</span> Add Student
        </button>
      </div>

      <div className="card !py-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name, email, or roll no…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field flex-1"
        />
      </div>

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <LoadingRows />
        ) : filtered.length === 0 ? (
          <EmptyState icon="🎓" msg="No students found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-navy-50 border-b border-navy-100">
                <tr>
                  {['Student', 'Roll No.', 'Department', 'Semester', 'Courses', 'Teachers', 'Verified', 'Status', 'Actions'].map((header) => (
                    <th key={header} className="table-th">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{student.name}</p>
                          <p className="text-xs text-gray-400">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td font-mono text-sm">{student.rollNumber || '—'}</td>
                    <td className="table-td">{student.department || '—'}</td>
                    <td className="table-td">
                      {student.semester ? (
                        <span className="bg-navy-50 text-navy-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          Sem {student.semester}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="table-td">
                      <span className="text-navy-700 font-semibold">{student.currentCourseCount ?? 0}</span>
                    </td>
                    <td className="table-td">
                      <span className="text-navy-700 font-semibold">{student.currentTeacherCount ?? 0}</span>
                    </td>
                    <td className="table-td">
                      {student.isVerified ? (
                        <span className="badge-present">✓ Verified</span>
                      ) : (
                        <button
                          onClick={() => handleResendVerification(student._id)}
                          className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 font-medium"
                        >
                          Resend Email
                        </button>
                      )}
                    </td>
                    <td className="table-td">
                      <span className={student.isActive ? 'badge-present' : 'badge-absent'}>
                        {student.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(student)}
                          className="text-xs bg-navy-50 text-navy-700 px-3 py-1.5 rounded-lg hover:bg-navy-100 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmDelete(student)}
                          className="text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, mode: 'add', data: null })}
        title={modal.mode === 'add' ? 'Add New Student' : 'Edit Student'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                className="input-field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Anjali Singh"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                className="input-field"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="student@school.com"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number *</label>
              <input
                className="input-field"
                value={form.rollNumber}
                onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
                placeholder="CS2024001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password {modal.mode === 'edit' && <span className="text-gray-400 text-xs">(leave blank)</span>}
              </label>
              <input
                type="password"
                className="input-field"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                className="input-field"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                <option value="">Select department</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
              <select
                className="input-field"
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })}
              >
                <option value="">Select</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                className="input-field"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              className="input-field"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Street, City"
            />
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
            Students automatically receive semester courses from their department and current semester. Teacher links now come from semester setup, not from this form.
          </div>
          {modal.mode === 'edit' && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 accent-navy-900"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Account Active
              </label>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Saving…' : modal.mode === 'add' ? 'Add Student' : 'Save Changes'}
            </button>
            <button
              onClick={() => setModal({ open: false, mode: 'add', data: null })}
              className="btn-secondary flex-1 justify-center"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Student" size="sm">
        <div className="text-center space-y-4">
          <div className="text-5xl">⚠️</div>
          <p className="text-gray-700">
            Delete <strong>{confirmDelete?.name}</strong>? This will also remove all attendance and results for this student.
          </p>
          <div className="flex gap-3">
            <button onClick={() => handleDelete(confirmDelete._id)} className="btn-danger flex-1 justify-center">
              Yes, Delete
            </button>
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
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

function EmptyState({ icon, msg }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-sm">{msg}</p>
    </div>
  );
}
