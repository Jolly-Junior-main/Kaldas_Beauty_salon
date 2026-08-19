/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Subscription Renewal & Plan Upgrade Modal
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { paymentService } from '../../lib/paymentService';
import { useTenant } from '../../lib/tenantContext';
import { PaymentProvider, PREDEFINED_SUBSCRIPTION_PLANS, SubscriptionPlan } from '../../types';
import { X, Check, Sparkles, ShieldCheck, CreditCard, DollarSign, Smartphone, Landmark, CheckCircle2 } from 'lucide-react';

interface SubscriptionRenewalModalProps {
  onClose: () => void;
  initialPlanId?: string;
}

export default function SubscriptionRenewalModal({ onClose, initialPlanId }: SubscriptionRenewalModalProps) {
  const { currentOrganizationId, currentOrganization } = useTenant();
  const [plans, setPlans] = useState<SubscriptionPlan[]>(PREDEFINED_SUBSCRIPTION_PLANS);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(initialPlanId || 'plan_1y');
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('Telebirr');
  const [phone, setPhone] = useState(currentOrganization?.phone || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorText, setErrorText] = useState('');

  // Load configured plans from Firestore if available
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'subscriptionPlans'), (snap) => {
      if (!snap.empty) {
        const firestorePlans: SubscriptionPlan[] = [];
        snap.forEach(d => firestorePlans.push({ id: d.id, ...d.data() } as SubscriptionPlan));
        firestorePlans.sort((a, b) => a.durationMonths - b.durationMonths);
        setPlans(firestorePlans);
      }
    });

    return () => unsub();
  }, []);

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[0];

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorText('');

    try {
      const transactionRef = `VIA-SUB-${Date.now().toString().slice(-6)}`;
      const success = await paymentService.verifyAndApplySubscription(
        currentOrganizationId,
        selectedPlan,
        selectedPlan.durationMonths === 1 ? '1_month' : selectedPlan.durationMonths === 3 ? '3_months' : selectedPlan.durationMonths === 6 ? '6_months' : selectedPlan.durationMonths === 12 ? '1_year' : '2_years',
        selectedProvider,
        transactionRef
      );

      if (success) {
        setIsSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setErrorText('Payment processing failed. Please try again or contact support.');
      }
    } catch (err: any) {
      setErrorText(err.message || 'An error occurred during checkout.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-neutral-200/80 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">Viavela CRM Subscription & Upgrades</h3>
              <p className="text-xs text-neutral-400">Unlock complete salon intelligence, multi-staff, and zero data limits</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-12 text-center space-y-3 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-black text-neutral-900">Subscription Successfully Activated!</h4>
            <p className="text-xs text-neutral-600">
              Your salon is now on the <span className="font-bold text-neutral-900">{selectedPlan.name}</span> plan. Thank you for partnering with Viavela!
            </p>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="p-6 space-y-6">
            {/* Plan Selector Grid */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-neutral-500 tracking-wider">
                1. Select Subscription Plan
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {plans.map((p) => {
                  const isSelected = selectedPlanId === p.id;
                  const isPopular = p.durationMonths === 12;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlanId(p.id)}
                      className={`relative text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/50 shadow-md ring-2 ring-amber-500/20'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white'
                      }`}
                    >
                      {isPopular && (
                        <span className="absolute -top-2.5 right-3 bg-amber-500 text-neutral-950 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-xs">
                          Best Value
                        </span>
                      )}
                      <h5 className="text-xs font-black text-neutral-900">{p.name}</h5>
                      <p className="text-lg font-black font-mono text-neutral-950 mt-1">
                        {p.price.toLocaleString()} <span className="text-xs font-sans text-neutral-500">ETB</span>
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-1 line-clamp-2">
                        {p.description || `${p.durationMonths} months full access`}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-neutral-500 tracking-wider">
                2. Select Ethiopian Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(['Telebirr', 'CBE Birr', 'M-Pesa', 'Bank Transfer'] as PaymentProvider[]).map((prov) => {
                  const isSelected = selectedProvider === prov;
                  return (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => setSelectedProvider(prov)}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                          : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {prov === 'Telebirr' && <Smartphone className="w-3.5 h-3.5 text-amber-400" />}
                      {prov === 'CBE Birr' && <Landmark className="w-3.5 h-3.5 text-purple-400" />}
                      {prov === 'M-Pesa' && <Smartphone className="w-3.5 h-3.5 text-emerald-400" />}
                      {prov === 'Bank Transfer' && <CreditCard className="w-3.5 h-3.5 text-blue-400" />}
                      <span>{prov}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile/Contact confirmation */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-neutral-700">
                Contact Phone for Receipt & Confirmation
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+251 911 234567"
                className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 font-mono font-medium"
              />
            </div>

            {errorText && (
              <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 font-medium">
                ⚠️ {errorText}
              </p>
            )}

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-between border-t border-neutral-100">
              <div>
                <span className="text-[10px] text-neutral-400 block uppercase font-bold">Total Amount Due</span>
                <span className="text-lg font-black font-mono text-neutral-900">
                  {selectedPlan.price.toLocaleString()} ETB
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer ios-active-scale disabled:opacity-50 flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isProcessing ? 'Processing Payment...' : 'Confirm & Renew'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
