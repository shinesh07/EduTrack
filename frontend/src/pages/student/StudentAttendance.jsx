import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function StudentAttendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [todayRecords, setTodayRecords] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(null); // subject name being marked
  const [filterSubject, setFilterSubject] = useState('');
  const [tab, setTab] = useState('today'); // 'today' | 'history'

  // Fetch teacher's subjects via /auth/me (assignedTeacher is populated)
  useEffect(() => {
    if (user?.assignedTeacher) {
      api.get('/auth/me').then((r) => {
        const teacher = r.data.user?.assignedTeacher;
        if (teacher?.subjects?.length) setTeacherSubjects(teacher.subjects);
      }).catch(() => {});
    }
  }, [user]);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterSubject ? { subject: filterSubject } : {};
      const [attRes, todayRes] = await Promise.all([
        api.get('/student/attendance', { params }),
        api.get('/student/attendance/today'),
      ]);
      setRecords(attRes.data.data);
      setSummary(attRes.data.summary || {});
      setTodayRecords(todayRes.data.data);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [filterSubject]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  // Mark a single subject present
  const handleMark = async (subject) => {
    setMarking(subject);
    try {
      const res = await api.post('/student/attendance', { subject, status: 'present' });
      setTodayRecords((prev) => [...prev, res.data.data]);
      // Update summary optimistically
      setSummary((prev) => {
        const cur = prev[subject] || { total: 0, present: 0, absent: 0, late: 0 };
        return { ...prev, [subject]: { ...cur, total: cur.total + 1, present: cur.present + 1 } };
      });
      toast.success(`✅ Present marked for ${subject}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setMarking(null);
    }
  };

  const statusColor = { present: 'badge-present', absent: 'badge-absent', late: 'badge-late' };
  const todayDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const allSubjectsInSummary = Object.keys(summary);

  // How many subjects already marked today
  const markedToday = todayRecords.length;
  const totalSubjects = teacherSubjects.length;
  const allDoneToday = totalSubjects > 0 && markedToday >= totalSubjects;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-navy-900">My Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">{todayDate}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'today', label: "📋 Today's Classes" },
          { key: 'history', label: '📅 History' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${tab === t.key ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TODAY'S CLASSES TAB ─────────────────────────────────────── */}
      {tab === 'today' && (
        <div className="space-y-5">

          {!user?.assignedTeacher ? (
            <div className="card bg-amber-50 border-amber-200 border-2">
              <div className="flex items-center gap-3 text-amber-700">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-semibold">No teacher assigned</p>
                  <p className="text-sm">Contact your admin to get assigned to a teacher.</p>
                </div>
              </div>
            </div>
          ) : teacherSubjects.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">
              <span className="text-4xl mb-3 block">📚</span>
              <p className="text-sm">Your teacher hasn't added any subjects yet.</p>
            </div>
          ) : (
            <>
              {/* Progress bar */}
              <div className="card !py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-navy-900">
                    Today's Progress
                  </p>
                  <p className="text-sm font-bold text-navy-700">
                    {markedToday} / {totalSubjects} marked
                  </p>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500
                      ${allDoneToday ? 'bg-emerald-500' : 'bg-navy-600'}`}
                    style={{ width: `${totalSubjects > 0 ? (markedToday / totalSubjects) * 100 : 0}%` }}
                  />
                </div>
                {allDoneToday && (
                  <p className="text-xs text-emerald-600 font-medium mt-2">
                    🎉 All classes marked for today!
                  </p>
                )}
              </div>

              {/* Subject cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {teacherSubjects.map((subject) => {
                  const todayRecord = todayRecords.find((r) => r.subject === subject);
                  const isMarked = !!todayRecord;
                  const isMarkingThis = marking === subject;
                  const subSummary = summary[subject];
                  const rate = subSummary?.total > 0
                    ? Math.round((subSummary.present / subSummary.total) * 100)
                    : null;

                  return (
                    <div key={subject}
                      className={`card transition-all duration-200 border-2
                        ${isMarked
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-gray-100 hover:border-navy-200'}`}>

                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0
                            ${isMarked ? 'bg-emerald-500' : 'bg-navy-100'}`}>
                            {isMarked ? '✓' : '📖'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm leading-tight">{subject}</p>
                            {isMarked && (
                              <p className="text-xs text-emerald-600 font-medium mt-0.5">
                                Marked {todayRecord.markedBy === 'student' ? 'by you' : 'by teacher'}
                              </p>
                            )}
                          </div>
                        </div>
                        {isMarked && (
                          <span className="badge-present flex-shrink-0">Present</span>
                        )}
                      </div>

                      {/* Overall attendance rate for this subject */}
                      {rate !== null && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Overall attendance</span>
                            <span className={`font-semibold ${rate >= 75 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {rate}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${rate >= 75 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {subSummary.present}/{subSummary.total} classes attended
                          </p>
                        </div>
                      )}

                      {/* Mark button */}
                      {!isMarked ? (
                        <button
                          onClick={() => handleMark(subject)}
                          disabled={!!marking}
                          className="w-full bg-navy-900 text-white text-sm font-semibold py-2.5 rounded-xl
                                     hover:bg-navy-800 transition-all duration-200 mt-1
                                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isMarkingThis ? (
                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Marking…</>
                          ) : (
                            '✓ Mark Present'
                          )}
                        </button>
                      ) : (
                        <div className="w-full bg-emerald-100 text-emerald-700 text-sm font-semibold py-2.5 rounded-xl
                                        text-center mt-1 border border-emerald-200">
                          ✅ Attendance Recorded
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-gray-400 text-center">
                You can mark attendance for each subject once per day. Your teacher may adjust records if needed.
              </p>
            </>
          )}

          {/* Subject-wise summary cards (if any history exists) */}
          {allSubjectsInSummary.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-navy-900 mb-4">Overall Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allSubjectsInSummary.map((subject) => {
                  const s = summary[subject];
                  const rate = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
                  const barColor = rate >= 75 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-400' : 'bg-red-500';
                  const textColor = rate >= 75 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-red-600';
                  return (
                    <div key={subject} className="flex items-center gap-4 p-3 border border-gray-100 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-semibold text-gray-800 truncate">{subject}</p>
                          <span className={`text-sm font-bold ${textColor} ml-2`}>{rate}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${rate}%` }} />
                        </div>
                        <div className="flex gap-3 text-xs text-gray-400 mt-1.5">
                          <span className="text-emerald-600">{s.present}P</span>
                          <span className="text-red-500">{s.absent}A</span>
                          {s.late > 0 && <span className="text-amber-500">{s.late}L</span>}
                          <span className="ml-auto">{s.total} total</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ─────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="card !py-4">
            <select className="input-field" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
              <option value="">All Subjects</option>
              {allSubjectsInSummary.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="card !p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-navy-900">Attendance History</h2>
              <span className="text-xs text-gray-400">{records.length} records</span>
            </div>
            {loading ? (
              <div className="p-8 space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <span className="text-4xl mb-3">📋</span>
                <p className="text-sm">No attendance records yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-navy-50 border-b border-navy-100">
                    <tr>
                      {['Date', 'Subject', 'Status', 'Teacher', 'Marked By'].map((h) => (
                        <th key={h} className="table-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {records.map((r) => (
                      <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-td font-medium">
                          {new Date(r.date).toLocaleDateString('en-IN', {
                            weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </td>
                        <td className="table-td">{r.subject}</td>
                        <td className="table-td">
                          <span className={statusColor[r.status]}>{r.status}</span>
                        </td>
                        <td className="table-td text-sm text-gray-600">{r.teacher?.name || '—'}</td>
                        <td className="table-td">
                          <span className={`text-xs px-2 py-0.5 rounded-full
                            ${r.markedBy === 'student'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-purple-50 text-purple-700'}`}>
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
      )}
    </div>
  );
}
