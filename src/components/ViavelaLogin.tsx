/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Professional Multi-Tenant SaaS Authentication Portal
 */

import React, { useState } from 'react';
import { useTenant } from '../lib/tenantContext';
import { StaffMember } from '../types';
import { Sparkles, Building2, ShieldCheck, Lock, User, KeyRound, Globe } from 'lucide-react';
import { DEFAULT_ORG_ID } from '../lib/migration';

interface ViavelaLoginProps {
  staffList: StaffMember[];
  lang: 'en' | 'am';
  setLang: (l: 'en' | 'am') => void;
  onLoginSuccess: () => void;
}

export default function ViavelaLogin({ staffList, lang, setLang, onLoginSuccess }: ViavelaLoginProps) {
  const { setUserSession } = useTenant();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    // 1. Super Admin Authentication Master Check
    if (
      (cleanUser === 'admin1' && (cleanPass === 'Admin1' || cleanPass === 'admin1')) ||
      (cleanUser === 'admin@viavelacrm.com' && cleanPass === 'Admin123!') ||
      (cleanUser === 'superadmin' && cleanPass === 'SuperAdmin123!')
    ) {
      setUserSession('SUPER_ADMIN', 'Super Admin', null);
      setIsLoggingIn(false);
      onLoginSuccess();
      return;
    }

    // 2. Salon Staff & Stylist Login matching
    const matched = staffList.find(
      s => (s?.name || '').trim().toLowerCase() === cleanUser && s.password === cleanPass
    );

    if (matched) {
      const orgId = matched.organizationId || DEFAULT_ORG_ID;
      setUserSession(matched.role as any, matched.name, orgId);
      setIsLoggingIn(false);
      onLoginSuccess();
    } else {
      setIsLoggingIn(false);
      setLoginError(
        lang === 'am'
          ? 'የተሳሳተ የተጠቃሚ ስም ወይም የይለፍ ቃል!'
          : 'Incorrect username or password!'
      );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Ambience Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 flex items-center gap-2 z-10">
        <button
          onClick={() => setLang(lang === 'en' ? 'am' : 'en')}
          className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold rounded-xl border border-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          <span>{lang === 'en' ? 'አማርኛ' : 'English'}</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-3xl p-8 shadow-2xl space-y-6 relative z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-500 text-neutral-950 rounded-2xl flex items-center justify-center mx-auto shadow-md font-black text-2xl">
            V
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Viavela CRM</h1>
          <p className="text-xs text-neutral-400 font-medium">
            {lang === 'am'
              ? 'የሳሎን ማኔጅመንት እና የደንበኞች ክትትል ሲስተም'
              : 'Multi-Tenant Beauty Salon Operating System'}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-neutral-300">
              {lang === 'am' ? 'የተጠቃሚ ስም / ኢሜይል' : 'Username or Email'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={lang === 'am' ? 'የተጠቃሚ ስም ያስገቡ' : 'e.g. Sara or Admin1'}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-medium transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-neutral-300">
              {lang === 'am' ? 'የይለፍ ቃል' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono font-medium transition-colors"
              />
            </div>
          </div>

          {loginError && (
            <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-red-300 text-xs font-medium text-center">
              ⚠️ {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer ios-active-scale disabled:opacity-50 mt-2"
          >
            {isLoggingIn
              ? (lang === 'am' ? 'እየገባ ነው...' : 'Authenticating...')
              : (lang === 'am' ? 'ግባ' : 'Sign In to Viavela')}
          </button>
        </form>

        {/* Footer info */}
        <div className="pt-4 border-t border-neutral-800 text-center">
          <p className="text-[11px] text-neutral-500">
            Powered by <span className="font-bold text-neutral-400">Viavela Cloud</span> • All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}
