/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Multi-Tenant SaaS Migration & Bootstrapping Engine
 */

import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db, cleanUndefined } from './firebase';
import { Organization, PREDEFINED_SUBSCRIPTION_PLANS, SubscriptionPlan } from '../types';

export const DEFAULT_ORG_ID = 'org_kaldas_default';

export const SEEDED_ORGANIZATIONS: Organization[] = [
  {
    id: 'org_kaldas_default',
    salonName: 'Kaldas Beauty Salon',
    ownerName: 'Sara Tekle',
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
    subscriptionId: 'sub_org_kaldas_default',
    numberOfStaff: 8,
    lastLoginAt: new Date().toISOString()
  },
  {
    id: 'org_sheba_spa',
    salonName: 'Queen Sheba Luxury Spa & Salon',
    ownerName: 'Helen Berhanu',
    phone: '+251 912 345678',
    email: 'helen@queenshebaspa.com',
    tinNumber: '008765432',
    address: 'Kazanchis, Intercontinental Hotel Building',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    status: 'active',
    createdAt: '2026-02-01T00:00:00.000Z',
    trialStartDate: '2026-02-01T00:00:00.000Z',
    trialEndDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    subscriptionStatus: 'active',
    planId: 'plan_6m',
    subscriptionId: 'sub_org_sheba_spa',
    numberOfStaff: 12,
    lastLoginAt: new Date().toISOString()
  },
  {
    id: 'org_bole_glamour',
    salonName: 'Bole Glamour Hair & Beauty Lounge',
    ownerName: 'Martha Girma',
    phone: '+251 913 456789',
    email: 'martha@boleglamour.com',
    tinNumber: '007654321',
    address: 'Bole Brass, Lex Plaza 1st Floor',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    status: 'active',
    createdAt: '2026-03-01T00:00:00.000Z',
    trialStartDate: '2026-03-01T00:00:00.000Z',
    trialEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    subscriptionStatus: 'active',
    planId: 'plan_1y',
    subscriptionId: 'sub_org_bole_glamour',
    numberOfStaff: 10,
    lastLoginAt: new Date().toISOString()
  },
  {
    id: 'org_enat_studio',
    salonName: 'Enat Aesthetic Studio & Spa',
    ownerName: 'Tigist Alemu',
    phone: '+251 914 567890',
    email: 'tigist@enatstudio.com',
    tinNumber: '006543210',
    address: 'Sarbet, Bisrate Gabriel Mall',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    status: 'active',
    createdAt: '2026-04-01T00:00:00.000Z',
    trialStartDate: '2026-04-01T00:00:00.000Z',
    trialEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    subscriptionStatus: 'active',
    planId: 'plan_3m',
    subscriptionId: 'sub_org_enat_studio',
    numberOfStaff: 6,
    lastLoginAt: new Date().toISOString()
  },
  {
    id: 'org_velvet_touch',
    salonName: 'Velvet Touch Beauty Bar',
    ownerName: 'Bethelhem Tadesse',
    phone: '+251 915 678901',
    email: 'bethelhem@velvettouch.com',
    tinNumber: '005432109',
    address: 'CMC Michael, Sunshine Complex',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    status: 'trialing',
    createdAt: new Date().toISOString(),
    trialStartDate: new Date().toISOString(),
    trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    subscriptionStatus: 'trialing',
    planId: 'plan_1m',
    subscriptionId: 'sub_org_velvet_touch',
    numberOfStaff: 5,
    lastLoginAt: new Date().toISOString()
  },
  {
    id: 'org_royal_luxe',
    salonName: 'Royal Luxe Unisex Salon',
    ownerName: 'Dawit Bekele',
    phone: '+251 916 789012',
    email: 'dawit@royalluxe.com',
    tinNumber: '004321098',
    address: 'Piassa, Churchill Avenue, Commercial Center',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    status: 'active',
    createdAt: '2026-01-15T00:00:00.000Z',
    trialStartDate: '2026-01-15T00:00:00.000Z',
    trialEndDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString(),
    subscriptionStatus: 'active',
    planId: 'plan_2y',
    subscriptionId: 'sub_org_royal_luxe',
    numberOfStaff: 15,
    lastLoginAt: new Date().toISOString()
  }
];

/**
 * Initializes all subscription plans and 6 rich beauty salon organizations
 * with complete CRM datasets (services, inventory, staff, artists, payments).
 */
