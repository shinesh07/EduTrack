import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import Modal from '../../components/Modal';

const gradeColor = {
  'A+': 'bg-emerald-100 text-emerald-800',
  A: 'bg-green-100 text-green-800',
  'B+': 'bg-blue-100 text-blue-800',
  B: 'bg-blue-50 text-blue-700',
  'C+': 'bg-yellow-100 text-yellow-800',
  C: 'bg-yellow-50 text-yellow-700',
  D: 'bg-orange-100 text-orange-800',
  F: 'bg-red-100 text-red-800',
};

const emptyForm = {
  studentId: '',
  courseId: '',
  academicYear: '',
  marks: { theory: 0, practical: 0, internal: 0 },
  totalMarks: { theory: 100, practical: 50, internal: 30 },
  remarks: '',
};

export default function TeacherResults() {
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: 'add', data: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    studentId: searchParams.get('studentId') || '',
    courseId: '',
    academicYear: '',
  });

  const fetchMeta = useCallback(async () => {
    try {
      const [coursesRes, studentsRes] = await Promise.all([
        api.get('/teacher/courses'),
        api.get('/teacher/students'),
      ]);
      setCourses(coursesRes.data.data);
      setStudents(studentsRes.data.data);
    } catch {
      toast.error('Failed to load your courses');
    }
  }, []);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
      const response = await api.get('/teacher/results', { params });
      setResults(response.data.data);
    } catch {
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const findCourseIdForResult = useCallback((result) => {
    if (result.semesterCourse?._id) return String(result.semesterCourse._id);
    if (result.semesterCourse) return String(result.semesterCourse);
    const course = courses.find(
      (item) =>
        item.title === result.subject &&
        Number(item.semester) === Number(result.semester)
    );
    return course?._id || '';
  }, [courses]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course._id === form.courseId) || null,
    [courses, form.courseId]
  );

  const eligibleStudents = useMemo(() => {
    if (!selectedCourse) {
      return modal.mode === 'add' ? [] : students;
    }
    return students.filter(
      (student) =>
        student.department === selectedCourse.department &&
        Number(student.semester) === Number(selectedCourse.semester)
    );
  }, [modal.mode, selectedCourse, students]);

  const handleCourseChange = (courseId) => {
    const nextCourse = courses.find((course) => course._id === courseId) || null;

    setForm((prev) => {
      if (!nextCourse) {
        return { ...prev, courseId, studentId: '' };
      }

      const selectedStudentStillEligible = students.some(
        (student) =>
          student._id === prev.studentId &&
          student.department === nextCourse.department &&
          Number(student.semester) === Number(nextCourse.semester)
      );

      return {
        ...prev,
        courseId,
        studentId: selectedStudentStillEligible ? prev.studentId : '',
      };
    });
  };

  const openAdd = () => {
    setForm(emptyForm);
    setModal({ open: true, mode: 'add', data: null });
  };

  const openEdit = (result) => {
    setForm({
      studentId: result.student?._id || '',
      courseId: findCourseIdForResult(result),
      academicYear: result.academicYear,
      marks: { ...result.marks },
      totalMarks: { ...result.totalMarks },
      remarks: result.remarks || '',
    });
    setModal({ open: true, mode: 'edit', data: result });
  };

  const handleSave = async () => {
    if (modal.mode === 'add') {
      if (!form.courseId) {
        toast.error('Please select a course first');
        return;
      }
      if (!form.studentId) {
        toast.error('Please select a student for this course');
        return;
      }
      if (!String(form.academicYear || '').trim()) {
        toast.error('Academic year is required');
        return;
      }
    }

    setSaving(true);
    try {
      const payload =
        modal.mode === 'add'
          ? { ...form, academicYear: String(form.academicYear || '').trim() }
          : {
              marks: form.marks,
              totalMarks: form.totalMarks,
              remarks: form.remarks,
            };
      if (modal.mode === 'add') {
        await api.post('/teacher/results', payload);
        toast.success('Result saved');
      } else {
        await api.put(`/teacher/results/${modal.data._id}`, payload);
        toast.success('Result updated');
      }
      setModal({ open: false, mode: 'add', data: null });
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
      setResults((prev) => prev.filter((result) => result._id !== id));
      toast.success('Result deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const updateMark = (type, field, value) => {
    setForm((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: Number(value) },
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-navy-900">Results Management</h1>
          <p className="text-gray-500 text-sm mt-1">Enter and manage results for your assigned semester courses</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><span>➕</span> Add Result</button>
      </div>

      <div className="card !py-4 flex flex-col sm:flex-row gap-3">
        <select className="input-field" value={filters.studentId} onChange={(e) => setFilters({ ...filters, studentId: e.target.value })}>
          <option value="">All Students</option>
          {students.map((student) => (
            <option key={student._id} value={student._id}>
              {student.name} — {student.rollNumber}
            </option>
          ))}
        </select>
        <select className="input-field" value={filters.courseId} onChange={(e) => setFilters({ ...filters, courseId: e.target.value })}>
          <option value="">All Courses</option>
          {courses.map((course) => (
            <option key={course._id} value={course._id}>
              {course.code ? `${course.code} · ` : ''}{course.title}
            </option>
          ))}
        </select>
        <input
          className="input-field sm:w-44"
          placeholder="Academic Year"
          value={filters.academicYear}
          onChange={(e) => setFilters({ ...filters, academicYear: e.target.value })}
        />
      </div>

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <LoadingRows />
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <span className="text-4xl mb-3">📈</span>
            <p className="text-sm">No results found. Add one to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-navy-50 border-b border-navy-100">
                <tr>
                  {['Student', 'Course', 'Sem', 'Year', 'Theory', 'Practical', 'Internal', 'Grade', 'GP', 'Status', 'Actions'].map((header) => (
                    <th key={header} className="table-th">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((result) => (
                  <tr key={result._id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td">
                      <p className="font-semibold text-sm">{result.student?.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{result.student?.rollNumber}</p>
                    </td>
                    <td className="table-td text-sm">{result.subject}</td>
                    <td className="table-td text-center">{result.semester}</td>
                    <td className="table-td text-sm">{result.academicYear}</td>
                    <td className="table-td text-center text-sm">{result.marks?.theory}/{result.totalMarks?.theory}</td>
                    <td className="table-td text-center text-sm">{result.marks?.practical}/{result.totalMarks?.practical}</td>
                    <td className="table-td text-center text-sm">{result.marks?.internal}/{result.totalMarks?.internal}</td>
                    <td className="table-td">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${gradeColor[result.grade] || ''}`}>
                        {result.grade || '—'}
                      </span>
                    </td>
                    <td className="table-td text-center font-semibold">{result.gradePoint ?? '—'}</td>
                    <td className="table-td">
                      <span className={result.status === 'pass' ? 'badge-pass' : result.status === 'fail' ? 'badge-fail' : 'badge-late'}>
                        {result.status}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(result)} className="text-xs bg-navy-50 text-navy-700 px-2 py-1 rounded hover:bg-navy-100 font-medium">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(result._id)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 font-medium">
                          Del
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
        title={modal.mode === 'add' ? 'Add Result' : 'Edit Result'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
              <select
                className="input-field"
                value={form.studentId}
                onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                disabled={modal.mode === 'edit' || (modal.mode === 'add' && !selectedCourse)}
              >
                <option value="">
                  {modal.mode === 'add' && !selectedCourse ? 'Select course first' : 'Select student'}
                </option>
                {eligibleStudents.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.name} ({student.rollNumber})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
              <select
                className="input-field"
                value={form.courseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                disabled={modal.mode === 'edit'}
              >
                <option value="">Select course</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.code ? `${course.code} · ` : ''}{course.title} · Sem {course.semester}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedCourse && (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              {selectedCourse.department} · Semester {selectedCourse.semester} · {eligibleStudents.length} eligible student(s)
            </div>
          )}
          {modal.mode === 'add' && !selectedCourse && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Select the course first, then choose a student from that department and semester.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
              <input
                className="input-field"
                placeholder="2025-26"
                value={form.academicYear}
                onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
              />
            </div>
          </div>

          <div className="border border-gray-100 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-navy-900 mb-3">Marks Obtained / Total</h3>
            <div className="grid grid-cols-3 gap-3">
              {['theory', 'practical', 'internal'].map((field) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{field}</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max={form.totalMarks[field]}
                      className="input-field !py-2 text-center"
                      value={form.marks[field]}
                      onChange={(e) => updateMark('marks', field, e.target.value)}
                    />
                    <span className="text-gray-400 self-center">/</span>
                    <input
                      type="number"
                      min="0"
                      className="input-field !py-2 text-center bg-gray-50"
                      value={form.totalMarks[field]}
                      onChange={(e) => updateMark('totalMarks', field, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Total: {form.marks.theory + form.marks.practical + form.marks.internal} /
              {form.totalMarks.theory + form.totalMarks.practical + form.totalMarks.internal}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
            <input
              className="input-field"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Any remarks…"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Saving…' : modal.mode === 'add' ? 'Add Result' : 'Save Changes'}
            </button>
            <button onClick={() => setModal({ open: false, mode: 'add', data: null })} className="btn-secondary flex-1 justify-center">
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
