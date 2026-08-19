/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM: Super Admin Platform Master Dashboard
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTenant } from '../../lib/tenantContext';
import { Organization, SaaSOrganizationPayment, Advertisement } from '../../types';
import { 
  Building2, 
  LayoutDashboard, 
  Sparkles, 
  CreditCard, 
  TrendingUp, 
  Megaphone, 
  ShieldCheck, 
  LogOut, 
  Plus, 
  Search, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  ChevronRight,
  ExternalLink,
  Users,
  Eye,
  Settings
} from 'lucide-react';

import OrganizationList from './OrganizationList';
import OrganizationDetailView from './OrganizationDetailView';
import CreateSalonModal from './CreateSalonModal';
import SubscriptionPlansManager from './SubscriptionPlansManager';
import PaymentsLedger from './PaymentsLedger';
import RevenueAnalytics from './RevenueAnalytics';
import AdvertisementManager from './AdvertisementManager';
import ActivityLogView from './ActivityLogView';

import { runSaaSMigrationIfNeeded, DEFAULT_ORG_ID } from '../../lib/migration';

type SuperAdminTab = 
  | 'overview' 
  | 'organizations' 
  | 'subscriptions' 
  | 'payments' 
  | 'revenue' 
  | 'advertisements' 
  | 'activity' 
  | 'settings';

