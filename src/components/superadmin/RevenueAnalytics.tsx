/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Super Admin: Financial & Revenue Analytics Dashboard
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Advertisement, Organization, SaaSOrganizationPayment } from '../../types';
import { 
  DollarSign, 
  TrendingUp, 
  Layers, 
  Calendar, 
  Sparkles, 
  CreditCard, 
  ArrowUpRight, 
  PieChart, 
  Award,
  Users
} from 'lucide-react';

interface RevenueAnalyticsProps {
  organizations: Organization[];
}

export default function RevenueAnalytics({ organizations }: RevenueAnalyticsProps) {
  const [payments, setPayments] = useState<SaaSOrganizationPayment[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '3m' | '6m' | '1y' | 'all'>('30d');

  useEffect(() => {
    const unsubPay = onSnapshot(collection(db, 'payments'), (snap) => {
      const list: SaaSOrganizationPayment[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as SaaSOrganizationPayment));
      setPayments(list);
    });

    const unsubAds = onSnapshot(collection(db, 'advertisements'), (snap) => {
      const list: Advertisement[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Advertisement));
      setAds(list);
    });

    return () => {
      unsubPay();
      unsubAds();
    };
  }, []);

  // Subscription Plan Price Matrix
  const PLAN_PRICES: Record<string, number> = {
    plan_1m: 3999,
    plan_3m: 9999,
    plan_6m: 29999,
    plan_1y: 39999,
    plan_2y: 72999
  };

  // Compute Financial Metrics
  const paymentsSum = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const activeOrgSubsSum = organizations
    .filter(o => o.subscriptionStatus === 'active')
    .reduce((sum, o) => sum + (PLAN_PRICES[o.planId || 'plan_1y'] || 39999), 0);

  const subscriptionRevenue = paymentsSum > 0 ? Math.max(paymentsSum, activeOrgSubsSum) : activeOrgSubsSum;

  const adRevenue = ads.reduce((sum, ad) => sum + (Number(ad.revenueGenerated) || 0), 0);
  const totalRevenue = subscriptionRevenue + adRevenue;

  // MRR & ARR estimation
  const activePaidOrgs = organizations.filter(o => o.subscriptionStatus === 'active');
  const trialOrgs = organizations.filter(o => o.subscriptionStatus === 'trialing');
  const expiredOrgs = organizations.filter(o => o.subscriptionStatus === 'expired');

  const mrr = activePaidOrgs.reduce((sum, o) => {
    const price = PLAN_PRICES[o.planId || 'plan_1y'] || 39999;
    const months = o.planId === 'plan_1m' ? 1 : o.planId === 'plan_3m' ? 3 : o.planId === 'plan_6m' ? 6 : o.planId === 'plan_1y' ? 12 : 24;
    return sum + Math.round(price / months);
  }, 0);

  const arr = mrr * 12;

  // Trial conversion rate
  const totalEvaluated = activePaidOrgs.length + expiredOrgs.length;
  const conversionRate = totalEvaluated > 0 ? Math.round((activePaidOrgs.length / totalEvaluated) * 100) : 100;

  // Plan Breakdown
  const planCounts: Record<string, number> = {};
  organizations.forEach(o => {
    const p = o.planId || 'plan_1y';
    planCounts[p] = (planCounts[p] || 0) + 1;
  });

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header with Time Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Revenue & Financial Intelligence</h2>
          <p className="text-xs text-neutral-500">Live platform subscription revenue, MRR, ARR, and advertisement yields.</p>
        </div>

        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-xs font-bold text-neutral-600">
          {(['7d', '30d', '3m', '6m', '1y', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded-lg uppercase transition-colors cursor-pointer ${
                timeRange === r ? 'bg-white text-neutral-900 shadow-xs font-black' : 'hover:text-neutral-900'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-white p-5 rounded-3xl border border-amber-300/80 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-amber-900">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Platform Revenue</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black font-mono text-neutral-950">
            {totalRevenue.toLocaleString()} <span className="text-xs font-sans text-neutral-500 font-bold">ETB</span>
          </p>
          <p className="text-[10px] text-amber-800 font-medium">Subscriptions + Ads combined</p>
        </div>

        {/* MRR */}
        <div className="bg-white p-5 rounded-3xl border border-neutral-200/80 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-neutral-500">
            <span className="text-[10px] font-black uppercase tracking-wider">Monthly Recurring Revenue (MRR)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black font-mono text-neutral-900">
            {mrr.toLocaleString()} <span className="text-xs font-sans text-neutral-400 font-bold">ETB/mo</span>
          </p>
          <p className="text-[10px] text-emerald-700 font-bold">ARR Projected: {arr.toLocaleString()} ETB</p>
        </div>

        {/* Subscription Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-neutral-200/80 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-neutral-500">
            <span className="text-[10px] font-black uppercase tracking-wider">Subscription Revenue</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black font-mono text-neutral-900">
            {subscriptionRevenue.toLocaleString()} <span className="text-xs font-sans text-neutral-400 font-bold">ETB</span>
          </p>
          <p className="text-[10px] text-neutral-400">{payments.length} verified transactions</p>
        </div>

        {/* Advertisement Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-neutral-200/80 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-neutral-500">
            <span className="text-[10px] font-black uppercase tracking-wider">Advertisement Revenue</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black font-mono text-neutral-900">
            {adRevenue.toLocaleString()} <span className="text-xs font-sans text-neutral-400 font-bold">ETB</span>
          </p>
          <p className="text-[10px] text-neutral-400">{ads.length} active campaigns</p>
        </div>
      </div>

      {/* Secondary Metrics & Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider">Subscription Plan Distribution</h3>
          <div className="space-y-3">
            {[
              { id: 'plan_1m', label: '1 Month (999 ETB)' },
              { id: 'plan_3m', label: '3 Months (2,999 ETB)' },
              { id: 'plan_6m', label: '6 Months (5,999 ETB)' },
              { id: 'plan_1y', label: '1 Year (9,999 ETB)' },
              { id: 'plan_2y', label: '2 Years (17,999 ETB)' }
            ].map(p => {
              const count = planCounts[p.id] || 0;
              const percent = organizations.length > 0 ? Math.round((count / organizations.length) * 100) : 0;
              return (
                <div key={p.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-neutral-800">
                    <span>{p.label}</span>
                    <span className="font-mono">{count} salons ({percent}%)</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trial-to-Paid Funnel */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider">Conversion & Retention Health</h3>
          
          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/60 space-y-2">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Trial-to-Paid Conversion Rate</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-emerald-600">{conversionRate}%</span>
              <span className="text-xs text-neutral-500 font-bold">of trial salons upgraded</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2.5 bg-neutral-50 rounded-xl">
              <span className="font-medium text-neutral-600">Active Paid Salons:</span>
              <span className="font-bold font-mono text-emerald-700">{activePaidOrgs.length}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-neutral-50 rounded-xl">
              <span className="font-medium text-neutral-600">Active 14-Day Free Trials:</span>
              <span className="font-bold font-mono text-amber-700">{trialOrgs.length}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-neutral-50 rounded-xl">
              <span className="font-medium text-neutral-600">Expired / Pending Renewals:</span>
              <span className="font-bold font-mono text-red-600">{expiredOrgs.length}</span>
            </div>
          </div>
        </div>

        {/* Recent Financial Log */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider">Recent Subscription Inflows</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {payments.slice(0, 5).map(p => (
              <div key={p.id} className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60 flex items-center justify-between text-xs">
                <div>
                  <p className="font-mono font-bold text-neutral-900">+{Number(p.amount).toLocaleString()} ETB</p>
                  <p className="text-[10px] text-neutral-400">{p.paymentProvider} • {new Date(p.paidAt || p.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[9px] font-bold rounded-md">
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
