import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import { buildDepartmentOptions } from '../../constants/departments';

const emptyForm = {
  department: '',
  semester: '',
  code: '',
  title: '',
  teacherId: '',
  isActive: true,
};

export default function AdminSemesterCourses() {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [settings, setSettings] = useState({ allowStudentSemesterEdit: false });
  const [filters, setFilters] = useState({ department: '', semester: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [modal, setModal] = useState({ open: false, mode: 'add', data: null });
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value)
      );

      const [settingsRes, coursesRes, teachersRes, studentsRes] = await Promise.all([
        api.get('/admin/academic-settings'),
        api.get('/admin/semester-courses', { params }),
        api.get('/admin/teachers'),
        api.get('/admin/students'),
      ]);

      setSettings(settingsRes.data.data);
      setCourses(coursesRes.data.data);
      setTeachers(teachersRes.data.data);
      setStudents(studentsRes.data.data);
    } catch {
      toast.error('Failed to load semester setup');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const knownDepartments = useMemo(
    () =>
      buildDepartmentOptions(
        [...teachers, ...students, ...courses].map((item) => item.department)
      ),
    [courses, students, teachers]
  );

  const formDepartments = useMemo(
    () => buildDepartmentOptions(knownDepartments, [form.department]),
    [form.department, knownDepartments]
  );

  const filterDepartments = useMemo(
    () => buildDepartmentOptions(knownDepartments, [filters.department]),
    [filters.department, knownDepartments]
  );

  const departmentTeachers = useMemo(
    () =>
      teachers.filter(
        (teacher) =>
          !form.department || teacher.department === form.department
      ),
    [form.department, teachers]
  );

  const openAdd = () => {
    setForm({
      ...emptyForm,
      department: filters.department,
      semester: filters.semester,
    });
    setModal({ open: true, mode: 'add', data: null });
  };

  const openEdit = (course) => {
    setForm({
      department: course.department,
      semester: String(course.semester || ''),
      code: course.code || '',
      title: course.title || '',
      teacherId: course.teacher?._id || '',
      isActive: course.isActive,
    });
    setModal({ open: true, mode: 'edit', data: course });
  };

  const handleSave = async () => {
    if (!form.department || !form.semester || !form.title) {
      toast.error('Department, semester, and course title are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        department: form.department,
        semester: Number(form.semester),
        code: form.code,
        title: form.title,
        teacherId: form.teacherId || null,
        isActive: form.isActive,
      };

      if (modal.mode === 'add') {
        await api.post('/admin/semester-courses', payload);
        toast.success('Semester course added');
      } else {
        await api.put(`/admin/semester-courses/${modal.data._id}`, payload);
        toast.success('Semester course updated');
      }

      setModal({ open: false, mode: 'add', data: null });
      setForm(emptyForm);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    try {
      await api.delete(`/admin/semester-courses/${confirmDelete._id}`);
      toast.success('Semester course deleted');
      setConfirmDelete(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete course');
    }
  };

  const handleToggleWindow = async () => {
    setToggling(true);
    try {
      const nextValue = !settings.allowStudentSemesterEdit;
      const response = await api.put('/admin/academic-settings', {
        allowStudentSemesterEdit: nextValue,
      });
      setSettings(response.data.data);
      toast.success(
        nextValue
          ? 'Students can now move to the next semester'
          : 'Semester changes are now locked'
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update setting');
    } finally {
      setToggling(false);
    }
  };

  const sortedCourses = [...courses].sort((a, b) => {
    if (a.department !== b.department) {
      return a.department.localeCompare(b.department);
    }
    if (a.semester !== b.semester) return a.semester - b.semester;
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-navy-900">
            Semester Setup
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Fix department-wise semester courses and assign one teacher per course.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleToggleWindow}
            disabled={toggling}
            className={settings.allowStudentSemesterEdit ? 'btn-gold' : 'btn-secondary'}
          >
            {toggling
              ? 'Updating…'
              : settings.allowStudentSemesterEdit
                ? '🔓 Semester Changes Open'
                : '🔒 Semester Changes Locked'}
          </button>
          <button onClick={openAdd} className="btn-primary">
            <span>➕</span> Add Semester Course
          </button>
        </div>
      </div>

      <div
        className={`card border-2 ${
          settings.allowStudentSemesterEdit
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-amber-200 bg-amber-50'
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">
            {settings.allowStudentSemesterEdit ? '✅' : '⏸️'}
          </span>
          <div>
            <p className="font-semibold text-navy-900">Student semester window</p>
            <p className="text-sm text-gray-600 mt-1">
              {settings.allowStudentSemesterEdit
                ? 'Students can move only to their next semester right now. Their new semester courses will be assigned automatically.'
                : 'Students cannot change semester right now. Turn this on at the start of a semester when promotion should be allowed.'}
            </p>
          </div>
        </div>
      </div>

      <div className="card !py-4">
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.6fr_auto] gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              value={filters.department}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, department: e.target.value }))
              }
              className="input-field"
            >
              <option value="">All departments</option>
              {filterDepartments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Semester
            </label>
            <select
              value={filters.semester}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, semester: e.target.value }))
              }
              className="input-field"
            >
              <option value="">All semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
                <option key={semester} value={semester}>
                  Semester {semester}
                </option>
              ))}
            </select>
          </div>
          <button onClick={fetchData} className="btn-secondary self-end">
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-sm text-gray-500 font-medium">Visible Courses</p>
          <p className="text-3xl font-display font-bold text-navy-800 mt-1">
            {courses.length}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500 font-medium">Teachers</p>
          <p className="text-3xl font-display font-bold text-blue-600 mt-1">
            {teachers.length}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500 font-medium">Departments</p>
          <p className="text-3xl font-display font-bold text-emerald-600 mt-1">
            {knownDepartments.length}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500 font-medium">Edit Window</p>
          <p className="text-3xl font-display font-bold text-gold-600 mt-1">
            {settings.allowStudentSemesterEdit ? 'ON' : 'OFF'}
          </p>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <LoadingRows />
        ) : sortedCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <span className="text-4xl mb-3">📚</span>
            <p className="text-sm">No semester courses found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-navy-50 border-b border-navy-100">
                <tr>
                  {['Course', 'Department', 'Semester', 'Teacher', 'Status', 'Actions'].map((header) => (
                    <th key={header} className="table-th">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedCourses.map((course) => (
                  <tr key={course._id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td">
                      <div>
                        <p className="font-semibold text-gray-800">{course.title}</p>
                        <p className="text-xs text-gray-400">
                          {course.code || 'No code'}
                        </p>
                      </div>
                    </td>
                    <td className="table-td">{course.department}</td>
                    <td className="table-td">
                      <span className="bg-navy-50 text-navy-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        Sem {course.semester}
                      </span>
                    </td>
                    <td className="table-td">
                      {course.teacher ? (
                        <div>
                          <p className="font-medium text-gray-800">{course.teacher.name}</p>
                          <p className="text-xs text-gray-400">
                            {course.teacher.department || 'No department'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="table-td">
                      <span className={course.isActive ? 'badge-present' : 'badge-absent'}>
                        {course.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(course)}
                          className="text-xs bg-navy-50 text-navy-700 px-3 py-1.5 rounded-lg hover:bg-navy-100 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setConfirmDelete(course)}
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
        title={modal.mode === 'add' ? 'Add Semester Course' : 'Edit Semester Course'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department *
              </label>
              <select
                className="input-field"
                value={form.department}
                onChange={(e) =>
                  setForm((prev) => {
                    const nextDepartment = e.target.value;
                    const selectedTeacherStillMatches = teachers.some(
                      (teacher) =>
                        teacher._id === prev.teacherId &&
                        teacher.department === nextDepartment
                    );

                    return {
                      ...prev,
                      department: nextDepartment,
                      teacherId: selectedTeacherStillMatches ? prev.teacherId : '',
                    };
                  })
                }
              >
                <option value="">Select department</option>
                {formDepartments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Semester *
              </label>
              <select
                className="input-field"
                value={form.semester}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, semester: e.target.value }))
                }
              >
                <option value="">Select semester</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course Code
              </label>
              <input
                className="input-field"
                value={form.code}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                }
                placeholder="CS301"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teacher
              </label>
              <select
                className="input-field"
                value={form.teacherId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, teacherId: e.target.value }))
                }
              >
                <option value="">Unassigned</option>
                {departmentTeachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.name} {teacher.department ? `· ${teacher.department}` : ''}
                  </option>
                ))}
              </select>
              {form.department && departmentTeachers.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  No teachers found for {form.department}.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Title *
            </label>
            <input
              className="input-field"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Database Management Systems"
            />
          </div>

          {modal.mode === 'edit' && (
            <div className="flex items-center gap-3">
              <input
                id="course-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                }
                className="w-4 h-4 accent-navy-900"
              />
              <label htmlFor="course-active" className="text-sm font-medium text-gray-700">
                Course active
              </label>
            </div>
          )}

          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
            One course can have only one teacher at a time. A teacher can be assigned to multiple courses.
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Saving…' : modal.mode === 'add' ? 'Add Course' : 'Save Changes'}
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

      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Semester Course"
        size="sm"
      >
        <div className="text-center space-y-4">
          <div className="text-5xl">⚠️</div>
          <p className="text-gray-700">
            Delete <strong>{confirmDelete?.title}</strong> from{' '}
            <strong>{confirmDelete?.department}</strong> semester{' '}
            <strong>{confirmDelete?.semester}</strong>?
          </p>
          <div className="flex gap-3">
            <button onClick={handleDelete} className="btn-danger flex-1 justify-center">
              Yes, Delete
            </button>
            <button
              onClick={() => setConfirmDelete(null)}
              className="btn-secondary flex-1 justify-center"
            >
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
      {[...Array(5)].map((_, index) => (
        <div key={index} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}
