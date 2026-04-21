import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import { buildDepartmentOptions } from '../../constants/departments';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  department: '',
  phone: '',
  isActive: true,
};

export default function ManageTeachers() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'add', data: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const departmentOptions = buildDepartmentOptions(form.department);

  const fetchTeachers = () => {
    setLoading(true);
    api.get('/admin/teachers')
      .then((response) => setTeachers(response.data.data))
      .catch(() => toast.error('Failed to load teachers'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const openAdd = () => {
    setForm(emptyForm);
    setModal({ open: true, mode: 'add', data: null });
  };

  const openEdit = (teacher) => {
    setForm({
      name: teacher.name,
      email: teacher.email,
      password: '',
      department: teacher.department || '',
      phone: teacher.phone || '',
      isActive: teacher.isActive,
    });
    setModal({ open: true, mode: 'edit', data: teacher });
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      toast.error('Name and email are required');
      return;
    }
    if (modal.mode === 'add' && !form.password) {
      toast.error('Password is required for a new teacher');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form };

      if (modal.mode === 'add') {
        const response = await api.post('/admin/teachers', payload);
        setTeachers((prev) => [response.data.data, ...prev]);
        toast.success('Teacher added successfully');
      } else {
        const response = await api.put(`/admin/teachers/${modal.data._id}`, payload);
        setTeachers((prev) =>
          prev.map((teacher) =>
            teacher._id === modal.data._id ? response.data.data : teacher
          )
        );
        toast.success('Teacher updated');
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
      await api.delete(`/admin/teachers/${id}`);
      setTeachers((prev) => prev.filter((teacher) => teacher._id !== id));
      toast.success('Teacher deleted');
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

  const filtered = teachers.filter(
    (teacher) =>
      teacher.name.toLowerCase().includes(search.toLowerCase()) ||
      teacher.email.toLowerCase().includes(search.toLowerCase()) ||
      (teacher.department || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-navy-900">Manage Teachers</h1>
          <p className="text-gray-500 text-sm mt-1">{teachers.length} teacher(s) registered</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/admin/semester-courses')} className="btn-secondary">
            <span>🗂️</span> Semester Setup
          </button>
          <button onClick={openAdd} className="btn-primary">
            <span>➕</span> Add Teacher
          </button>
        </div>
      </div>

      <div className="card !py-4">
        <input
          type="text"
          placeholder="Search by name, email, or department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <LoadingRows />
        ) : filtered.length === 0 ? (
          <EmptyState icon="👩‍🏫" msg="No teachers found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-navy-50 border-b border-navy-100">
                <tr>
                  {['Teacher', 'Department', 'Assigned Courses', 'Students', 'Verified', 'Status', 'Actions'].map((header) => (
                    <th key={header} className="table-th">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((teacher) => (
                  <tr key={teacher._id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                          {teacher.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{teacher.name}</p>
                          <p className="text-xs text-gray-400">{teacher.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td">{teacher.department || '—'}</td>
                    <td className="table-td">
                      <div className="flex flex-wrap gap-1 max-w-[260px]">
                        {(teacher.assignedCourses || []).slice(0, 3).map((course) => (
                          <span key={course._id} className="text-xs bg-navy-50 text-navy-700 px-2 py-0.5 rounded-full">
                            {course.code ? `${course.code} · ` : ''}{course.title}
                          </span>
                        ))}
                        {(teacher.assignedCourses || []).length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{teacher.assignedCourses.length - 3}
                          </span>
                        )}
                        {(teacher.assignedCourses || []).length === 0 && (
                          <span className="text-xs text-gray-400">
                            Assign courses from semester setup
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-td">
                      <span className="text-navy-700 font-semibold">{teacher.studentCount ?? 0}</span>
                    </td>
                    <td className="table-td">
                      {teacher.isVerified ? (
                        <span className="badge-present">✓ Verified</span>
                      ) : (
                        <button
                          onClick={() => handleResendVerification(teacher._id)}
                          className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors font-medium"
                        >
                          Resend Email
                        </button>
                      )}
                    </td>
                    <td className="table-td">
                      <span className={teacher.isActive ? 'badge-present' : 'badge-absent'}>
                        {teacher.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(teacher)}
                          className="text-xs bg-navy-50 text-navy-700 px-3 py-1.5 rounded-lg hover:bg-navy-100 transition-colors font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmDelete(teacher)}
                          className="text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors font-medium"
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
        title={modal.mode === 'add' ? 'Add New Teacher' : 'Edit Teacher'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                className="input-field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Dr. Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                className="input-field"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="teacher@school.com"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password {modal.mode === 'edit' && <span className="text-gray-400">(leave blank to keep)</span>}
              </label>
              <input
                type="password"
                className="input-field"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
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
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
            Course assignments are managed from the semester setup page. One teacher can be linked to multiple semester courses there.
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
              {saving ? 'Saving…' : modal.mode === 'add' ? 'Add Teacher' : 'Save Changes'}
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

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Teacher" size="sm">
        <div className="text-center space-y-4">
          <div className="text-5xl">⚠️</div>
          <p className="text-gray-700">
            Delete <strong>{confirmDelete?.name}</strong>? Their semester course assignments will be cleared.
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
