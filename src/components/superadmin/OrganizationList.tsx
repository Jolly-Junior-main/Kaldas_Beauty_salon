/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Super Admin: Organizations & Salons Directory
 */

import React, { useState } from 'react';
import { Organization } from '../../types';
import { 
  Building2, 
  Search, 
  Filter, 
  ExternalLink, 
  MoreVertical, 
  Eye, 
  Edit3, 
  Sparkles, 
  ShieldAlert, 
  RotateCcw, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  UserCheck,
  KeyRound,
  Plus
} from 'lucide-react';

interface OrganizationListProps {
  organizations: Organization[];
  onSelectOrg: (org: Organization) => void;
  onOpenCRM: (org: Organization) => void;
  onManageSub: (org: Organization) => void;
  onResetPassword?: (org: Organization) => void;
  onSuspend: (org: Organization) => void;
  onReactivate: (org: Organization) => void;
  onDelete: (org: Organization) => void;
  onCreateNew: () => void;
}

export default function OrganizationList({
  organizations,
  onSelectOrg,
  onOpenCRM,
  onManageSub,
  onResetPassword,
  onSuspend,
  onReactivate,
  onDelete,
  onCreateNew
}: OrganizationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'trial' | 'active' | 'expiring_soon' | 'expired' | 'suspended'>('all');
  const [activeMenuOrgId, setActiveMenuOrgId] = useState<string | null>(null);

  // Dynamic days remaining calculator
  const getDaysRemaining = (org: Organization): number => {
    const targetDate = org.subscriptionStatus === 'trialing' ? org.trialEndDate : org.trialEndDate;
    if (!targetDate) return 0;
    const diff = new Date(targetDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // Filtered & Searched Salons
  const filteredOrgs = organizations.filter((org) => {
    const daysLeft = getDaysRemaining(org);

    // Status filter
    if (statusFilter === 'trial' && org.subscriptionStatus !== 'trialing') return false;
    if (statusFilter === 'active' && org.subscriptionStatus !== 'active') return false;
    if (statusFilter === 'expired' && org.subscriptionStatus !== 'expired' && daysLeft > 0) return false;
    if (statusFilter === 'expiring_soon' && (daysLeft > 7 || daysLeft === 0)) return false;
    if (statusFilter === 'suspended' && org.status !== 'suspended') return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (org.salonName || '').toLowerCase().includes(q) ||
      (org.ownerName || '').toLowerCase().includes(q) ||
      (org.phone || '').includes(q) ||
      (org.tinNumber || '').toLowerCase().includes(q) ||
      (org.id || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Action Header & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-neutral-200/70 shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Salon, Owner, Phone, TIN, or ID..."
            className="w-full bg-transparent text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter Selector */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-[11px] font-bold text-neutral-600">
            {(['all', 'trial', 'active', 'expiring_soon', 'expired', 'suspended'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-neutral-900 shadow-xs font-black'
                    : 'hover:text-neutral-900'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ios-active-scale"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create New Salon</span>
          </button>
        </div>
      </div>

      {/* Salons Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50/90 border-b border-neutral-200/80 text-[10px] uppercase font-black tracking-wider text-neutral-400">
                <th className="py-3 px-4">Salon / Brand</th>
                <th className="py-3 px-4">Owner & Phone</th>
                <th className="py-3 px-4">TIN / Org ID</th>
                <th className="py-3 px-4">Plan / Status</th>
                <th className="py-3 px-4">Expiry / Days Left</th>
                <th className="py-3 px-4 text-center">Staff</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <Building2 className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold">No salons match the selected filters or query.</p>
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => {
                  const daysRemaining = getDaysRemaining(org);
                  const isSuspended = org.status === 'suspended';
                  const isTrial = org.subscriptionStatus === 'trialing';
                  const isExpired = org.subscriptionStatus === 'expired' || (isTrial && daysRemaining === 0);

                  return (
                    <tr key={org.id} className="hover:bg-neutral-50/60 transition-colors">
                      {/* Salon / Brand */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {org.logoUrl ? (
                            <img src={org.logoUrl} alt={org.salonName} className="w-9 h-9 rounded-xl object-cover border border-neutral-200 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-800 border border-amber-500/20 flex items-center justify-center font-black text-xs shrink-0">
                              {org.salonName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <button
                              onClick={() => onSelectOrg(org)}
                              className="font-bold text-neutral-900 hover:text-amber-700 text-left transition-colors cursor-pointer"
                            >
                              {org.salonName}
                            </button>
                            <span className="block text-[10px] text-neutral-400">{org.city || 'Addis Ababa'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Owner & Phone */}
                      <td className="py-3.5 px-4 text-neutral-700">
                        <p className="font-bold text-neutral-900">{org.ownerName}</p>
                        <p className="text-[10px] font-mono text-neutral-500">{org.phone}</p>
                      </td>

                      {/* TIN / Org ID */}
                      <td className="py-3.5 px-4 font-mono text-[10px] text-neutral-500">
                        <p className="text-neutral-800 font-bold">{org.tinNumber || 'No TIN'}</p>
                        <p className="text-neutral-400">{org.id}</p>
                      </td>

                      {/* Plan / Status */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-neutral-800 block text-[11px] capitalize">{org.planId?.replace('plan_', '') || '1 Year'}</span>
                        {isSuspended ? (
                          <span className="inline-block px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-[9px] font-black uppercase">
                            Suspended
                          </span>
                        ) : isExpired ? (
                          <span className="inline-block px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-[9px] font-black uppercase">
                            Expired
                          </span>
                        ) : isTrial ? (
                          <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[9px] font-black uppercase">
                            14d Trial
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[9px] font-black uppercase">
                            Active Paid
                          </span>
                        )}
                      </td>

                      {/* Expiry / Days Left */}
                      <td className="py-3.5 px-4">
                        <span className={`font-bold font-mono text-xs ${daysRemaining <= 3 ? 'text-red-600' : 'text-neutral-900'}`}>
                          {daysRemaining} day{daysRemaining === 1 ? '' : 's'} left
                        </span>
                        <span className="block text-[10px] text-neutral-400 font-mono">
                          {new Date(org.trialEndDate).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Staff */}
                      <td className="py-3.5 px-4 text-center font-bold font-mono text-neutral-800">
                        {org.numberOfStaff || 1}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenCRM(org)}
                            className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer ios-active-scale"
                            title="Open salon CRM dashboard in preview mode"
                          >
                            <ExternalLink className="w-3 h-3 text-amber-400" />
                            <span>Open CRM</span>
                          </button>

                          {onResetPassword && (
                            <button
                              onClick={() => onResetPassword(org)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs transition-colors border border-amber-200 cursor-pointer"
                              title="Reset Owner & Staff Password"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                            </button>
                          )}

                          <button
                            onClick={() => onSelectOrg(org)}
                            className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs transition-colors cursor-pointer"
                            title="View 360° Salon Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
