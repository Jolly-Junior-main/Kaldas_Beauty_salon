/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Multi-Tenant SaaS Migration & Bootstrapping Engine
 */

import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db, cleanUndefined } from './firebase';
import { Organization, PREDEFINED_SUBSCRIPTION_PLANS, SubscriptionPlan } from '../types';

export const DEFAULT_ORG_ID = 'org_kaldas_default';

/**
 * Initializes the default organization, seeds subscription plans,
 * and attaches legacy CRM data to the initial organization without any data loss.
 */
export async function runSaaSMigrationIfNeeded(): Promise<void> {
  try {
    // 1. Ensure Default Subscription Plans Exist in Firestore
    for (const plan of PREDEFINED_SUBSCRIPTION_PLANS) {
      const planRef = doc(db, 'subscriptionPlans', plan.id);
      const snap = await getDoc(planRef);
      if (!snap.exists()) {
        await setDoc(planRef, cleanUndefined(plan));
      }
    }

    // 2. Ensure Default Initial Organization Exists
    const defaultOrgRef = doc(db, 'organizations', DEFAULT_ORG_ID);
    const defaultOrgSnap = await getDoc(defaultOrgRef);

    if (!defaultOrgSnap.exists()) {
      const now = new Date();
      const trialEndDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const defaultOrg: Organization = {
        id: DEFAULT_ORG_ID,
        salonName: 'Kaldas Beauty Salon (Viavela Flagship)',
        ownerName: 'Admin1',
        phone: '+251911234567',
        email: 'owner@kaldasbeauty.com',
        tinNumber: 'TIN-009845231',
        address: 'Bole Medhanialem, Edna Mall Tower 3rd Floor',
        city: 'Addis Ababa',
        country: 'Ethiopia',
        logoUrl: '',
        status: 'active',
        createdAt: now.toISOString(),
        trialStartDate: now.toISOString(),
        trialEndDate: trialEndDate,
        subscriptionStatus: 'active',
        planId: 'plan_1y',
        numberOfStaff: 8,
        lastLoginAt: now.toISOString()
      };

      await setDoc(defaultOrgRef, cleanUndefined(defaultOrg));

      // Also create active subscription for the default flagship salon
      const subRef = doc(db, 'subscriptions', `sub_${DEFAULT_ORG_ID}`);
      await setDoc(subRef, cleanUndefined({
        id: `sub_${DEFAULT_ORG_ID}`,
        organizationId: DEFAULT_ORG_ID,
        planId: 'plan_1y',
        status: 'active',
        billingPeriod: '1_year',
        price: 9999,
        startDate: now.toISOString(),
        endDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        autoRenew: true,
        paymentProvider: 'Telebirr',
        paymentReference: 'FLAGSHIP-INITIAL-ACTIVE',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }));
    }

    // 3. Migrate Legacy Collections: Tag untagged documents with default organizationId
    const legacyCollections = [
      'customers',
      'visits',
      'services',
      'staff',
      'artists',
      'queue_entries',
      'inventory_products',
      'active_checkouts',
      'inventory_logs',
      'birthday_wishes',
      'sms_logs',
      'settings'
    ];

    for (const colName of legacyCollections) {
      try {
        const colSnap = await getDocs(collection(db, colName));
        for (const docSnap of colSnap.docs) {
          const data = docSnap.data();
          if (!data.organizationId) {
            await updateDoc(docSnap.ref, { organizationId: DEFAULT_ORG_ID });
          }
        }
      } catch (err) {
        console.warn(`Migration check on collection ${colName}:`, err);
      }
    }

    // 4. Create Initial Super Admin Profile in `users` collection if not exists
    const superAdminRef = doc(db, 'users', 'super_admin_master');
    const saSnap = await getDoc(superAdminRef);
    if (!saSnap.exists()) {
      await setDoc(superAdminRef, cleanUndefined({
        uid: 'super_admin_master',
        email: 'admin@viavelacrm.com',
        displayName: 'Viavela Super Admin',
        phone: '+251900000000',
        organizationId: null,
        role: 'SUPER_ADMIN',
        status: 'active',
        createdAt: new Date().toISOString()
      }));
    }

  } catch (globalMigrationErr) {
    console.warn('Viavela SaaS Migration Warning:', globalMigrationErr);
  }
}
