/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Multi-Tenant Architecture Context
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { Organization, SaaSRole, SubscriptionStatus, UserRole } from '../types';
import { DEFAULT_ORG_ID, SEEDED_ORGANIZATIONS } from './migration';

interface TenantContextType {
  currentOrganizationId: string;
  currentOrganization: Organization | null;
  isSuperAdmin: boolean;
  isSuperAdminImpersonating: boolean;
  userRole: SaaSRole | UserRole | null;
  loggedInUser: string;
  authToken: string | null;
  isTrialActive: boolean;
  daysRemainingInTrial: number;
  subscriptionStatus: SubscriptionStatus;
  isExpired: boolean;
  switchOrganization: (orgId: string) => void;
  exitImpersonation: () => void;
  setUserSession: (role: SaaSRole | UserRole, username: string, orgId?: string | null, token?: string | null) => void;
  logout: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [currentOrganizationId, setCurrentOrganizationId] = useState<string>(() => {
    return localStorage.getItem('viavela_active_org') || DEFAULT_ORG_ID;
  });

  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(() => {
    const initialOrgId = localStorage.getItem('viavela_active_org') || DEFAULT_ORG_ID;
    return SEEDED_ORGANIZATIONS.find(o => o.id === initialOrgId) || SEEDED_ORGANIZATIONS[0];
  });
  const [isSuperAdminImpersonating, setIsSuperAdminImpersonating] = useState<boolean>(() => {
    return localStorage.getItem('viavela_is_impersonating') === 'true';
  });

  const [userRole, setUserRole] = useState<SaaSRole | UserRole | null>(() => {
    return (localStorage.getItem('kaldas_user_role') as any) || (localStorage.getItem('viavela_user_role') as any) || null;
  });

  const [loggedInUser, setLoggedInUser] = useState<string>(() => {
    return localStorage.getItem('kaldas_logged_user') || localStorage.getItem('viavela_logged_user') || '';
  });

  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('viavela_auth_token') || null;
  });

  const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'superadmin' || localStorage.getItem('viavela_is_super_admin') === 'true';

  // Real-time synchronization with active organization document
  useEffect(() => {
    if (!currentOrganizationId) return;

    // Immediately resolve from seeded / local storage
    const seeded = SEEDED_ORGANIZATIONS.find(o => o.id === currentOrganizationId);
    if (seeded) {
      setCurrentOrganization(seeded);
    } else {
      try {
        const local = JSON.parse(localStorage.getItem('viavela_local_orgs') || '[]');
        const found = local.find((o: Organization) => o.id === currentOrganizationId);
        if (found) setCurrentOrganization(found);
      } catch (e) {}
    }

    const unsubOrg = onSnapshot(doc(db, 'organizations', currentOrganizationId), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentOrganization({ id: docSnap.id, ...docSnap.data() } as Organization);
      }
    }, (err) => {
      console.warn('Tenant Organization listener warning:', err);
    });

    return () => unsubOrg();
  }, [currentOrganizationId]);

  // Compute dynamic trial countdown: (trialEndDate - currentDate)
  const calculateDaysRemaining = (): number => {
    if (!currentOrganization?.trialEndDate) return 14;
    const end = new Date(currentOrganization.trialEndDate).getTime();
    const now = Date.now();
    const diffMs = end - now;
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const daysRemainingInTrial = calculateDaysRemaining();
  const rawSubStatus = currentOrganization?.subscriptionStatus || 'trialing';

  // If trial date expired and status was trialing, mark as expired
  const subscriptionStatus: SubscriptionStatus = 
    (rawSubStatus === 'trialing' && daysRemainingInTrial === 0) ? 'expired' : rawSubStatus;

  const isTrialActive = subscriptionStatus === 'trialing' && daysRemainingInTrial > 0;
  const isExpired = subscriptionStatus === 'expired';

  const switchOrganization = (orgId: string) => {
    setCurrentOrganizationId(orgId);
    const seeded = SEEDED_ORGANIZATIONS.find(o => o.id === orgId);
    if (seeded) {
      setCurrentOrganization(seeded);
    }
    setIsSuperAdminImpersonating(true);
    localStorage.setItem('viavela_active_org', orgId);
    localStorage.setItem('viavela_is_impersonating', 'true');
  };

  const exitImpersonation = () => {
    setIsSuperAdminImpersonating(false);
    localStorage.removeItem('viavela_is_impersonating');
  };

  const setUserSession = (role: SaaSRole | UserRole, username: string, orgId?: string | null, token?: string | null) => {
    setUserRole(role);
    setLoggedInUser(username);
    if (token) {
      setAuthToken(token);
      localStorage.setItem('viavela_auth_token', token);
    }
    const isSA = role === 'SUPER_ADMIN' || role === 'superadmin';

    localStorage.setItem('kaldas_logged_in', 'true');
    localStorage.setItem('kaldas_user_role', role);
    localStorage.setItem('kaldas_logged_user', username);
    localStorage.setItem('viavela_user_role', role);
    localStorage.setItem('viavela_logged_user', username);

    if (isSA) {
      localStorage.setItem('viavela_is_super_admin', 'true');
    } else {
      localStorage.removeItem('viavela_is_super_admin');
    }

    if (orgId) {
      setCurrentOrganizationId(orgId);
      const seeded = SEEDED_ORGANIZATIONS.find(o => o.id === orgId);
      if (seeded) {
        setCurrentOrganization(seeded);
      }
      localStorage.setItem('viavela_active_org', orgId);
    }
  };

  const logout = () => {
    localStorage.clear();
    setUserRole(null);
    setLoggedInUser('');
    setAuthToken(null);
    setIsSuperAdminImpersonating(false);
    window.location.reload();
  };

  return (
    <TenantContext.Provider value={{
      currentOrganizationId,
      currentOrganization,
      isSuperAdmin,
      isSuperAdminImpersonating,
      userRole,
      loggedInUser,
      authToken,
      isTrialActive,
      daysRemainingInTrial,
      subscriptionStatus,
      isExpired,
      switchOrganization,
      exitImpersonation,
      setUserSession,
      logout
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
