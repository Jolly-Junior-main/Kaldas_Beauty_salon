/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Super Admin: Global Payments & Invoices Ledger
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Organization, SaaSOrganizationPayment } from '../../types';
import { CreditCard, Search, Filter, Download, Landmark, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';

interface PaymentsLedgerProps {
  organizations: Organization[];
}

export default function PaymentsLedger({ organizations }: PaymentsLedgerProps) {
  const [payments, setPayments] = useState<SaaSOrganizationPayment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('all');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'payments'), (snap) => {
      const list: SaaSOrganizationPayment[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as SaaSOrganizationPayment));
      list.sort((a, b) => new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime());
      setPayments(list);
    });
    return () => unsub();
  }, []);

  const getOrgName = (orgId: string): string => {
    const match = organizations.find(o => o.id === orgId);
    return match ? match.salonName : orgId;
  };

  const filteredPayments = payments.filter(p => {
    if (providerFilter !== 'all' && p.paymentProvider !== providerFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const orgName = getOrgName(p.organizationId).toLowerCase();
    return (
      orgName.includes(q) ||
      (p.transactionReference || '').toLowerCase().includes(q) ||
      (p.id || '').toLowerCase().includes(q) ||
      (p.paymentProvider || '').toLowerCase().includes(q)
    );
  });

  const totalCollected = filteredPayments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header Summary */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Platform Payments & Invoices Ledger</h2>
          <p className="text-xs text-neutral-500">Live audit log of all subscription payments and renewals from salon tenants.</p>
        </div>

        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-right">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">Total Filtered Revenue</span>
          <span className="text-xl font-black font-mono text-emerald-950">
            {totalCollected.toLocaleString()} <span className="text-xs font-sans text-emerald-700">ETB</span>
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-neutral-200/70 shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Salon Name, Reference, or Payment ID..."
            className="w-full bg-transparent text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none font-medium"
          />
        </div>

        {/* Provider Filter */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-[11px] font-bold text-neutral-600">
          {['all', 'Telebirr', 'CBE Birr', 'M-Pesa', 'Bank Transfer', 'Card'].map((prov) => (
            <button
              key={prov}
              onClick={() => setProviderFilter(prov)}
              className={`px-3 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                providerFilter === prov ? 'bg-white text-neutral-900 shadow-xs font-black' : 'hover:text-neutral-900'
              }`}
            >
              {prov}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/90 border-b border-neutral-200/80 text-[10px] uppercase font-black tracking-wider text-neutral-400">
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4">Salon Organization</th>
                <th className="py-3 px-4">Plan & Period</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount (ETB)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Paid Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <CreditCard className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold">No payment transactions recorded.</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                      {p.transactionReference || p.id.slice(0, 10)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-neutral-800">
                      {getOrgName(p.organizationId)}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-neutral-600">
                      {p.planId?.replace('plan_', '') || '1 Year'} ({p.billingPeriod || '1_year'})
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                        {p.paymentProvider === 'Telebirr' && <Smartphone className="w-3.5 h-3.5 text-amber-500" />}
                        {p.paymentProvider === 'CBE Birr' && <Landmark className="w-3.5 h-3.5 text-purple-600" />}
                        <span>{p.paymentProvider}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black font-mono text-neutral-900">
                      {Number(p.amount).toLocaleString()} ETB
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[9px] font-black uppercase">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-neutral-500">
                      {new Date(p.paidAt || p.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
