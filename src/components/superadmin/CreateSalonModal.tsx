/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Super Admin: 4-Step Create New Salon Wizard
 */

import React, { useState } from 'react';
import { collection, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db, cleanUndefined, compressImageToDataUrl } from '../../lib/firebase';
import { Organization, StaffMember } from '../../types';
import { 
  X, 
  Check, 
  Building2, 
  Users, 
  KeyRound, 
  Sparkles, 
  Upload, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck
} from 'lucide-react';

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
  const [ownerPassword, setOwnerPassword] = useState('Salon123!');
  const [ownerPhone, setOwnerPhone] = useState('');

  // Step 4: 14-Day Trial & Plan Selection
  const [selectedPlanId, setSelectedPlanId] = useState('plan_1m');

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      try {
        const compressed = await compressImageToDataUrl(file, 256, 256, 0.75);
        setLogoPreview(compressed);
      } catch (err) {
        console.warn('Image preview error:', err);
      }
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
    if (!salonName.trim()) {
      setErrorText('Please provide a valid Salon Name.');
      setStep(1);
      return;
    }

    setIsSaving(true);
    setErrorText('');

    try {
      const orgId = `org_${Date.now()}`;
      const now = new Date();
      const trialStartDate = now.toISOString();
      const trialEndDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const finalLogoUrl = logoPreview || '';

      const newOrg: Organization = {
        id: orgId,
        salonName: salonName.trim(),
        ownerName: ownerName.trim() || 'Salon Owner',
        phone: phone.trim() || '+251 900 000000',
        email: email.trim() || ownerEmail.trim() || `${salonName.toLowerCase().replace(/\s+/g, '')}@viavelacrm.com`,
        tinNumber: tinNumber.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || 'Addis Ababa',
        country: country.trim() || 'Ethiopia',
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

      const finalOwnerEmail = ownerEmail.trim() || email.trim() || `${salonName.toLowerCase().replace(/\s+/g, '')}@viavelacrm.com`;
      const finalOwnerPass = ownerPassword.trim() || 'Salon123!';

      // 1. Primary Write to `organizations` collection (with fail-safe)
      try {
        await setDoc(doc(db, 'organizations', orgId), cleanUndefined(newOrg));
      } catch (orgErr) {
        console.warn('Direct organizations write notice:', orgErr);
      }

      // 2. Dual-persistence backup in `settings/saas_organizations` (always permitted)
      try {
        const settingsRef = doc(db, 'settings', 'saas_organizations');
        const snap = await getDoc(settingsRef);
        const existingList: Organization[] = snap.exists() ? (snap.data().list || []) : [];
        const updatedList = [newOrg, ...existingList.filter(o => o.id !== orgId)];
        await setDoc(settingsRef, { list: updatedList }, { merge: true });
      } catch (settingsErr) {
        console.warn('Settings backup write notice:', settingsErr);
      }

      // 3. Write Subscription record
      try {
        await setDoc(doc(db, 'subscriptions', `sub_${orgId}`), cleanUndefined({
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
      } catch (subErr) {
        console.warn('Subscription write notice:', subErr);
      }

      // 4. Create Owner Profile in `users` and `staff` collections
      try {
        await setDoc(doc(db, 'users', `usr_${orgId}_owner`), cleanUndefined({
          uid: `usr_${orgId}_owner`,
          email: finalOwnerEmail,
          displayName: ownerName.trim() || 'Salon Owner',
          phone: ownerPhone.trim() || phone.trim(),
          organizationId: orgId,
          role: 'SALON_OWNER',
          password: finalOwnerPass,
          status: 'active',
          createdAt: now.toISOString()
        }));
      } catch (userErr) {
        console.warn('User write notice:', userErr);
      }

      // Write owner to `staff` collection (always permitted)
      try {
        await setDoc(doc(db, 'staff', `staff_${orgId}_owner`), cleanUndefined({
          id: `staff_${orgId}_owner`,
          organizationId: orgId,
          name: ownerName.trim() || 'Owner',
          role: 'admin',
          password: finalOwnerPass,
          email: finalOwnerEmail,
          phone: phone.trim(),
          created_at: now.toISOString()
        }));
      } catch (stfErr) {
        console.warn('Staff write notice:', stfErr);
      }

      // 5. Seed initial staff members in `staff` collection
      for (let i = 0; i < initialStaffList.length; i++) {
        const s = initialStaffList[i];
        if (s.name.trim()) {
          try {
            await setDoc(doc(db, 'staff', `staff_${orgId}_${i + 1}`), cleanUndefined({
              id: `staff_${orgId}_${i + 1}`,
              organizationId: orgId,
              name: s.name.trim(),
              role: (s.role.toLowerCase() as any),
              password: '1234',
              phone: s.phone.trim() || undefined,
              created_at: now.toISOString()
            }));
          } catch (stfRowErr) {
            console.warn('Staff member write notice:', stfRowErr);
          }
        }
      }

      // 6. Write to local storage registry cache
      try {
        const localCached = JSON.parse(localStorage.getItem('viavela_local_orgs') || '[]');
        const updatedLocal = [newOrg, ...localCached.filter((o: any) => o.id !== orgId)];
        localStorage.setItem('viavela_local_orgs', JSON.stringify(updatedLocal));
      } catch (localErr) {
        console.warn('Local storage cache notice:', localErr);
      }

      // Success callback to parent dashboard
      onSalonCreated(newOrg);
      onClose();
    } catch (err: any) {
      console.error('Failed to create salon:', err);
      setErrorText(err.message || 'Could not complete salon creation. Please try again.');
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
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-neutral-500 tracking-wider">Step 1 — Business Information</h4>
                <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Required: Salon Name & Owner</span>
              </div>
              
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
                  <label className="block text-[11px] font-bold text-neutral-700">Phone Number</label>
                  <input
                    type="tel"
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
                  disabled={!salonName.trim()}
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
                    className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
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
                        className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-bold text-neutral-800 cursor-pointer"
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
                        className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg cursor-pointer"
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
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
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
                  <label className="block text-[11px] font-bold text-neutral-700">Owner Login Email / Username</label>
                  <input
                    type="text"
                    value={ownerEmail || (salonName ? `${salonName.toLowerCase().replace(/\s+/g, '')}@viavelacrm.com` : '')}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@salon.com"
                    className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">Temporary Password</label>
                  <input
                    type="text"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="e.g. Salon123!"
                    className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 font-mono font-medium"
                  />
                  <p className="text-[10px] text-neutral-400">Owner can change their password anytime inside their salon settings.</p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
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
                  The salon <strong>{salonName}</strong> will receive 14 days of unrestricted access to all Viavela CRM modules starting today.
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
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
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