export default function SuperAdminDashboard() {
  const { switchOrganization, logout, loggedInUser } = useTenant();
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('overview');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [payments, setPayments] = useState<SaaSOrganizationPayment[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Guarantee SaaS migration & database bootstrapping on Super Admin mount
  useEffect(() => {
    runSaaSMigrationIfNeeded();
  }, []);

  // Subscribe to all organizations, payments, and ads in real-time
  useEffect(() => {
    const defaultKaldasFallback: Organization = {
      id: DEFAULT_ORG_ID,
      salonName: 'Kaldas Beauty Salon',
      ownerName: 'Admin1',
      phone: '+251 911 234567',
      email: 'owner@kaldasbeauty.com',
      tinNumber: '009845231',
      address: 'Bole Medhanialem, Edna Mall Tower 3rd Floor',
      city: 'Addis Ababa',
      country: 'Ethiopia',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      trialStartDate: '2026-01-01T00:00:00.000Z',
      trialEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      subscriptionStatus: 'active',
      planId: 'plan_1y',
      subscriptionId: `sub_${DEFAULT_ORG_ID}`,
      numberOfStaff: 8,
      lastLoginAt: new Date().toISOString()
    };

    let firestoreOrgs: Organization[] = [];
    let settingsOrgs: Organization[] = [];

    const updateCombinedOrgs = () => {
      const map = new Map<string, Organization>();
      map.set(DEFAULT_ORG_ID, defaultKaldasFallback);
      settingsOrgs.forEach(o => map.set(o.id, o));
      firestoreOrgs.forEach(o => map.set(o.id, o));

      try {
        const local = JSON.parse(localStorage.getItem('viavela_local_orgs') || '[]');
        local.forEach((o: Organization) => map.set(o.id, o));
      } catch (e) {}

      const result = Array.from(map.values());
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrganizations(result);
    };

    const unsubOrgs = onSnapshot(collection(db, 'organizations'), (snap) => {
      firestoreOrgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Organization));
      updateCombinedOrgs();
    }, (err) => {
      console.warn('Organizations collection fallback to settings:', err);
      updateCombinedOrgs();
    });

    const unsubSettingsOrgs = onSnapshot(doc(db, 'settings', 'saas_organizations'), (snap) => {
      if (snap.exists()) {
        settingsOrgs = snap.data().list || [];
        updateCombinedOrgs();
      }
    }, (err) => {
      console.debug('Settings orgs listener notice:', err);
    });

    const unsubPayments = onSnapshot(collection(db, 'payments'), (snap) => {
      const list: SaaSOrganizationPayment[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as SaaSOrganizationPayment));
      
      // Ensure default yearly payment record is present
      if (list.length === 0) {
        list.push({
          id: `pay_${DEFAULT_ORG_ID}_yearly`,
          organizationId: DEFAULT_ORG_ID,
          subscriptionId: `sub_${DEFAULT_ORG_ID}`,
          amount: 9999,
          currency: 'ETB',
          planId: 'plan_1y',
          billingPeriod: '1_year',
          status: 'completed',
          paymentProvider: 'Telebirr',
          transactionReference: 'TX-KALDAS-YEARLY-001',
          paidAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      }

      setPayments(list);
    }, (err) => {
      console.warn('Payments listener error:', err);
    });

    const unsubAds = onSnapshot(collection(db, 'advertisements'), (snap) => {
      const list: Advertisement[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Advertisement));
      setAds(list);
    }, (err) => {
      console.warn('Ads listener error:', err);
    });

    return () => {
      unsubOrgs();
      unsubPayments();
      unsubAds();
    };
  }, []);

  // --- Compute Top 10 Statistics Cards ---
  const totalOrganizations = organizations.length;
  const activeOrganizations = organizations.filter(o => o.status === 'active' && o.subscriptionStatus === 'active').length;
  const trialOrganizations = organizations.filter(o => o.subscriptionStatus === 'trialing').length;
  
  const getDaysRemaining = (org: Organization): number => {
    const end = new Date(org.trialEndDate).getTime();
    return Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
  };

  const expiredOrganizations = organizations.filter(o => {
    return o.subscriptionStatus === 'expired' || (o.subscriptionStatus === 'trialing' && getDaysRemaining(o) === 0);
  }).length;

  const activeSubscriptions = activeOrganizations;

  // Subscription Revenue
  const totalSubscriptionRevenue = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Ad Revenue
  const totalAdRevenue = ads.reduce((sum, a) => sum + (Number(a.revenueGenerated) || 0), 0);
  const totalRevenue = totalSubscriptionRevenue + totalAdRevenue;

  // MRR
  const mrr = organizations
    .filter(o => o.subscriptionStatus === 'active')
    .reduce((sum, o) => {
      if (o.planId === 'plan_1m') return sum + 999;
      if (o.planId === 'plan_3m') return sum + Math.round(2999 / 3);
      if (o.planId === 'plan_6m') return sum + Math.round(5999 / 6);
      if (o.planId === 'plan_1y') return sum + Math.round(9999 / 12);
      if (o.planId === 'plan_2y') return sum + Math.round(17999 / 24);
      return sum + 833;
    }, 0);

  // Expiring Soon (within 7 days)
  const expiringSoonList = organizations.filter(o => {
    const d = getDaysRemaining(o);
    return d > 0 && d <= 7;
  });
  const expiringSoonCount = expiringSoonList.length;

  const handleOpenCRM = (org: Organization) => {
    switchOrganization(org.id);
  };

  const handleSuspend = async (org: Organization) => {
    await updateDoc(doc(db, 'organizations', org.id), { status: 'suspended' });
  };

  const handleReactivate = async (org: Organization) => {
    await updateDoc(doc(db, 'organizations', org.id), { status: 'active' });
  };

  const handleDelete = async (org: Organization) => {
    if (window.confirm(`Are you sure you want to permanently delete salon "${org.salonName}"?`)) {
      await deleteDoc(doc(db, 'organizations', org.id));
      setSelectedOrg(null);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900/5 text-neutral-900 font-sans flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="bg-neutral-950 text-white border-b border-neutral-800 sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-neutral-950 flex items-center justify-center font-black text-sm shadow-xs">
            V
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight text-white">Viavela CRM</h1>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-black uppercase rounded-md tracking-wider">
                Super Admin Platform
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 font-medium">Beauty Salon Multi-Tenant Cloud Operating System</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ios-active-scale"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Create New Salon</span>
          </button>

          <div className="h-5 w-px bg-neutral-800 hidden sm:block" />

          <button
            onClick={logout}
            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-neutral-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
        {/* Left Sidebar Navigation */}
        <aside className="w-full md:w-60 shrink-0 space-y-1.5 bg-white p-3.5 rounded-3xl border border-neutral-200/80 shadow-xs h-fit">
          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Platform Overview', icon: LayoutDashboard },
              { id: 'organizations', label: 'Organizations / Salons', icon: Building2, count: totalOrganizations },
              { id: 'subscriptions', label: 'Subscription Plans', icon: Sparkles },
              { id: 'payments', label: 'Payments & Invoices', icon: CreditCard, count: payments.length },
              { id: 'revenue', label: 'Revenue Analytics', icon: TrendingUp },
              { id: 'advertisements', label: 'Ad Engine & Slots', icon: Megaphone, count: ads.length },
              { id: 'activity', label: 'Audit Activity Log', icon: ShieldCheck }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id && !selectedOrg;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as SuperAdminTab);
                    setSelectedOrg(null);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-neutral-900 text-white shadow-sm font-black'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-neutral-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isActive ? 'bg-neutral-800 text-amber-400' : 'bg-neutral-100 text-neutral-600'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 space-y-6">
          {/* Detail View Mode */}
          {selectedOrg ? (
            <OrganizationDetailView
              organization={selectedOrg}
              onBack={() => setSelectedOrg(null)}
              onOpenCRM={handleOpenCRM}
            />
          ) : (
            <>
              {/* TAB 1: OVERVIEW & 10 KPI STAT CARDS */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Top 10 KPI Statistics Grid */}
                  <div>
                    <h2 className="text-xs font-black uppercase text-neutral-400 tracking-wider mb-3">Platform Vitals & KPIs</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {/* 1. Total Organizations */}
                      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
                        <span className="text-[9px] uppercase font-bold text-neutral-400 block">1. Total Salons</span>
                        <p className="text-xl font-black font-mono text-neutral-900 mt-0.5">{totalOrganizations}</p>
                      </div>

                      {/* 2. Active Salons */}
                      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
                        <span className="text-[9px] uppercase font-bold text-neutral-400 block">2. Active Paid</span>
                        <p className="text-xl font-black font-mono text-emerald-600 mt-0.5">{activeOrganizations}</p>
                      </div>

                      {/* 3. Free Trials */}
                      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
                        <span className="text-[9px] uppercase font-bold text-neutral-400 block">3. 14d Trials</span>
                        <p className="text-xl font-black font-mono text-amber-600 mt-0.5">{trialOrganizations}</p>
                      </div>

                      {/* 4. Expired */}
                      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
                        <span className="text-[9px] uppercase font-bold text-neutral-400 block">4. Expired</span>
                        <p className="text-xl font-black font-mono text-red-600 mt-0.5">{expiredOrganizations}</p>
                      </div>

                      {/* 5. Active Subscriptions */}
                      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
                        <span className="text-[9px] uppercase font-bold text-neutral-400 block">5. Active Subs</span>
                        <p className="text-xl font-black font-mono text-blue-600 mt-0.5">{activeSubscriptions}</p>
                      </div>

                      {/* 6. MRR */}
                      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
                        <span className="text-[9px] uppercase font-bold text-neutral-400 block">6. MRR</span>
                        <p className="text-xl font-black font-mono text-neutral-900 mt-0.5">{mrr.toLocaleString()} <span className="text-[10px] font-sans text-neutral-400">ETB</span></p>
                      </div>

                      {/* 7. Total Sub Revenue */}
                      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
                        <span className="text-[9px] uppercase font-bold text-neutral-400 block">7. Sub Revenue</span>
                        <p className="text-xl font-black font-mono text-neutral-900 mt-0.5">{totalSubscriptionRevenue.toLocaleString()} <span className="text-[10px] font-sans text-neutral-400">ETB</span></p>
                      </div>

                      {/* 8. Ad Revenue */}
                      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
                        <span className="text-[9px] uppercase font-bold text-neutral-400 block">8. Ad Revenue</span>
                        <p className="text-xl font-black font-mono text-purple-700 mt-0.5">{totalAdRevenue.toLocaleString()} <span className="text-[10px] font-sans text-neutral-400">ETB</span></p>
                      </div>

                      {/* 9. Total Revenue */}
                      <div className="bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-white p-4 rounded-2xl border border-amber-300 shadow-xs">
                        <span className="text-[9px] uppercase font-bold text-amber-900 block">9. Total Revenue</span>
                        <p className="text-xl font-black font-mono text-neutral-950 mt-0.5">{totalRevenue.toLocaleString()} <span className="text-[10px] font-sans text-neutral-500">ETB</span></p>
                      </div>

                      {/* 10. Expiring Soon */}
                      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
                        <span className="text-[9px] uppercase font-bold text-neutral-400 block">10. Expiring &lt;7d</span>
                        <p className="text-xl font-black font-mono text-amber-700 mt-0.5">{expiringSoonCount}</p>
                      </div>
                    </div>
                  </div>

                  {/* Salons Expiring Soon Alert Section */}
                  {expiringSoonCount > 0 && (
                    <div className="bg-amber-50/80 rounded-3xl border border-amber-300 p-5 space-y-3">
                      <div className="flex items-center gap-2 text-amber-950 font-black text-xs uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Salons Expiring in Less Than 7 Days ({expiringSoonCount})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {expiringSoonList.map((org) => (
                          <div key={org.id} className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-2xs flex justify-between items-center text-xs">
                            <div>
                              <p className="font-bold text-neutral-900">{org.salonName}</p>
                              <p className="text-[10px] text-neutral-500">{org.phone}</p>
                            </div>
                            <button
                              onClick={() => setSelectedOrg(org)}
                              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-[10px] rounded-lg shadow-2xs cursor-pointer"
                            >
                              Extend / View
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Salons Directory Component */}
                  <OrganizationList
                    organizations={organizations}
                    onSelectOrg={(org) => setSelectedOrg(org)}
                    onOpenCRM={handleOpenCRM}
                    onManageSub={(org) => setSelectedOrg(org)}
                    onSuspend={handleSuspend}
                    onReactivate={handleReactivate}
                    onDelete={handleDelete}
                    onCreateNew={() => setShowCreateModal(true)}
                  />
                </div>
              )}

              {/* TAB 2: ORGANIZATIONS DIRECTORY */}
              {activeTab === 'organizations' && (
                <OrganizationList
                  organizations={organizations}
                  onSelectOrg={(org) => setSelectedOrg(org)}
                  onOpenCRM={handleOpenCRM}
                  onManageSub={(org) => setSelectedOrg(org)}
                  onSuspend={handleSuspend}
                  onReactivate={handleReactivate}
                  onDelete={handleDelete}
                  onCreateNew={() => setShowCreateModal(true)}
                />
              )}

              {/* TAB 3: SUBSCRIPTIONS & PLANS */}
              {activeTab === 'subscriptions' && <SubscriptionPlansManager />}

              {/* TAB 4: PAYMENTS & INVOICES */}
              {activeTab === 'payments' && <PaymentsLedger organizations={organizations} />}

              {/* TAB 5: REVENUE & FINANCIALS */}
              {activeTab === 'revenue' && <RevenueAnalytics organizations={organizations} />}

              {/* TAB 6: ADVERTISEMENTS */}
              {activeTab === 'advertisements' && <AdvertisementManager organizations={organizations} />}

              {/* TAB 7: ACTIVITY AUDIT LOG */}
              {activeTab === 'activity' && <ActivityLogView />}
            </>
          )}
        </main>
      </div>

      {/* 4-Step Create Salon Wizard Modal */}
      {showCreateModal && (
        <CreateSalonModal
          onClose={() => setShowCreateModal(false)}
          onSalonCreated={(newOrg) => {
            setSelectedOrg(newOrg);
          }}
        />
      )}
    </div>
  );
}
