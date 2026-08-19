/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Multi-Tenant SaaS Platform Gateway & Portal
 */

import React, { useState } from 'react';
import { useTenant } from '../lib/tenantContext';
import { StaffMember, Organization } from '../types';
import { 
  Sparkles, 
  Building2, 
  ShieldCheck, 
  Lock, 
  User, 
  KeyRound, 
  Globe, 
  Eye, 
  EyeOff, 
  ArrowRight,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { DEFAULT_ORG_ID } from '../lib/migration';

interface ViavelaLoginProps {
  staffList: StaffMember[];
  organizations?: Organization[];
  lang: 'en' | 'am';
  setLang: (l: 'en' | 'am') => void;
  onLoginSuccess: () => void;
  onOpenSalonLogin: (salonId: string, salonName: string) => void;
}

export default function ViavelaLogin({ 
  staffList, 
  organizations = [],
  lang, 
  setLang, 
  onLoginSuccess,
  onOpenSalonLogin
}: ViavelaLoginProps) {
  const { setUserSession } = useTenant();
  const [authMode, setAuthMode] = useState<'superadmin' | 'salons'>('superadmin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSuperAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    // 1. Super Admin Platform Master Authentication
    if (
      (cleanUser === 'admin1' && (cleanPass.toLowerCase() === 'admin1')) ||
      (cleanUser === 'admin@viavelacrm.com' && cleanPass === 'Admin123!') ||
      (cleanUser === 'superadmin' && cleanPass === 'SuperAdmin123!')
    ) {
      setUserSession('SUPER_ADMIN', 'Super Admin', null);
      setIsLoggingIn(false);
      onLoginSuccess();
      return;
    }

    // If they typed salon credentials (e.g. Sara, Kaldas), transition to Kaldas Beauty Salon Login Section
    if (cleanUser === 'sara' || cleanUser === 'kaldas' || cleanUser === 'owner' || cleanUser.includes('kaldas')) {
      setIsLoggingIn(false);
      onOpenSalonLogin(DEFAULT_ORG_ID, 'Kaldas Beauty Salon');
      return;
    }

    // Check if matching any other salon
    const matchedOrg = organizations.find(
      o => o.salonName?.toLowerCase().includes(cleanUser) || o.id === cleanUser || o.ownerName?.toLowerCase().includes(cleanUser)
    );
    if (matchedOrg) {
      setIsLoggingIn(false);
      onOpenSalonLogin(matchedOrg.id, matchedOrg.salonName);
      return;
    }

    setIsLoggingIn(false);
    setLoginError(
      lang === 'am'
        ? 'የተሳሳተ የሱፐር አድሚን ተጠቃሚ ስም ወይም የይለፍ ቃል!'
        : 'Incorrect Super Admin username or password!'
    );
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Ambient Lighting */}
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

      {/* Main Container */}
      <div className="w-full max-w-md bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative z-10 animate-fade-in my-8">
        
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

        {/* Portal Mode Tabs */}
        <div className="grid grid-cols-2 p-1 bg-neutral-950 rounded-2xl border border-neutral-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setAuthMode('superadmin')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'superadmin' 
                ? 'bg-amber-500 text-neutral-950 shadow-md font-black' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Super Admin</span>
          </button>

          <button
            type="button"
            onClick={() => setAuthMode('salons')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'salons' 
                ? 'bg-amber-500 text-neutral-950 shadow-md font-black' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Salons Portal</span>
          </button>
        </div>

        {/* TAB 1: Super Admin Direct Sign-In */}
        {authMode === 'superadmin' && (
          <form onSubmit={handleSuperAdminSubmit} className="space-y-4 animate-fade-in">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-neutral-300">
                {lang === 'am' ? 'የሱፐር አድሚን ተጠቃሚ ስም' : 'Super Admin Username'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Admin1"
                  className="w-full pl-10 pr-4 py-2.5 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-medium transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-neutral-300">
                {lang === 'am' ? 'የይለፍ ቃል' : 'Super Admin Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono font-medium transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 p-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-red-300 text-xs font-medium text-center animate-fade-in">
                ⚠️ {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer ios-active-scale disabled:opacity-50 mt-1 flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isLoggingIn ? 'Authenticating...' : 'Sign In as Super Admin'}</span>
            </button>

            {/* Quick Helper for Super Admin */}
            <div className="p-2.5 bg-neutral-950/60 rounded-xl border border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-400 block">Super Admin Credentials</span>
                <span className="font-mono text-[10px] text-neutral-500">Username: <b>Admin1</b> | Password: <b>Admin1</b></span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUsername('Admin1');
                  setPassword('Admin1');
                  setUserSession('SUPER_ADMIN', 'Super Admin', null);
                  onLoginSuccess();
                }}
                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold rounded-lg text-[10px] cursor-pointer"
              >
                1-Click Sign In
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: Salon Dedicated Portals Gateway */}
        {authMode === 'salons' && (
          <div className="space-y-3.5 animate-fade-in">
            <p className="text-xs text-neutral-300 font-medium">
              Select a beauty salon to open its dedicated administrative and staff sign-in section:
            </p>

            {/* Kaldas Beauty Salon Primary Gateway Card */}
            <div 
              onClick={() => onOpenSalonLogin(DEFAULT_ORG_ID, 'Kaldas Beauty Salon')}
              className="p-4 bg-gradient-to-r from-neutral-900 via-neutral-850 to-neutral-900 hover:from-neutral-800 hover:to-neutral-800 border-2 border-amber-500/50 hover:border-amber-400 rounded-2xl cursor-pointer transition-all shadow-md group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black text-base shadow-xs shrink-0">
                  K
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                      Kaldas Beauty Salon
                    </h3>
                    <span className="text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                      Flagship
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 font-medium">
                    Owner: Sara Tekle • 1-Year Active Subscription
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>

            {/* Other Registered Salons (if created) */}
            {organizations.filter(o => o.id !== DEFAULT_ORG_ID).length > 0 && (
              <div className="space-y-2 pt-2 border-t border-neutral-800 max-h-48 overflow-y-auto pr-1">
                <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
                  Other Registered Salons
                </span>
                {organizations.filter(o => o.id !== DEFAULT_ORG_ID).map(org => (
                  <div
                    key={org.id}
                    onClick={() => onOpenSalonLogin(org.id, org.salonName)}
                    className="p-3 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 rounded-xl cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-neutral-800 text-white flex items-center justify-center font-bold text-xs">
                        {org.salonName ? org.salonName[0].toUpperCase() : 'S'}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{org.salonName}</h4>
                        <p className="text-[10px] text-neutral-500">{org.ownerName} • {org.city}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="pt-2 border-t border-neutral-800 text-center">
          <p className="text-[11px] text-neutral-500">
            Powered by <span className="font-bold text-neutral-400">Viavela Cloud</span> • All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}
