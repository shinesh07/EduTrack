import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { DEPARTMENT_OPTIONS } from '../constants/departments';

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState('form'); // 'form' | 'success'
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    department: '',
    semester: '',
    rollNumber: '',
    phone: '',
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.password) {
      toast.error('Name, email and password are required');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/signup', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        department: form.department || undefined,
        semester: form.semester ? Number(form.semester) : undefined,
        rollNumber: form.rollNumber || undefined,
        phone: form.phone || undefined,
      });
      setStep('success');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!form.email) {
      toast.error('Enter your email first');
      return;
    }

    setResending(true);
    try {
      const { data } = await api.post('/auth/resend-verification', {
        email: form.email,
      });
      toast.success(data?.message || 'Verification email resent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 w-full max-w-md p-10 text-center animate-fade-in">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">📧</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-navy-900 mb-3">Check your inbox!</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            We sent a verification email to
          </p>
          <p className="font-semibold text-navy-800 text-sm mb-6">{form.email}</p>
          <p className="text-gray-400 text-xs mb-8">
            Click the link in the email to activate your account. The link expires in 24 hours.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-navy-900 text-white font-semibold py-3 rounded-xl hover:bg-navy-800 transition-all text-sm"
          >
            Go to Login
          </button>
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resending}
            className="w-full mt-3 bg-white text-navy-900 border border-navy-100 font-semibold py-3 rounded-xl hover:bg-navy-50 transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {resending ? 'Resending…' : 'Resend verification email'}
          </button>
          <p className="text-xs text-gray-400 mt-4">
            Didn't receive it? Check spam or{' '}
            <button onClick={() => setStep('form')} className="text-navy-600 underline">try again</button>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-navy-900">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900" />
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, #f0a500 0%, transparent 55%)' }}
        />
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center text-xl">🎓</div>
            <span className="text-white font-display text-2xl font-semibold">EduTrack</span>
          </Link>
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-display text-white leading-tight mb-5">
            Join EduTrack<br />
            <span className="text-gold-500">as a Student or Teacher</span>
          </h1>
          <p className="text-navy-200 text-base leading-relaxed">
            Create your account, verify your email, and get access to results, attendance tracking, and transcripts.
          </p>
        </div>
        <div className="relative z-10">
          <p className="text-navy-400 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-gold-500 font-semibold hover:underline">Sign in →</Link>
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-8 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-lg py-8">
          {/* Mobile logo */}
          <div className="flex items-center justify-between mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-navy-900 rounded-xl flex items-center justify-center text-lg">🎓</div>
              <span className="text-navy-900 font-display text-xl font-semibold">EduTrack</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/" className="text-sm text-navy-600 font-medium">Home</Link>
              <Link to="/login" className="text-sm text-navy-600 font-medium">Sign in →</Link>
            </div>
          </div>

          <div className="mb-7">
            <h2 className="text-3xl font-display font-bold text-navy-900">Create account</h2>
            <p className="text-gray-500 mt-1.5 text-sm">
              Fill in your details below. A verification email will be sent to activate your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I am a…</label>
              <div className="grid grid-cols-2 gap-3">
                {['student', 'teacher'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm({ ...form, role: r })}
                    className={`py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all
                      ${form.role === r
                        ? 'border-navy-900 bg-navy-900 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-navy-400'}`}
                  >
                    {r === 'student' ? '🎓 Student' : '👩‍🏫 Teacher'}
                  </button>
                ))}
              </div>
            </div>

            {/* Name & Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                <input
                  name="name" value={form.name} onChange={handleChange}
                  className="input-field" placeholder="Anjali Singh"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                <input
                  type="email" name="email" value={form.email} onChange={handleChange}
                  className="input-field" placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                <input
                  type="password" name="password" value={form.password} onChange={handleChange}
                  className="input-field" placeholder="Min 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password *</label>
                <input
                  type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
                  className="input-field" placeholder="Repeat password"
                />
              </div>
            </div>

            {/* Department & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                <select
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Select department</option>
                  {DEPARTMENT_OPTIONS.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input
                  name="phone" value={form.phone} onChange={handleChange}
                  className="input-field" placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* Student-specific fields */}
            {form.role === 'student' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Roll Number</label>
                  <input
                    name="rollNumber" value={form.rollNumber} onChange={handleChange}
                    className="input-field" placeholder="CS2024001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Semester</label>
                  <select name="semester" value={form.semester} onChange={handleChange} className="input-field">
                    <option value="">Select semester</option>
                    {[1,2,3,4,5,6,7,8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {form.role === 'teacher' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Course Assignment</label>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                  After signup, admins assign teachers to semester courses from the semester setup page.
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  You only need your basic account details here.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy-900 text-white font-semibold py-3 rounded-xl
                         hover:bg-navy-800 transition-all duration-200 text-sm
                         disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account…</>
              ) : (
                'Create Account & Send Verification →'
              )}
            </button>

            <p className="text-center text-xs text-gray-500">
              Already signed up or need a fresh link?{' '}
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending || !form.email}
                className="text-navy-700 font-semibold hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                {resending ? 'Resending…' : 'Resend verification email'}
              </button>
            </p>

            <p className="text-center text-xs text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-navy-700 font-semibold hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
