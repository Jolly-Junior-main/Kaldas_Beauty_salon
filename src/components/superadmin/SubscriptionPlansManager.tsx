/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Super Admin: Subscription Plans & Pricing Configuration
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, cleanUndefined } from '../../lib/firebase';
import { PREDEFINED_SUBSCRIPTION_PLANS, SubscriptionPlan } from '../../types';
import { Sparkles, Edit2, Check, X, ShieldCheck, DollarSign, Clock } from 'lucide-react';

export default function SubscriptionPlansManager() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(PREDEFINED_SUBSCRIPTION_PLANS);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editName, setEditName] = useState<string>('');
  const [editFeatures, setEditFeatures] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'subscriptionPlans'), (snap) => {
      if (!snap.empty) {
        const list: SubscriptionPlan[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as SubscriptionPlan));
        list.sort((a, b) => a.durationMonths - b.durationMonths);
        setPlans(list);
      }
    });
    return () => unsub();
  }, []);

  const handleStartEdit = (plan: SubscriptionPlan) => {
    setEditingPlanId(plan.id);
    setEditPrice(plan.price);
    setEditName(plan.name);
    setEditFeatures((plan.features || []).join('\n'));
  };

  const handleSavePlan = async (planId: string) => {
    setIsSaving(true);
    try {
      const planRef = doc(db, 'subscriptionPlans', planId);
      await updateDoc(planRef, {
        price: Number(editPrice),
        name: editName.trim(),
        features: editFeatures.split('\n').map(s => s.trim()).filter(Boolean)
      });
      setEditingPlanId(null);
    } catch (err) {
      console.error('Failed to update plan:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Subscription Plans & Ethiopian Birr Pricing</h2>
          <p className="text-xs text-neutral-500">Configure global salon subscription packages, rates, and feature entitlements.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isEditing = editingPlanId === plan.id;

          return (
            <div key={plan.id} className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="font-black text-sm text-neutral-900 border border-neutral-300 rounded px-2 py-1"
                      />
                    ) : (
                      <h3 className="text-base font-black text-neutral-900">{plan.name}</h3>
                    )}
                    <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">{plan.durationMonths} Month Duration</span>
                  </div>

                  {!isEditing && (
                    <button
                      onClick={() => handleStartEdit(plan)}
                      className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition-colors cursor-pointer"
                      title="Edit Plan"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-200/60">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Package Price</span>
                  {isEditing ? (
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(Number(e.target.value))}
                        className="w-28 px-2 py-1 text-lg font-black font-mono bg-white border border-neutral-300 rounded-lg"
                      />
                      <span className="font-bold text-xs text-neutral-500">ETB</span>
                    </div>
                  ) : (
                    <p className="text-2xl font-black font-mono text-neutral-950 mt-0.5">
                      {plan.price.toLocaleString()} <span className="text-xs font-sans text-neutral-500">ETB</span>
                    </p>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <span className="text-[10px] uppercase font-black tracking-wider text-neutral-400 block">Included Features</span>
                  {isEditing ? (
                    <textarea
                      rows={4}
                      value={editFeatures}
                      onChange={(e) => setEditFeatures(e.target.value)}
                      placeholder="One feature per line"
                      className="w-full p-2 text-xs border border-neutral-300 rounded-xl font-medium"
                    />
                  ) : (
                    <ul className="space-y-1.5 text-xs text-neutral-600">
                      {(plan.features || []).map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setEditingPlanId(null)}
                    className="px-3 py-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSavePlan(plan.id)}
                    disabled={isSaving}
                    className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
