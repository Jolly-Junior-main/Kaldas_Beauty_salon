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

    // 2. Ensure Default Initial Organization (Kaldas Beauty Salon) Exists as an Active Yearly Subscribed Salon
    const defaultOrgRef = doc(db, 'organizations', DEFAULT_ORG_ID);
    const defaultOrgSnap = await getDoc(defaultOrgRef);
    const now = new Date();
    const yearlyEndDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const defaultOrg: Organization = {
      id: DEFAULT_ORG_ID,
      salonName: 'Kaldas Beauty Salon',
      ownerName: 'Admin1',
      phone: '+251 911 234567',
      email: 'owner@kaldasbeauty.com',
      tinNumber: '009845231',
      address: 'Bole Medhanialem, Edna Mall Tower 3rd Floor',
      city: 'Addis Ababa',
      country: 'Ethiopia',
      logoUrl: '',
      status: 'active',
      createdAt: defaultOrgSnap.exists() ? defaultOrgSnap.data()?.createdAt || now.toISOString() : now.toISOString(),
      trialStartDate: now.toISOString(),
      trialEndDate: yearlyEndDate, // 1 year active subscription window
      subscriptionStatus: 'active',
      planId: 'plan_1y',
      subscriptionId: `sub_${DEFAULT_ORG_ID}`,
      numberOfStaff: 8,
      lastLoginAt: now.toISOString()
    };

    // Upsert organization record
    await setDoc(defaultOrgRef, cleanUndefined(defaultOrg), { merge: true });

    // Active 1-Year Subscription for Kaldas Beauty Salon (9,999 ETB)
    const subRef = doc(db, 'subscriptions', `sub_${DEFAULT_ORG_ID}`);
    await setDoc(subRef, cleanUndefined({
      id: `sub_${DEFAULT_ORG_ID}`,
      organizationId: DEFAULT_ORG_ID,
      planId: 'plan_1y',
      status: 'active',
      billingPeriod: '1_year',
      price: 9999,
      startDate: now.toISOString(),
      endDate: yearlyEndDate,
      autoRenew: true,
      paymentProvider: 'Telebirr',
      paymentReference: 'TX-KALDAS-YEARLY-001',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }), { merge: true });

    // Initial 1-Year Paid Transaction Record in Payments Ledger
    const payRef = doc(db, 'payments', `pay_${DEFAULT_ORG_ID}_yearly`);
    const paySnap = await getDoc(payRef);
    if (!paySnap.exists()) {
      await setDoc(payRef, cleanUndefined({
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
        paidAt: now.toISOString(),
        createdAt: now.toISOString(),
        recordedBy: 'Viavela Platform Setup',
        notes: 'Initial 1-Year Subscription Plan Payment for Kaldas Beauty Salon'
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

    // 4. Seed Standard Staff Accounts for Kaldas Beauty Salon
    const defaultStaff = [
      { id: 'staff_kaldas_owner', name: 'Sara', role: 'admin', password: 'Admin1', email: 'owner@kaldasbeauty.com', phone: '+251 911 234567', organizationId: DEFAULT_ORG_ID },
      { id: 'staff_kaldas_cashier', name: 'Cashier1', role: 'cashier', password: 'Cashier123!', email: 'cashier@kaldasbeauty.com', phone: '+251 911 234568', organizationId: DEFAULT_ORG_ID },
      { id: 'staff_kaldas_walkin', name: 'Walkin1', role: 'walkin', password: 'Walkin123!', email: 'walkin@kaldasbeauty.com', phone: '+251 911 234569', organizationId: DEFAULT_ORG_ID },
      { id: 'staff_kaldas_inventory', name: 'Inventory1', role: 'inventory', password: 'Inventory123!', email: 'inventory@kaldasbeauty.com', phone: '+251 911 234570', organizationId: DEFAULT_ORG_ID },
      { id: 'staff_kaldas_assistant', name: 'Assistant1', role: 'assistant', password: 'Assistant123!', email: 'assistant@kaldasbeauty.com', phone: '+251 911 234571', organizationId: DEFAULT_ORG_ID }
    ];

    for (const stf of defaultStaff) {
      const stfRef = doc(db, 'staff', stf.id);
      const stfSnap = await getDoc(stfRef);
      if (!stfSnap.exists()) {
        await setDoc(stfRef, cleanUndefined({
          ...stf,
          created_at: now.toISOString()
        }));
      }
    }

    // 5. Create Initial Super Admin Profile in `users` collection if not exists
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
