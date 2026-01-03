import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, LogIn, UserPlus, AlertCircle } from 'lucide-react';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await signUp(email, password, fullName);
        if (signUpError) {
          setError(signUpError);
        }
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(signInError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brutal-cream dark:bg-brutal-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card-brutal">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-metro-purple border-3 border-brutal-black dark:border-brutal-dark-border flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Compliance Hub</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Metro by T-Mobile</p>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-6">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border-3 border-red-500 dark:border-red-700 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-300 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-200 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-bold mb-2">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-brutal"
                  placeholder="John Doe"
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-brutal"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-brutal"
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-brutal-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-5 h-5" />
                  Create Account
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t-3 border-brutal-gray dark:border-brutal-dark-border">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="w-full text-center text-sm font-bold text-metro-purple hover:text-metro-magenta transition-colors"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create one"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4 font-medium">
          Retail Compliance Management System
        </p>
      </div>
    </div>
  );
}
