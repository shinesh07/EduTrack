import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success(data?.message || 'Reset link sent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-navy-900">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900" />
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 30% 25%, #f0a500 0%, transparent 48%), radial-gradient(circle at 75% 70%, #3452a0 0%, transparent 45%)' }}
          />
        </div>

        <div className="relative z-10">
          <Link to="/" className="flex w-fit items-center gap-3">
            <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center text-xl">🎓</div>
            <span className="text-white font-display text-2xl font-semibold">EduTrack</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-display text-white leading-tight mb-6">
            Reset access<br />
            <span className="text-gold-500">through your email</span>
          </h1>
          <p className="text-navy-200 text-lg leading-relaxed">
            Enter the email linked to your account and we will send a secure link so you can choose a new password.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { label: 'Secure token', desc: 'Single-use link in your inbox' },
            { label: '1 hour', desc: 'Short expiry for safer recovery' },
            { label: 'All portals', desc: 'Works for admin, teacher, and student' },
          ].map((item) => (
            <div key={item.label} className="bg-white/8 rounded-xl p-4 border border-white/10">
              <div className="text-white text-sm font-semibold">{item.label}</div>
              <div className="text-navy-300 text-xs mt-1 leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between gap-3 mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-navy-900 rounded-xl flex items-center justify-center text-lg">🎓</div>
              <span className="text-navy-900 font-display text-xl font-semibold">EduTrack</span>
            </Link>
            <Link to="/login" className="text-sm text-navy-600 font-medium">Back to login</Link>
          </div>

          {!sent ? (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-display text-navy-900 font-bold">Forgot password?</h2>
                <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                  We will email you a password reset link if an account exists for this address.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    placeholder="you@school.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-navy-900 text-white font-semibold py-3 rounded-xl hover:bg-navy-800 transition-all duration-200 text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending link…
                    </>
                  ) : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-4xl">📧</span>
              </div>
              <h2 className="text-2xl font-display text-navy-900 font-bold mb-2">Check your inbox</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                If the email is registered with EduTrack, a reset link is on the way. It stays active for 1 hour.
              </p>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Remembered your password?{' '}
              <Link to="/login" className="text-navy-700 font-semibold hover:underline">
                Sign in →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
