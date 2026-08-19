/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Super Admin: Salon Password Reset & Management Modal
 */

import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db, cleanUndefined } from '../../lib/firebase';
import { Organization } from '../../types';
import { 
  X, 
  KeyRound, 
  ShieldCheck, 
  Check, 
  Copy, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Lock,
  User,
  Sparkles
} from 'lucide-react';

interface ResetPasswordModalProps {
  organization: Organization;
  onClose: () => void;
}

export default function ResetPasswordModal({ organization, onClose }: ResetPasswordModalProps) {
  const [targetAccount, setTargetAccount] = useState<'owner' | 'cashier' | 'all_staff'>('owner');
  const [newPassword, setNewPassword] = useState('Salon123!');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass + '!');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setErrorMessage('Please provide a non-empty password.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const orgId = organization.id;
      const cleanPass = newPassword.trim();

      // 1. Update Owner in `users` collection
      if (targetAccount === 'owner') {
        const userRef = doc(db, 'users', `usr_${orgId}_owner`);
        try {
          await setDoc(userRef, { password: cleanPass, updatedAt: new Date().toISOString() }, { merge: true });
        } catch (e) {}

        const staffRef = doc(db, 'staff', `staff_${orgId}_owner`);
        try {
          await setDoc(staffRef, { password: cleanPass, updatedAt: new Date().toISOString() }, { merge: true });
        } catch (e) {}
      }

      // 2. Update Cashier
      if (targetAccount === 'cashier') {
        const cashierRef = doc(db, 'staff', `staff_${orgId}_cashier`);
        try {
          await setDoc(cashierRef, { password: cleanPass, updatedAt: new Date().toISOString() }, { merge: true });
        } catch (e) {}
      }

      // 3. Update All Staff
      if (targetAccount === 'all_staff') {
        const staffRoles = ['owner', 'cashier', 'walkin', 'inventory', 'assistant'];
        for (const role of staffRoles) {
          const sRef = doc(db, 'staff', `staff_${orgId}_${role}`);
          try {
            await setDoc(sRef, { password: cleanPass, updatedAt: new Date().toISOString() }, { merge: true });
          } catch (e) {}
        }
      }

      setSuccessMessage(`Password successfully updated for ${organization.salonName}!`);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setErrorMessage(err.message || 'Failed to update password.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto font-sans animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full border border-neutral-200 shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black">Reset Salon Credentials</h3>
              <p className="text-xs text-neutral-400">{organization.salonName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSavePassword} className="p-6 space-y-4">
          {/* Target Account Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-700">Select Target Account</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'owner', label: '👑 Owner' },
                { id: 'cashier', label: '💳 Cashier' },
                { id: 'all_staff', label: '👥 All Staff' }
              ].map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setTargetAccount(acc.id as any)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    targetAccount === acc.id
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                      : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          {/* New Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-neutral-700">New Password</label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Generate Strong</span>
              </button>
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-20 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono font-bold text-neutral-900 focus:outline-none focus:border-neutral-900"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-neutral-400 hover:text-neutral-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 text-neutral-400 hover:text-amber-600"
                  title="Copy password"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          {errorMessage && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 font-medium">
              ⚠️ {errorMessage}
            </p>
          )}

          {successMessage && (
            <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-bold flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </p>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSaving ? 'Updating...' : 'Save Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
