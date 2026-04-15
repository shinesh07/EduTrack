import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function TeacherStudents() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/teacher/students')
      .then((r) => setStudents(r.data.data))
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.rollNumber || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-navy-900">My Students</h1>
        <p className="text-gray-500 text-sm mt-1">{students.length} student(s) under your supervision</p>
      </div>

      <div className="card !py-4">
        <input type="text" placeholder="Search students…" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-white rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <span className="text-4xl">🎓</span>
          <p className="text-sm mt-3">No students found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div key={s._id} className="card hover:shadow-md transition-all duration-200">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center
                                text-emerald-700 font-bold text-lg flex-shrink-0">
                  {s.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800 truncate">{s.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{s.rollNumber || 'No roll no.'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${s.isActive ? 'badge-present' : 'badge-absent'}`}>
                  {s.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-4 space-y-1.5 text-sm text-gray-600">
                <p>🏛 {s.department || 'No department'}</p>
                <p>📚 {s.semester ? `Semester ${s.semester}` : 'Semester N/A'}</p>
                {s.phone && <p>📞 {s.phone}</p>}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => navigate(`/teacher/attendance?studentId=${s._id}`)}
                  className="flex-1 text-xs bg-blue-50 text-blue-700 py-2 rounded-lg hover:bg-blue-100 font-medium transition-colors">
                  Attendance
                </button>
                <button onClick={() => navigate(`/teacher/results?studentId=${s._id}`)}
                  className="flex-1 text-xs bg-purple-50 text-purple-700 py-2 rounded-lg hover:bg-purple-100 font-medium transition-colors">
                  Results
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
