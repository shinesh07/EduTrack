import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [serverMessage, setServerMessage] = useState('');

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error('This reset link is missing its token');
      return;
    }
    if (!form.password || !form.confirmPassword) {
      toast.error('Please fill in both password fields');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    setServerMessage('');
    try {
      const { data } = await api.post('/auth/reset-password', {
        token,
        newPassword: form.password,
      });
      setCompleted(true);
      toast.success(data?.message || 'Password reset successful');
    } catch (err) {
      const message = err.response?.data?.message || 'Could not reset password';
      setServerMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-navy-900">
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900" />
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 28% 30%, #f0a500 0%, transparent 48%), radial-gradient(circle at 78% 72%, #3452a0 0%, transparent 44%)' }}
          />
        </div>

        <div className="relative z-10">
          <Link to="/" className="flex w-fit items-center gap-3">
            <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center text-xl">🎓</div>
            <span className="text-white font-display text-2xl font-semibold">EduTrack</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-display text-white leading-tight mb-6">
            Set a new<br />
            <span className="text-gold-500">password securely</span>
          </h1>
          <p className="text-navy-200 text-lg leading-relaxed">
            Choose a fresh password for your account and use it the next time you sign in to EduTrack.
          </p>
        </div>

        <div className="relative z-10 bg-white/8 rounded-2xl border border-white/10 p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-gold-500 mb-2">Reset flow</p>
          <p className="text-white text-sm font-semibold">Email link → new password → login again</p>
          <p className="text-navy-300 text-xs leading-relaxed mt-2">
            Reset links are time-limited and invalid after use so the recovery process stays protected.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-7/12 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between gap-3 mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-navy-900 rounded-xl flex items-center justify-center text-lg">🎓</div>
              <span className="text-navy-900 font-display text-xl font-semibold">EduTrack</span>
            </Link>
            <Link to="/login" className="text-sm text-navy-600 font-medium">Back to login</Link>
          </div>

          {!completed ? (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-display text-navy-900 font-bold">Create a new password</h2>
                <p className="text-gray-500 mt-2 text-sm">
                  Choose a password with at least 6 characters.
                </p>
              </div>

              {!token && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="font-semibold text-red-800 text-sm">Reset link is incomplete</p>
                  <p className="text-red-700 text-xs mt-1 leading-relaxed">
                    Open the password reset email again and use the full link, or request a new one.
                  </p>
                </div>
              )}

              {serverMessage && (
                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="font-semibold text-amber-800 text-sm">Unable to reset password</p>
                  <p className="text-amber-700 text-xs mt-1 leading-relaxed">{serverMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter a new password"
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className="input-field"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Repeat your new password"
                    value={form.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    className="input-field"
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full bg-navy-900 text-white font-semibold py-3 rounded-xl hover:bg-navy-800 transition-all duration-200 text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Updating password…
                    </>
                  ) : 'Save New Password'}
                </button>
              </form>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">✅</span>
              </div>
              <h2 className="text-2xl font-display text-navy-900 font-bold mb-2">Password updated</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Your password has been changed successfully. Use the new password the next time you sign in.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-navy-900 text-white font-semibold py-3 rounded-xl hover:bg-navy-800 transition-all text-sm"
              >
                Go to Login
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Need a fresh link?{' '}
              <Link to="/forgot-password" className="text-navy-700 font-semibold hover:underline">
                Request another one →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
