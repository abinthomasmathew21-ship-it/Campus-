import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, KeyRound, Building2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { BrandLogo } from '../common/BrandLogo';
import { api } from '../../services/api';
import { Department } from '../../types';

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [departments, setDepartments] = useState<Department[]>([]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Fetch registered departments for student registration dropdown
    api.getDepartments().then((res) => {
      if (res.success) {
        setDepartments(res.departments.filter((d) => d.is_active === 1));
      }
    }).catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      await login({ email: loginEmail.trim(), password: loginPassword });
      showToast('success', 'Welcome', 'Signed in successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim() || !regEmail.trim() || !studentId.trim() || !regPassword) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await register({
        full_name: fullName.trim(),
        email: regEmail.trim(),
        student_id: studentId.trim(),
        department_id: selectedDept ? Number(selectedDept) : null,
        password: regPassword,
        confirmPassword: regConfirmPassword,
      });
      showToast('success', 'Registered', 'Student account created successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-block mb-3">
          <BrandLogo size="lg" showTagline />
        </div>
        <p className="text-xs text-neutral-500 max-w-xs mx-auto">
          Centralized college issue reporting, resolution workflow, and accountability tracking.
        </p>

        {/* Tab switcher */}
        <div className="mt-6 flex p-1 bg-neutral-200/70 rounded-lg max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === 'login' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === 'register' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Student Register
          </button>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-7 px-6 shadow-xs border border-neutral-200 sm:rounded-lg">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMsg}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Institutional Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="student@college.edu or staff@college.edu"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md shadow-xs disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-3 text-center text-[11px] text-neutral-500">
                <span>Are you a student without an account? </span>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="font-semibold text-orange-600 hover:underline inline-block"
                >
                  Register here
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Full Name <span className="text-orange-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Maya Chen"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  College Email <span className="text-orange-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="maya.chen@college.edu"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Student Roll / ID <span className="text-orange-600">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. STU-2026-890"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white uppercase font-tabular"
                  />
                </div>
              </div>

              {departments.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Department (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <select
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                    >
                      <option value="">Select Department (Optional)</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Password <span className="text-orange-600">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Confirm <span className="text-orange-600">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md shadow-xs disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>{loading ? 'Creating Account...' : 'Register as Student'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-3 text-center text-[11px] text-neutral-500">
                <span>Already registered? </span>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-semibold text-orange-600 hover:underline inline-block"
                >
                  Sign in to your account
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
