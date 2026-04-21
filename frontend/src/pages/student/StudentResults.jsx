import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const gradeColor = {
  'A+': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'A':  'bg-green-100 text-green-800 border-green-200',
  'B+': 'bg-blue-100 text-blue-800 border-blue-200',
  'B':  'bg-blue-50 text-blue-700 border-blue-100',
  'C+': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'C':  'bg-yellow-50 text-yellow-700 border-yellow-100',
  'D':  'bg-orange-100 text-orange-800 border-orange-200',
  'F':  'bg-red-100 text-red-800 border-red-200',
};

export default function StudentResults() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [cgpa, setCgpa] = useState('N/A');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [filterSem, setFilterSem] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterSem) params.semester = filterSem;
      if (filterYear) params.academicYear = filterYear;
      const r = await api.get('/student/results', { params });
      setResults(r.data.data);
      setCgpa(r.data.cgpa);
    } catch {
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  }, [filterSem, filterYear]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const handleDownloadTranscript = async () => {
    setDownloading(true);
    try {
      const response = await fetch('/api/student/transcript', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcript_${user?.rollNumber || user?._id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Transcript downloaded!');
    } catch (err) {
      toast.error(err.message || 'Failed to download transcript');
    } finally {
      setDownloading(false);
    }
  };

  // Group by semester
  const semesterMap = {};
  results.forEach((r) => {
    const key = r.semester;
    if (!semesterMap[key]) semesterMap[key] = [];
    semesterMap[key].push(r);
  });
  const semesters = Object.keys(semesterMap).sort((a, b) => Number(a) - Number(b));

  const passCount = results.filter((r) => r.status === 'pass').length;
  const failCount = results.filter((r) => r.status === 'fail').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-navy-900">My Results</h1>
          <p className="text-gray-500 text-sm mt-1">Academic performance and grades</p>
        </div>
        <button
          onClick={handleDownloadTranscript}
          disabled={downloading}
          className="btn-gold"
        >
          {downloading ? (
            <><div className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" /> Generating…</>
          ) : (
            <><span>📄</span> Download Transcript</>
          )}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card bg-navy-900 border-0">
          <p className="text-navy-300 text-sm font-medium">CGPA</p>
          <p className="text-3xl font-display font-bold text-gold-500 mt-1">{cgpa}</p>
          <p className="text-navy-400 text-xs mt-1">Cumulative</p>
        </div>
        <div className="stat-card">
          <p className="text-gray-500 text-sm font-medium">Subjects</p>
          <p className="text-3xl font-display font-bold text-navy-800 mt-1">{results.length}</p>
          <p className="text-gray-400 text-xs mt-1">Total graded</p>
        </div>
        <div className="stat-card bg-emerald-50 border-0">
          <p className="text-gray-500 text-sm font-medium">Passed</p>
          <p className="text-3xl font-display font-bold text-emerald-600 mt-1">{passCount}</p>
          <p className="text-gray-400 text-xs mt-1">Subjects</p>
        </div>
        <div className="stat-card bg-red-50 border-0">
          <p className="text-gray-500 text-sm font-medium">Failed</p>
          <p className="text-3xl font-display font-bold text-red-600 mt-1">{failCount}</p>
          <p className="text-gray-400 text-xs mt-1">Subjects</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card !py-4 flex gap-3">
        <select className="input-field" value={filterSem} onChange={(e) => setFilterSem(e.target.value)}>
          <option value="">All Semesters</option>
          {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Semester {s}</option>)}
        </select>
        <input
          className="input-field"
          placeholder="Academic Year (e.g. 2023-24)"
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
        />
      </div>

      {/* Results by semester */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card">
              <div className="h-6 bg-gray-100 rounded w-32 mb-4 animate-pulse" />
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => <div key={j} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}
              </div>
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <span className="text-4xl mb-3 block">📊</span>
          <p className="text-sm">No results available yet</p>
          <p className="text-xs mt-1">Your teacher will enter your grades here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {semesters.map((sem) => {
            const semResults = semesterMap[sem];
            const sgpa = (
              semResults.reduce((a, r) => a + (r.gradePoint || 0), 0) / semResults.length
            ).toFixed(2);

            return (
              <div key={sem} className="card">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-display font-semibold text-navy-900">
                      Semester {sem}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {semResults[0]?.academicYear} · SGPA: <strong className="text-navy-700">{sgpa}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-display font-bold text-navy-800">{sgpa}</p>
                    <p className="text-xs text-gray-400">Sem GPA</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {semResults.map((r) => {
                    const total = r.marks.theory + r.marks.practical + r.marks.internal;
                    const max = r.totalMarks.theory + r.totalMarks.practical + r.totalMarks.internal;
                    const pct = max > 0 ? Math.round((total / max) * 100) : 0;
                    const barColor = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

                    return (
                      <div key={r._id} className="border border-gray-100 rounded-xl p-4 hover:border-navy-200 transition-colors">
                        <div className="flex items-start gap-4">
                          {/* Grade badge */}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold
                                          flex-shrink-0 border ${gradeColor[r.grade] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {r.grade || '?'}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-gray-800">{r.subject}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {[r.semesterCourse?.code, r.teacher?.name ? `by ${r.teacher.name}` : null]
                                    .filter(Boolean)
                                    .join(' · ') || 'Course result'}
                                </p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0
                                ${r.status === 'pass' ? 'badge-pass' : 'badge-fail'}`}>
                                {r.status}
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                            </div>

                            {/* Marks breakdown */}
                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                              <span>Theory: <strong className="text-gray-700">{r.marks.theory}/{r.totalMarks.theory}</strong></span>
                              <span>Practical: <strong className="text-gray-700">{r.marks.practical}/{r.totalMarks.practical}</strong></span>
                              <span>Internal: <strong className="text-gray-700">{r.marks.internal}/{r.totalMarks.internal}</strong></span>
                              <span className="ml-auto font-semibold text-navy-700">
                                {total}/{max} ({pct}%)
                              </span>
                            </div>

                            {r.remarks && (
                              <p className="mt-2 text-xs text-gray-500 italic">💬 {r.remarks}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Semester pass/fail summary */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
                  <span className="text-emerald-600 font-medium">
                    ✓ {semResults.filter((r) => r.status === 'pass').length} passed
                  </span>
                  <span className="text-red-600 font-medium">
                    ✗ {semResults.filter((r) => r.status === 'fail').length} failed
                  </span>
                  <span className="ml-auto">Grade Points: {sgpa} / 10</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transcript download CTA */}
      {results.length > 0 && (
        <div className="card bg-navy-900 border-0 text-center py-8">
          <p className="text-white font-display text-xl font-semibold mb-2">Ready for your official transcript?</p>
          <p className="text-navy-300 text-sm mb-5">Download a PDF with all your grades, CGPA, and attendance summary</p>
          <button onClick={handleDownloadTranscript} disabled={downloading} className="btn-gold mx-auto">
            {downloading ? 'Generating PDF…' : '📄 Download Official Transcript'}
          </button>
        </div>
      )}
    </div>
  );
}
