/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Super Admin: 360° Organization Detail View
 */

import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, query, where, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, cleanUndefined } from '../../lib/firebase';
import { Organization, SaaSOrganizationPayment, SubscriptionPlan, PREDEFINED_SUBSCRIPTION_PLANS } from '../../types';
import { 
  Building2, 
  ArrowLeft, 
  ExternalLink, 
  Sparkles, 
  Clock, 
  ShieldAlert, 
  RotateCcw, 
  CreditCard, 
  Users, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle,
  Plus
} from 'lucide-react';

interface OrganizationDetailViewProps {
  organization: Organization;
  onBack: () => void;
  onOpenCRM: (org: Organization) => void;
}

export default function OrganizationDetailView({ organization, onBack, onOpenCRM }: OrganizationDetailViewProps) {
  const [org, setOrg] = useState<Organization>(organization);
  const [payments, setPayments] = useState<SaaSOrganizationPayment[]>([]);
  const [customerCount, setCustomerCount] = useState<number>(0);
  const [staffCount, setStaffCount] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');

  // Load organization-specific telemetry and payment records
  useEffect(() => {
    async function loadOrgData() {
      try {
        // Payments
        const qPay = query(collection(db, 'payments'), where('organizationId', '==', org.id));
        const paySnap = await getDocs(qPay);
        const payList: SaaSOrganizationPayment[] = [];
        paySnap.forEach(d => payList.push({ id: d.id, ...d.data() } as SaaSOrganizationPayment));
        setPayments(payList);

        // Customers
        const qCust = query(collection(db, 'customers'), where('organizationId', '==', org.id));
        const custSnap = await getDocs(qCust);
        setCustomerCount(custSnap.size);

        // Staff
        const qStaff = query(collection(db, 'staff'), where('organizationId', '==', org.id));
        const staffSnap = await getDocs(qStaff);
        setStaffCount(staffSnap.size);
      } catch (err) {
        console.warn('Error loading org details:', err);
      }
    }
    loadOrgData();
  }, [org.id]);

  // Action: Extend Trial (+N days)
  const handleExtendTrial = async (additionalDays: number) => {
    setIsUpdating(true);
    setActionFeedback('');
    try {
      const currentEnd = new Date(org.trialEndDate).getTime();
      const newEndDate = new Date(Math.max(Date.now(), currentEnd) + additionalDays * 86400000).toISOString();

      await updateDoc(doc(db, 'organizations', org.id), {
        trialEndDate: newEndDate,
        status: 'trialing',
        subscriptionStatus: 'trialing'
      });

      // Update local state
      setOrg({ ...org, trialEndDate: newEndDate, status: 'trialing', subscriptionStatus: 'trialing' });
      setActionFeedback(`Extended trial by +${additionalDays} days successfully.`);
    } catch (err: any) {
      setActionFeedback(`Error extending trial: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Action: Change Status (Suspend / Reactivate)
  const handleToggleStatus = async () => {
    setIsUpdating(true);
    setActionFeedback('');
    const newStatus = org.status === 'suspended' ? 'active' : 'suspended';
    try {
      await updateDoc(doc(db, 'organizations', org.id), { status: newStatus });
      setOrg({ ...org, status: newStatus });
      setActionFeedback(`Salon status updated to ${newStatus}.`);
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Action: Change Plan
  const handleChangePlan = async (newPlanId: string) => {
    setIsUpdating(true);
    setActionFeedback('');
    try {
      await updateDoc(doc(db, 'organizations', org.id), { planId: newPlanId });
      setOrg({ ...org, planId: newPlanId });
      setActionFeedback(`Plan updated to ${newPlanId}.`);
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const daysRemaining = Math.max(0, Math.ceil((new Date(org.trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          {org.logoUrl ? (
            <img src={org.logoUrl} alt={org.salonName} className="w-14 h-14 rounded-2xl object-cover border border-neutral-200" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-800 border border-amber-500/30 flex items-center justify-center font-black text-lg">
              {org.salonName.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-neutral-900">{org.salonName}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                org.status === 'active' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                org.status === 'trialing' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {org.status}
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">Org ID: {org.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenCRM(org)}
            className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer ios-active-scale"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Salon CRM</span>
          </button>

          <button
            onClick={handleToggleStatus}
            disabled={isUpdating}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              org.status === 'suspended'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
            }`}
          >
            {org.status === 'suspended' ? 'Reactivate Salon' : 'Suspend Salon'}
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-semibold text-amber-900">
          ℹ️ {actionFeedback}
        </div>
      )}

      {/* 3-Column 360° Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: Business & Owner Profile */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider">Business & Contact Info</h3>
          
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2 text-neutral-700">
              <Users className="w-4 h-4 text-neutral-400 shrink-0" />
              <div>
                <span className="text-[10px] text-neutral-400 block uppercase font-bold">Owner Name</span>
                <span className="font-bold text-neutral-900">{org.ownerName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-neutral-700">
              <Phone className="w-4 h-4 text-neutral-400 shrink-0" />
              <div>
                <span className="text-[10px] text-neutral-400 block uppercase font-bold">Phone Number</span>
                <span className="font-mono font-bold text-neutral-900">{org.phone}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-neutral-700">
              <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
              <div>
                <span className="text-[10px] text-neutral-400 block uppercase font-bold">Email Address</span>
                <span className="font-medium text-neutral-900">{org.email || 'Not provided'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-neutral-700">
              <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
              <div>
                <span className="text-[10px] text-neutral-400 block uppercase font-bold">Location / Address</span>
                <span className="font-medium text-neutral-900">{org.address ? `${org.address}, ${org.city}` : org.city || 'Addis Ababa'}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100 flex justify-between text-neutral-500">
              <span>TIN Number:</span>
              <span className="font-mono font-bold text-neutral-800">{org.tinNumber || 'None'}</span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>Created Date:</span>
              <span className="font-mono">{new Date(org.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Col 2: Subscription & Trial Management */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider">Subscription & 14-Day Trial</h3>

          <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-amber-800">Trial / Subscription Status</span>
              <span className="text-xs font-black text-amber-900 font-mono">
                {daysRemaining} Days Left
              </span>
            </div>
            <div className="text-xs text-amber-900 space-y-1">
              <p>Start: <span className="font-mono font-bold">{new Date(org.trialStartDate).toLocaleDateString()}</span></p>
              <p>Expires: <span className="font-mono font-bold">{new Date(org.trialEndDate).toLocaleDateString()}</span></p>
            </div>
          </div>

          {/* Quick Trial Extension Controls */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-neutral-700 block">Extend Free Trial</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleExtendTrial(7)}
                disabled={isUpdating}
                className="py-1.5 bg-neutral-100 hover:bg-amber-100 text-neutral-800 hover:text-amber-900 font-bold text-[10px] rounded-xl border border-neutral-200 transition-colors cursor-pointer"
              >
                +7 Days
              </button>
              <button
                onClick={() => handleExtendTrial(14)}
                disabled={isUpdating}
                className="py-1.5 bg-neutral-100 hover:bg-amber-100 text-neutral-800 hover:text-amber-900 font-bold text-[10px] rounded-xl border border-neutral-200 transition-colors cursor-pointer"
              >
                +14 Days
              </button>
              <button
                onClick={() => handleExtendTrial(30)}
                disabled={isUpdating}
                className="py-1.5 bg-neutral-100 hover:bg-amber-100 text-neutral-800 hover:text-amber-900 font-bold text-[10px] rounded-xl border border-neutral-200 transition-colors cursor-pointer"
              >
                +30 Days
              </button>
            </div>
          </div>

          {/* Change Subscription Plan */}
          <div className="space-y-1.5 pt-2 border-t border-neutral-100">
            <span className="text-[11px] font-bold text-neutral-700 block">Assigned Subscription Plan</span>
            <select
              value={org.planId || 'plan_1y'}
              onChange={(e) => handleChangePlan(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none"
            >
              <option value="plan_1m">1 Month (999 ETB)</option>
              <option value="plan_3m">3 Months (2,999 ETB)</option>
              <option value="plan_6m">6 Months (5,999 ETB)</option>
              <option value="plan_1y">1 Year (9,999 ETB)</option>
              <option value="plan_2y">2 Years (17,999 ETB)</option>
            </select>
          </div>
        </div>

        {/* Col 3: CRM Stats & Payment Ledger */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider">Live Salon CRM Telemetry</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">Clients</span>
              <span className="text-lg font-black font-mono text-neutral-900">{customerCount}</span>
            </div>

            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">Staff / Stylists</span>
              <span className="text-lg font-black font-mono text-neutral-900">{staffCount || org.numberOfStaff || 1}</span>
            </div>
          </div>

          {/* Payment History */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-neutral-700">Payment Transactions</span>
              <span className="text-[10px] text-neutral-400 font-mono">{payments.length} record(s)</span>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {payments.length === 0 ? (
                <p className="text-[11px] text-neutral-400 py-3 text-center bg-neutral-50 rounded-xl">No payment records yet.</p>
              ) : (
                payments.map(p => (
                  <div key={p.id} className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/60 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold font-mono text-neutral-900">{p.amount.toLocaleString()} ETB</p>
                      <p className="text-[9px] text-neutral-400">{p.paymentProvider} • {new Date(p.paidAt).toLocaleDateString()}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[9px] font-bold rounded-md">
                      {p.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
