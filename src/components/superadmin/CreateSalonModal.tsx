/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Super Admin: 4-Step Create New Salon Wizard
 */

import React, { useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db, cleanUndefined, uploadToStorage } from '../../lib/firebase';
import { Organization, SaaSRole, StaffMember } from '../../types';
import { X, Check, Building2, Users, KeyRound, Sparkles, Upload, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';

interface CreateSalonModalProps {
  onClose: () => void;
  onSalonCreated: (org: Organization) => void;
}

export default function CreateSalonModal({ onClose, onSalonCreated }: CreateSalonModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState('');

  // Step 1: Business Information
  const [salonName, setSalonName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Addis Ababa');
  const [country, setCountry] = useState('Ethiopia');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  // Step 2: Staff
  const [numberOfStaff, setNumberOfStaff] = useState<number>(5);
  const [initialStaffList, setInitialStaffList] = useState<Array<{ name: string; role: string; phone: string }>>([
    { name: 'Head Stylist', role: 'STYLIST', phone: '' },
    { name: 'Cashier Desk', role: 'CASHIER', phone: '' }
  ]);

  // Step 3: Owner Authentication Account
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');

  // Step 4: 14-Day Trial & Plan Selection
  const [selectedPlanId, setSelectedPlanId] = useState('plan_1m');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddStaffRow = () => {
    setInitialStaffList([...initialStaffList, { name: '', role: 'STYLIST', phone: '' }]);
  };

  const handleRemoveStaffRow = (index: number) => {
    setInitialStaffList(initialStaffList.filter((_, i) => i !== index));
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorText('');

    try {
      // 1. Upload Logo if provided
      let finalLogoUrl = '';
      if (logoFile) {
        finalLogoUrl = await uploadToStorage('salon_logos', logoFile);
      }

      // 2. Generate Organization Document
      const orgRef = doc(collection(db, 'organizations'));
      const orgId = orgRef.id;
      const now = new Date();
      const trialStartDate = now.toISOString();
      const trialEndDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const newOrg: Organization = {
        id: orgId,
        salonName: salonName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        email: email.trim() || ownerEmail.trim(),
        tinNumber: tinNumber.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim(),
        country: country.trim(),
        logoUrl: finalLogoUrl || undefined,
        status: 'trialing',
        createdAt: now.toISOString(),
        trialStartDate,
        trialEndDate,
        subscriptionStatus: 'trialing',
        planId: selectedPlanId,
        numberOfStaff: Number(numberOfStaff) || initialStaffList.length || 1,
        lastLoginAt: now.toISOString()
      };

      await setDoc(orgRef, cleanUndefined(newOrg));

      // 3. Create Subscription Record
      const subRef = doc(db, 'subscriptions', `sub_${orgId}`);
      await setDoc(subRef, cleanUndefined({
        id: `sub_${orgId}`,
        organizationId: orgId,
        planId: selectedPlanId,
        status: 'trialing',
        billingPeriod: '1_month',
        price: 0,
        startDate: now.toISOString(),
        endDate: trialEndDate,
        trialStartDate,
        trialEndDate,
        autoRenew: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }));

      // 4. Create Owner Profile & Firebase Auth User
      let ownerUid = `usr_${Date.now()}`;
      try {
        if (ownerEmail && ownerPassword) {
          const userCredential = await createUserWithEmailAndPassword(auth, ownerEmail, ownerPassword);
          ownerUid = userCredential.user.uid;
        }
      } catch (authErr) {
        console.warn('Firebase Auth user creation note (or fallback to Firestore profile):', authErr);
      }

      const ownerUserRef = doc(db, 'users', ownerUid);
      await setDoc(ownerUserRef, cleanUndefined({
        uid: ownerUid,
        email: ownerEmail.trim() || email.trim(),
        displayName: ownerName.trim(),
        phone: ownerPhone.trim() || phone.trim(),
        organizationId: orgId,
        role: 'SALON_OWNER',
        status: 'active',
        createdAt: now.toISOString()
      }));

      // 5. Seed Initial Staff Members
      for (const s of initialStaffList) {
        if (s.name.trim()) {
          const staffRef = doc(collection(db, 'staff'));
          const staffMember: StaffMember = {
            id: staffRef.id,
            organizationId: orgId,
            name: s.name.trim(),
            role: (s.role.toLowerCase() as any),
            phone: s.phone.trim() || undefined,
            created_at: now.toISOString()
          };
          await setDoc(staffRef, cleanUndefined(staffMember));
        }
      }

      // 6. Log Activity in Super Admin audit trail
      const actRef = doc(collection(db, 'activityLogs'));
      await setDoc(actRef, cleanUndefined({
        id: actRef.id,
        userId: 'super_admin',
        userName: 'Super Admin',
        organizationId: orgId,
        action: 'CREATED_SALON',
        description: `Created new salon "${salonName}" with 14-day free trial ending ${new Date(trialEndDate).toLocaleDateString()}.`,
        timestamp: now.toISOString()
      }));

      onSalonCreated(newOrg);
      onClose();
    } catch (err: any) {
      console.error('Failed to create salon:', err);
      setErrorText(err.message || 'An error occurred while creating the salon.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto font-sans animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-neutral-200 shadow-2xl overflow-hidden my-8">
        {/* Wizard Header */}
        <div className="p-6 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">Create New Salon Tenant</h3>
              <p className="text-xs text-neutral-400">Step {step} of 4: {step === 1 ? 'Business Info' : step === 2 ? 'Staff Configuration' : step === 3 ? 'Owner Account' : '14-Day Trial Activation'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Progress Bar */}
        <div className="grid grid-cols-4 h-1.5 bg-neutral-100">
          <div className={`h-full transition-all ${step >= 1 ? 'bg-amber-500' : 'bg-neutral-200'}`} />
          <div className={`h-full transition-all ${step >= 2 ? 'bg-amber-500' : 'bg-neutral-200'}`} />
          <div className={`h-full transition-all ${step >= 3 ? 'bg-amber-500' : 'bg-neutral-200'}`} />
          <div className={`h-full transition-all ${step >= 4 ? 'bg-amber-500' : 'bg-neutral-200'}`} />
        </div>

        {/* Wizard Body */}
        <div className="p-6">
          {/* STEP 1: Business Information */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="text-xs font-black uppercase text-neutral-500 tracking-wider">Step 1 — Business Information</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">Salon Name *</label>
                  <input
                    type="text"
                    required
                    value={salonName}
                    onChange={(e) => setSalonName(e.target.value)}
                    placeholder="e.g. Royal Beauty & Spa"
                    className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 font-medium text-neutral-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">Owner Full Name *</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => {
                      setOwnerName(e.target.value);
                      if (!ownerEmail && e.target.value) {
                        setOwnerEmail(`${e.target.value.toLowerCase().replace(/\s+/g, '')}@viavelacrm.com`);
                      }
                    }}
                    placeholder="e.g. Sara Tekle"
                    className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 font-medium text-neutral-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setOwnerPhone(e.target.value);
                    }}
                    placeholder="+251 911 000000"
                    className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 font-mono font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="salon@example.com"
                    className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">TIN Number</label>
                  <input
                    type="text"
                    value={tinNumber}
                    onChange={(e) => setTinNumber(e.target.value)}
                    placeholder="0012345678"
                    className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 font-mono font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">City / Sub-city</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Addis Ababa (Bole)"
                    className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-neutral-700">Address / Location Details</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Atlas Hotel Road, Mall Building 2nd Floor"
                  className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 font-medium"
                />
              </div>

              {/* Logo Upload */}
              <div className="space-y-1 pt-2">
                <label className="block text-[11px] font-bold text-neutral-700">Salon Logo (Optional)</label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo Preview" className="w-14 h-14 rounded-2xl object-cover border border-neutral-200 shadow-xs" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400">
                      <Building2 className="w-6 h-6" />
                    </div>
                  )}
                  <label className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Logo Image</span>
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  disabled={!salonName || !ownerName || !phone}
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  <span>Continue to Staff</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Salon Staff */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="text-xs font-black uppercase text-neutral-500 tracking-wider">Step 2 — Salon Staff & Stylists</h4>
              
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-neutral-700">Expected Number of Staff / Stylists</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={numberOfStaff}
                  onChange={(e) => setNumberOfStaff(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 font-mono font-bold"
                />
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-neutral-700">Initial Staff Member Roles (Optional)</label>
                  <button
                    type="button"
                    onClick={handleAddStaffRow}
                    className="text-[11px] font-bold text-amber-700 hover:underline"
                  >
                    + Add Staff Row
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {initialStaffList.map((stf, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-neutral-50 rounded-xl border border-neutral-200">
                      <input
                        type="text"
                        placeholder="Staff Name"
                        value={stf.name}
                        onChange={(e) => {
                          const updated = [...initialStaffList];
                          updated[index].name = e.target.value;
                          setInitialStaffList(updated);
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-medium"
                      />
                      <select
                        value={stf.role}
                        onChange={(e) => {
                          const updated = [...initialStaffList];
                          updated[index].role = e.target.value;
                          setInitialStaffList(updated);
                        }}
                        className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-bold text-neutral-800"
                      >
                        <option value="STYLIST">Stylist / Artist</option>
                        <option value="CASHIER">Cashier Desk</option>
                        <option value="MANAGER">Manager</option>
                        <option value="RECEPTIONIST">Receptionist</option>
                        <option value="ACCOUNTANT">Accountant</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveStaffRow(index)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <span>Continue to Owner Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Owner Account */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="text-xs font-black uppercase text-neutral-500 tracking-wider">Step 3 — Owner Authentication Account</h4>
              <p className="text-xs text-neutral-600">Create the primary login credentials for the salon owner.</p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">Owner Login Email *</label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@salon.com"
                    className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">Temporary Password *</label>
                  <input
                    type="password"
                    required
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="Min. 6 characters (e.g. SalonPass2026)"
                    className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 font-mono font-medium"
                  />
                  <p className="text-[10px] text-neutral-400">Owner can change their password anytime inside their settings.</p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  disabled={!ownerEmail || !ownerPassword}
                  onClick={() => setStep(4)}
                  className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  <span>Continue to 14-Day Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: 14-Day Free Trial */}
          {step === 4 && (
            <form onSubmit={handleFinalSubmit} className="space-y-5 animate-fade-in">
              <h4 className="text-xs font-black uppercase text-neutral-500 tracking-wider">Step 4 — 14-Day Free Trial Activation</h4>

              <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100/60 rounded-2xl border border-amber-300/80 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  <span>Automatic 14-Day Full Free Trial</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  The salon will receive 14 days of unrestricted access to all Viavela CRM modules starting today.
                  Days remaining will calculate automatically from the live expiration date.
                </p>
                <div className="pt-2 text-xs font-mono font-bold text-amber-950 flex justify-between border-t border-amber-200">
                  <span>Start: {new Date().toLocaleDateString()}</span>
                  <span>Expires: {new Date(Date.now() + 14 * 86400000).toLocaleDateString()}</span>
                </div>
              </div>

              {errorText && (
                <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 font-medium">
                  ⚠️ {errorText}
                </p>
              )}

              <div className="pt-4 flex items-center justify-between border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-8 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer ios-active-scale disabled:opacity-50 flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSaving ? 'Creating Salon...' : 'Activate & Create Salon'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
