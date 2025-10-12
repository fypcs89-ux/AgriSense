import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';

const LoginForm = ({ isLogin, onToggle, onClose, size = 'sm' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, signup, resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    try {
      setError('');
      setLoading(true);
      
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      
      onClose();
    } catch (error) {
      console.error('Authentication error:', error);
      const code = error?.code || '';
      const friendly =
        code === 'auth/configuration-not-found' ?
          'Authentication is not configured. In Firebase Console, enable Email/Password and add localhost to Authorized domains.' :
        code === 'auth/user-not-found' ?
          'No account found for this email. Please sign up.' :
        code === 'auth/wrong-password' ?
          'Incorrect password. Please try again.' :
        code === 'auth/invalid-credential' ?
          'Invalid credentials. Please try again.' :
        error.message || ('Failed to ' + (isLogin ? 'sign in' : 'create account'));
      setError(friendly);
    }
    
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`bg-white rounded-2xl shadow-2xl p-6 mx-4 w-[360px] sm:w-[420px]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-8">
          <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-600 mt-2">
            {isLogin ? 'Sign in to your AgriSense account' : 'Join AgriSense today'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
          {isLogin && (
            <div className="text-right">
              <button
                type="button"
                className="text-sm text-primary-600 hover:text-primary-700"
                onClick={async () => {
                  try {
                    setError('');
                    await resetPassword(email);
                    alert('Password reset email sent (check your inbox).');
                  } catch (e) {
                    setError(e?.message || 'Failed to send reset email');
                  }
                }}
              >
                Forgot password?
              </button>
            </div>
          )}
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={onToggle}
              className="text-primary-600 font-semibold hover:text-primary-700"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LoginForm;
