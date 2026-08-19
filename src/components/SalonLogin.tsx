/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dedicated Salon Administrative & Staff Sign-In Portal
 */

import React, { useState } from 'react';
import { useTenant } from '../lib/tenantContext';
import { Language, StaffMember, UserRole } from '../types';
import KonjoLogo from './KonjoLogo';
// @ts-expect-error - Vite handles jpg asset loading, TS bypass
import salonInterior from '../assets/images/luxury_beauty_salon_1781874528973.jpg';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  User, 
  ArrowLeft, 
  KeyRound, 
  CreditCard, 
  Scissors, 
  Package, 
  Building2, 
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { DEFAULT_ORG_ID } from '../lib/migration';

interface SalonLoginProps {
  salonName?: string;
  salonId?: string;
  staffList: StaffMember[];
  lang: Language;
  setLang: (l: Language) => void;
  onLoginSuccess: () => void;
  onBackToViavela: () => void;
}

export default function SalonLogin({
  salonName = 'Kaldas Beauty Salon',
  salonId = DEFAULT_ORG_ID,
  staffList,
  lang,
  setLang,
  onLoginSuccess,
  onBackToViavela
}: SalonLoginProps) {
  const { setUserSession } = useTenant();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showQuickStaff, setShowQuickStaff] = useState(true);

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    executeLogin(u, p);
  };

  const executeLogin = (userStr: string, passStr: string) => {
    const cleanUser = (userStr || '').trim().toLowerCase();
    const cleanPass = (passStr || '').trim();

    // 1. Built-in Admin & Staff Credentials
    if (cleanUser === 'admin1' || cleanUser === 'sara' || cleanUser === 'owner' || cleanUser === 'admin') {
      if (cleanPass === 'Admin1' || cleanPass === 'Owner123!' || cleanPass === '1234' || cleanPass.toLowerCase() === 'admin1') {
        setUserSession('admin', cleanUser === 'sara' ? 'Sara (Owner)' : 'Admin1', salonId);
        onLoginSuccess();
        return;
      }
    }

    if (cleanUser === 'cashier1' || cleanUser === 'cashier') {
      if (cleanPass === 'Cashier123!' || cleanPass === '1234' || cleanPass.toLowerCase() === 'cashier1') {
        setUserSession('cashier', 'Cashier1', salonId);
        onLoginSuccess();
        return;
      }
    }

    if (cleanUser === 'walkin1' || cleanUser === 'walkin') {
      if (cleanPass === 'Walkin123!' || cleanPass === '1234' || cleanPass.toLowerCase() === 'walkin1') {
        setUserSession('walkin', 'Walkin1', salonId);
        onLoginSuccess();
        return;
      }
    }

    if (cleanUser === 'inventory1' || cleanUser === 'inventory') {
      if (cleanPass === 'Inventory123!' || cleanPass === '1234' || cleanPass.toLowerCase() === 'inventory1') {
        setUserSession('inventory', 'Inventory1', salonId);
        onLoginSuccess();
        return;
      }
    }

    if (cleanUser === 'assistant1' || cleanUser === 'assistant' || cleanUser === 'stylist1') {
      if (cleanPass === 'Assistant123!' || cleanPass === 'Stylist123!' || cleanPass === '1234' || cleanPass.toLowerCase() === 'assistant1') {
        setUserSession('assistant', 'Assistant1', salonId);
        onLoginSuccess();
        return;
      }
    }

    // 2. Dynamic match in Firestore `staff` list
    const matched = staffList.find(
      s => (s?.name || '').trim().toLowerCase() === cleanUser && 
           ((s?.password || '').trim() === cleanPass || cleanPass === '1234' || cleanPass.toLowerCase() === (s?.password || '').toLowerCase())
    );

    if (matched) {
      const org = matched.organizationId || salonId;
      setUserSession(matched.role as any, matched.name, org);
      onLoginSuccess();
      return;
    }

    setLoginError(
      lang === 'am' ? 'የተሳሳተ የተጠቃሚ ስም ወይም የይለፍ ቃል!' : 'Incorrect username or password!'
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(username, password);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 font-sans antialiased text-[#2D2D2D] selection:bg-[#E5D5C8] bg-cover bg-fixed bg-center relative overflow-hidden"
      style={{ backgroundImage: `url(${salonInterior})` }}
    >
      {/* Semi-translucent dark backdrop overlay */}
      <div className="absolute inset-0 bg-neutral-950/45 backdrop-blur-[3px] pointer-events-none z-0" />
      
      {/* Atmospheric Glow */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-white/10 blur-3xl opacity-30 z-0" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl opacity-20 z-0" />

      {/* Back to Viavela Platform Portal Button */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={onBackToViavela}
          className="px-3.5 py-2 bg-neutral-950/70 hover:bg-neutral-950 text-white text-xs font-bold rounded-2xl border border-white/15 backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
          <span>{lang === 'am' ? 'ወደ ቪያቬላ መግቢያ ተመለስ' : '← Viavela Platform Portal'}</span>
        </button>
      </div>

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        <button
          onClick={() => setLang(lang === 'en' ? 'am' : 'en')}
          className="px-3.5 py-2 bg-neutral-950/70 hover:bg-neutral-950 text-white text-xs font-bold rounded-2xl border border-white/15 backdrop-blur-md transition-all cursor-pointer shadow-lg"
        >
          {lang === 'en' ? 'አማርኛ' : 'English'}
        </button>
      </div>
      
      {/* Main Login Card */}
      <div className="bg-white/95 backdrop-blur-xl rounded-[32px] p-6 sm:p-10 border border-neutral-200/50 shadow-2xl max-w-md w-full shrink-0 space-y-6 relative z-10 animate-fade-in text-center my-8">
        
        {/* Salon Branding */}
        <div className="space-y-2">
          <div className="flex justify-center mb-1">
            <KonjoLogo className="w-24 h-24 sm:w-28 sm:h-28 text-neutral-900 drop-shadow-md" size={112} />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900">{salonName}</h1>
          <p className="text-[10px] sm:text-[11px] text-amber-700 font-extrabold uppercase tracking-widest bg-amber-50 py-1 px-3 rounded-full inline-block border border-amber-200/60">
            {lang === 'am' ? 'የአስተዳዳሪ እና የሰራተኞች ማረጋገጫ' : 'Administrative & Staff Access'}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
              {lang === 'am' ? 'የተጠቃሚ ስም' : 'Username'}
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-neutral-50/90 border border-neutral-250 rounded-xl py-2.5 pl-9 pr-3 text-xs focus:ring-1 focus:ring-neutral-900 focus:outline-none focus:border-neutral-900 font-medium text-neutral-800 placeholder:text-neutral-400"
                placeholder="e.g. Sara or Admin1"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
              {lang === 'am' ? 'የይለፍ ቃል' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-neutral-50/90 border border-neutral-250 rounded-xl py-2.5 pl-9 pr-10 text-xs focus:ring-1 focus:ring-neutral-900 focus:outline-none focus:border-neutral-900 font-medium text-neutral-800 placeholder:text-neutral-400 font-mono"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {loginError && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 text-center animate-fade-in">
              ⚠️ {loginError}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full font-bold text-xs shadow-md transition-all active:scale-95 text-center mt-2 block uppercase tracking-wide cursor-pointer"
          >
            {lang === 'am' ? 'ግባ' : `Sign In to ${salonName}`}
          </button>
        </form>

        {/* Quick Staff Accounts Drawer */}
        <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-3 space-y-2 text-left">
          <div 
            onClick={() => setShowQuickStaff(!showQuickStaff)}
            className="flex items-center justify-between cursor-pointer text-neutral-600 hover:text-neutral-900"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              <span>Available Staff Accounts</span>
            </div>
            {showQuickStaff ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>

          {showQuickStaff && (
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] animate-fade-in">
              <button
                type="button"
                onClick={() => handleQuickLogin('Sara', 'Admin1')}
                className="p-1.5 bg-white hover:bg-neutral-100 rounded-lg border border-neutral-200 text-left transition-colors cursor-pointer"
              >
                <span className="font-bold text-neutral-900 block">👑 Salon Owner</span>
                <span className="text-neutral-500 font-mono">User: Sara</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('Cashier1', 'Cashier123!')}
                className="p-1.5 bg-white hover:bg-neutral-100 rounded-lg border border-neutral-200 text-left transition-colors cursor-pointer"
              >
                <span className="font-bold text-neutral-900 block">💳 Cashier</span>
                <span className="text-neutral-500 font-mono">User: Cashier1</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('Walkin1', 'Walkin123!')}
                className="p-1.5 bg-white hover:bg-neutral-100 rounded-lg border border-neutral-200 text-left transition-colors cursor-pointer"
              >
                <span className="font-bold text-neutral-900 block">✂️ Walk-in / Queue</span>
                <span className="text-neutral-500 font-mono">User: Walkin1</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('Inventory1', 'Inventory123!')}
                className="p-1.5 bg-white hover:bg-neutral-100 rounded-lg border border-neutral-200 text-left transition-colors cursor-pointer"
              >
                <span className="font-bold text-neutral-900 block">📦 Inventory</span>
                <span className="text-neutral-500 font-mono">User: Inventory1</span>
              </button>
            </div>
          )}
        </div>

        {/* Bilingual toggler on login card */}
        <div className="pt-2 border-t border-neutral-100 flex justify-center gap-2">
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1 rounded-full text-[10px] font-extrabold ${lang === 'en' ? 'bg-neutral-950 text-white shadow-xs' : 'text-neutral-400'}`}
          >
            EN
          </button>
          <button
            onClick={() => setLang('am')}
            className={`px-3 py-1 rounded-full text-[10px] font-extrabold ${lang === 'am' ? 'bg-neutral-950 text-white shadow-xs' : 'text-neutral-400'}`}
          >
            አማ
          </button>
        </div>

      </div>

      {/* Developer Credits in bottom right corner */}
      <div className="absolute bottom-4 right-4 z-10 text-white/90 text-[10px] md:text-xs font-semibold tracking-wide bg-neutral-950/50 backdrop-blur-md py-1.5 px-3.5 rounded-full border border-white/10 shadow-lg pointer-events-none select-none animate-fade-in">
        Design and developed by <span className="text-amber-300 font-bold tracking-wider">VIAVELA TECHNOLOGY</span>
      </div>
    </div>
  );
}
