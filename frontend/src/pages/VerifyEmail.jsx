import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error' | 'expired'
  const [message, setMessage] = useState('');
  const hasVerifiedRef = useRef(false);

  useEffect(() => {
    if (hasVerifiedRef.current) return;
    hasVerifiedRef.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link.');
      return;
    }

    api
      .get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => {
        setStatus('success');
      })
      .catch((err) => {
        const data = err.response?.data;
        if (data?.expired) {
          setStatus('expired');
        } else {
          setStatus('error');
        }
        setMessage(data?.message || 'Verification failed.');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 w-full max-w-md p-10 text-center animate-fade-in">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 bg-navy-900 rounded-xl flex items-center justify-center text-lg">🎓</div>
          <span className="font-display text-xl font-semibold text-navy-900">EduTrack</span>
        </div>

        {/* Verifying */}
        {status === 'verifying' && (
          <>
            <div className="w-16 h-16 border-4 border-navy-100 border-t-navy-900 rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-display font-bold text-navy-900 mb-2">Verifying your email…</h2>
            <p className="text-gray-500 text-sm">Please wait a moment.</p>
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-2xl font-display font-bold text-navy-900 mb-2">Email Verified!</h2>
            <p className="text-gray-500 text-sm mb-8">
              Your account has been activated successfully. You can now log in with the credentials sent to your email.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-navy-900 text-white font-semibold py-3 rounded-xl hover:bg-navy-800 transition-all text-sm"
            >
              Go to Login →
            </button>
          </>
        )}

        {/* Expired */}
        {status === 'expired' && (
          <>
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">⏰</span>
            </div>
            <h2 className="text-2xl font-display font-bold text-navy-900 mb-2">Link Expired</h2>
            <p className="text-gray-500 text-sm mb-8">
              This verification link has expired (valid for 24 hours). Please contact your admin to resend the verification email.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-navy-900 text-white font-semibold py-3 rounded-xl hover:bg-navy-800 transition-all text-sm"
            >
              Back to Login
            </button>
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">❌</span>
            </div>
            <h2 className="text-2xl font-display font-bold text-navy-900 mb-2">Verification Failed</h2>
            <p className="text-gray-500 text-sm mb-8">
              {message || 'This link is invalid or has already been used. Contact your admin if the problem persists.'}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-navy-900 text-white font-semibold py-3 rounded-xl hover:bg-navy-800 transition-all text-sm"
            >
              Back to Login
            </button>
          </>
        )}

      </div>
    </div>
  );
}
