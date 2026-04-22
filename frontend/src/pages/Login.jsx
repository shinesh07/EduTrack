import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [authError, setAuthError] = useState('');

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error('Please fill in all fields'); return; }
    setUnverified(false);
    setAuthError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(`/${user.role}`);
    } catch (err) {
      const data = err.response?.data;
      if (data?.unverified) {
        setUnverified(true);
      } else {
        setAuthError(data?.message || 'Login details are incorrect. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-navy-900">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900" />
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #f0a500 0%, transparent 50%), radial-gradient(circle at 75% 75%, #3452a0 0%, transparent 50%)' }} />
          <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10">
          <Link to="/" className="flex w-fit items-center gap-3">
            <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center text-xl">🎓</div>
            <span className="text-white font-display text-2xl font-semibold">EduTrack</span>
          </Link>
        </div>

        <div className="relative z-10">
          <h1 className="text-5xl font-display text-white leading-tight mb-6">
            Manage Results &<br />
            <span className="text-gold-500">Track Attendance</span><br />
            Seamlessly.
          </h1>
          <p className="text-navy-200 text-lg leading-relaxed max-w-md">
            A complete academic management platform for administrators, teachers, and students.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { icon: '📊', label: 'Real-time Results', desc: 'Instant grade computation' },
            { icon: '📋', label: 'Attendance', desc: 'Daily tracking & reports' },
            { icon: '📄', label: 'Transcripts', desc: 'Download PDF anytime' },
          ].map((f) => (
            <div key={f.label} className="bg-white/8 rounded-xl p-4 border border-white/10">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="text-white text-sm font-semibold">{f.label}</div>
              <div className="text-navy-300 text-xs mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right login panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-between gap-3 mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-navy-900 rounded-xl flex items-center justify-center text-lg">🎓</div>
              <span className="text-navy-900 font-display text-xl font-semibold">EduTrack</span>
            </Link>
            <Link to="/" className="text-sm text-navy-600 font-medium">Home</Link>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-display text-navy-900 font-bold">Welcome back</h2>
            <p className="text-gray-500 mt-2 text-sm">Sign in to your account to continue</p>
          </div>

          {/* Unverified notice */}
          {unverified && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">📧</span>
                <div>
                  <p className="font-semibold text-amber-800 text-sm">Email not verified</p>
                  <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                    Please check your inbox and click the verification link to activate your account.
                  </p>
                </div>
              </div>
            </div>
          )}

          {authError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">⚠️</span>
                <div>
                  <p className="font-semibold text-red-800 text-sm">Login failed</p>
                  <p className="text-red-700 text-xs mt-1 leading-relaxed">
                    {authError}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email" placeholder="you@school.com"
                value={form.email} onChange={(e) => updateField('email', e.target.value)}
                className="input-field" autoComplete="email"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-navy-700 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password" placeholder="••••••••"
                value={form.password} onChange={(e) => updateField('password', e.target.value)}
                className="input-field" autoComplete="current-password"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-navy-900 text-white font-semibold py-3 rounded-xl
                         hover:bg-navy-800 transition-all duration-200 mt-2 text-sm
                         disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</>
              ) : 'Sign In →'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/signup" className="text-navy-700 font-semibold hover:underline">
                Create one →
              </Link>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Want to see the project overview first?{' '}
              <Link to="/" className="text-navy-700 font-semibold hover:underline">
                Visit Home →
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            EduTrack v1.0 · Student Management System
          </p>
        </div>
      </div>
    </div>
  );
}