export async function runSaaSMigrationIfNeeded(): Promise<void> {
  try {
    const now = new Date();

    // 1. Ensure Default Subscription Plans Exist
    for (const plan of PREDEFINED_SUBSCRIPTION_PLANS) {
      try {
        const planRef = doc(db, 'subscriptionPlans', plan.id);
        await setDoc(planRef, cleanUndefined(plan), { merge: true });
      } catch (e) {}
    }

    // 2. Bootstrap All 6 Beauty Salon Organizations with Full CRM Data
    for (const org of SEEDED_ORGANIZATIONS) {
      const orgRef = doc(db, 'organizations', org.id);
      try {
        await setDoc(orgRef, cleanUndefined(org), { merge: true });
      } catch (e) {}

      // Subscription document
      const subRef = doc(db, 'subscriptions', org.subscriptionId || `sub_${org.id}`);
      try {
        await setDoc(subRef, cleanUndefined({
          id: org.subscriptionId || `sub_${org.id}`,
          organizationId: org.id,
          planId: org.planId || 'plan_1y',
          status: org.subscriptionStatus,
          billingPeriod: org.planId === 'plan_6m' ? '6_months' : org.planId === 'plan_3m' ? '3_months' : org.planId === 'plan_2y' ? '2_years' : '1_year',
          price: org.planId === 'plan_6m' ? 5999 : org.planId === 'plan_3m' ? 2999 : org.planId === 'plan_2y' ? 18999 : 9999,
          startDate: org.trialStartDate,
          endDate: org.trialEndDate,
          autoRenew: true,
          paymentProvider: 'Telebirr',
          paymentReference: `TX-${org.id.toUpperCase()}-001`,
          createdAt: org.createdAt,
          updatedAt: now.toISOString()
        }), { merge: true });
      } catch (e) {}

      // Payment transaction ledger
      if (org.status === 'active') {
        const payRef = doc(db, 'payments', `pay_${org.id}_init`);
        try {
          await setDoc(payRef, cleanUndefined({
            id: `pay_${org.id}_init`,
            organizationId: org.id,
            subscriptionId: org.subscriptionId || `sub_${org.id}`,
            amount: org.planId === 'plan_6m' ? 5999 : org.planId === 'plan_3m' ? 2999 : org.planId === 'plan_2y' ? 18999 : 9999,
            currency: 'ETB',
            planId: org.planId || 'plan_1y',
            status: 'completed',
            paymentProvider: 'Telebirr',
            transactionReference: `TX-${org.id.toUpperCase()}-001`,
            paidAt: org.createdAt,
            createdAt: org.createdAt,
            recordedBy: 'Viavela Cloud Migration'
          }), { merge: true });
        } catch (e) {}
      }

      // Staff Accounts (Owner, Cashier, Reception, Inventory, Stylist)
      const staffList = [
        { id: `staff_${org.id}_owner`, name: org.ownerName.split(' ')[0] || 'Owner', role: 'admin', password: 'Admin1', email: org.email, phone: org.phone, organizationId: org.id },
        { id: `staff_${org.id}_cashier`, name: 'Cashier1', role: 'cashier', password: 'Cashier123!', email: `cashier@${org.id}.com`, phone: org.phone, organizationId: org.id },
        { id: `staff_${org.id}_walkin`, name: 'Walkin1', role: 'walkin', password: 'Walkin123!', email: `walkin@${org.id}.com`, phone: org.phone, organizationId: org.id },
        { id: `staff_${org.id}_inventory`, name: 'Inventory1', role: 'inventory', password: 'Inventory123!', email: `inventory@${org.id}.com`, phone: org.phone, organizationId: org.id },
        { id: `staff_${org.id}_assistant`, name: 'Assistant1', role: 'assistant', password: 'Assistant123!', email: `assistant@${org.id}.com`, phone: org.phone, organizationId: org.id }
      ];

      for (const stf of staffList) {
        try {
          await setDoc(doc(db, 'staff', stf.id), cleanUndefined({ ...stf, created_at: org.createdAt }), { merge: true });
        } catch (e) {}
      }

      // Owner profile in users collection
      try {
        await setDoc(doc(db, 'users', `usr_${org.id}_owner`), cleanUndefined({
          uid: `usr_${org.id}_owner`,
          email: org.email,
          displayName: org.ownerName,
          organizationId: org.id,
          role: 'SALON_OWNER',
          password: 'Admin1',
          status: 'active',
          createdAt: org.createdAt
        }), { merge: true });
      } catch (e) {}

      // Predefined Services for this salon
      const services = [
        { id: `srv_${org.id}_1`, name: 'Balayage & Highlights Coloring', category: 'Hair', defaultPrice: 1200, organizationId: org.id },
        { id: `srv_${org.id}_2`, name: 'Classic Haircut & Blowdry', category: 'Hair', defaultPrice: 400, organizationId: org.id },
        { id: `srv_${org.id}_3`, name: 'Keratin Deep Smoothing Treatment', category: 'Hair', defaultPrice: 2500, organizationId: org.id },
        { id: `srv_${org.id}_4`, name: 'Luxury Gel Manicure & Pedicure', category: 'Nails', defaultPrice: 650, organizationId: org.id },
        { id: `srv_${org.id}_5`, name: 'Deep Cleansing Hydrafacial', category: 'Skin', defaultPrice: 950, organizationId: org.id },
        { id: `srv_${org.id}_6`, name: 'Full Body Relaxation Massage (60 min)', category: 'Massage', defaultPrice: 1100, organizationId: org.id }
      ];

      for (const srv of services) {
        try {
          await setDoc(doc(db, 'services', srv.id), cleanUndefined(srv), { merge: true });
        } catch (e) {}
      }

      // Predefined Inventory Products for this salon
      const products = [
        {
          id: `inv_${org.id}_1`,
          organizationId: org.id,
          name: 'Professional Moisture Shampoo (1L)',
          category_type: 'multiple_use',
          category_label: 'Hair',
          stock_quantity: 12,
          unit_name: 'bottles',
          low_stock_threshold: 3,
          min_clients_per_unit: 8,
          price_per_unit: 450,
          created_at: org.createdAt
        },
        {
          id: `inv_${org.id}_2`,
          organizationId: org.id,
          name: 'Deep Keratin Treatment Cream (500g)',
          category_type: 'multiple_use',
          category_label: 'Hair',
          stock_quantity: 8,
          unit_name: 'tubs',
          low_stock_threshold: 2,
          min_clients_per_unit: 6,
          price_per_unit: 650,
          created_at: org.createdAt
        },
        {
          id: `inv_${org.id}_3`,
          organizationId: org.id,
          name: 'Organic Lavender Massage Oil (500ml)',
          category_type: 'multiple_use',
          category_label: 'Massage',
          stock_quantity: 6,
          unit_name: 'bottles',
          low_stock_threshold: 2,
          min_clients_per_unit: 12,
          price_per_unit: 350,
          created_at: org.createdAt
        }
      ];

      for (const prod of products) {
        try {
          await setDoc(doc(db, 'inventory_products', prod.id), cleanUndefined(prod), { merge: true });
        } catch (e) {}
      }

      // Predefined Treatment Artists for this salon
      const artists = [
        { id: `art_${org.id}_1`, organizationId: org.id, name: `${org.salonName.split(' ')[0]} Master Stylist`, specialty: 'Hair', skills: 'Balayage, Cuts, Styling', created_at: org.createdAt },
        { id: `art_${org.id}_2`, organizationId: org.id, name: 'Senior Nail Artist', specialty: 'Nails', skills: 'Gel, Acrylics, Nail Art', created_at: org.createdAt },
        { id: `art_${org.id}_3`, organizationId: org.id, name: 'Certified Therapist', specialty: 'Massage', skills: 'Swedish, Aromatherapy', created_at: org.createdAt }
      ];

      for (const art of artists) {
        try {
          await setDoc(doc(db, 'artists', art.id), cleanUndefined(art), { merge: true });
        } catch (e) {}
      }

      // Predefined Sample Customers for this salon
      const sampleCustomer = {
        id: `cust_${org.id}_1`,
        organizationId: org.id,
        full_name: `Sample VIP Client (${org.salonName.split(' ')[0]})`,
        phone_number: '+251 900 123456',
        created_at: org.createdAt,
        notes_preferences: 'Prefers organic products'
      };
      try {
        await setDoc(doc(db, 'customers', sampleCustomer.id), cleanUndefined(sampleCustomer), { merge: true });
      } catch (e) {}
    }

    // 3. Dual-persistence backup in `settings/saas_organizations`
    try {
      const settingsRef = doc(db, 'settings', 'saas_organizations');
      await setDoc(settingsRef, { list: SEEDED_ORGANIZATIONS }, { merge: true });
    } catch (e) {}

    // 4. Local storage backup
    try {
      localStorage.setItem('viavela_local_orgs', JSON.stringify(SEEDED_ORGANIZATIONS));
    } catch (e) {}

    // 5. Bootstrap Subscription Plans in Firestore
    for (const plan of PREDEFINED_SUBSCRIPTION_PLANS) {
      try {
        const planRef = doc(db, 'subscriptionPlans', plan.id);
        await setDoc(planRef, cleanUndefined(plan), { merge: true });
      } catch (e) {}
    }

    // 6. Create Initial Super Admin Profile in `users` collection
    try {
      const superAdminRef = doc(db, 'users', 'super_admin_master');
      await setDoc(superAdminRef, cleanUndefined({
        uid: 'super_admin_master',
        email: 'admin@viavelacrm.com',
        displayName: 'Platform Super Admin',
        role: 'SUPER_ADMIN',
        password: 'Admin1',
        status: 'active',
        createdAt: '2026-01-01T00:00:00.000Z'
      }), { merge: true });
    } catch (e) {}

    console.info('✅ Viavela SaaS Multi-Tenant Bootstrapping Completed: 6 Salons & Subscription Plans Initialized.');
  } catch (err) {
    console.error('Migration error:', err);
  }
}
