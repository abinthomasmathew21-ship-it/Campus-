import React, { useState } from 'react';
import { ShieldCheck, KeyRound, Mail, User, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { BrandLogo } from '../common/BrandLogo';

export const InitialAdminSetup: React.FC = () => {
  const { setupAdmin } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      await setupAdmin({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      });
      showToast('success', 'Setup Complete', 'Super Administrator account created successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete administrator setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-block mb-4">
          <BrandLogo size="lg" showTagline />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-xs font-semibold mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
          <span>Initial System Setup Required</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-neutral-900">
          Create Primary Administrator
        </h2>
        <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
          CampusCare starts with a clean database and zero mock accounts. Set up the first authorized
          Super Administrator to manage campus departments and staff.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-neutral-200 sm:rounded-lg">
          {errorMsg && (
            <div className="mb-5 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <span className="font-semibold">Notice:</span> {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="e.g. Dr. Arthur Vance"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Official Institutional Email <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@college.edu"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Admin Password <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Confirm Password <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-white"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-md shadow-xs disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>{isSubmitting ? 'Configuring System...' : 'Initialize Super Administrator'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-neutral-100 text-center text-[11px] text-neutral-400">
            Once submitted, public admin setup will be permanently locked.
          </div>
        </div>
      </div>
    </div>
  );
};
