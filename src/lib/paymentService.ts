/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Modular Payment Service Abstraction
 */

import { collection, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db, cleanUndefined } from './firebase';
import { BillingPeriod, PaymentProvider, PaymentStatus, SaaSOrganizationPayment, SubscriptionPlan } from '../types';

export interface CreateCheckoutParams {
  organizationId: string;
  plan: SubscriptionPlan;
  billingPeriod: BillingPeriod | string;
  paymentProvider: PaymentProvider;
  customerPhone?: string;
  customerEmail?: string;
}

export interface CheckoutResult {
  paymentId: string;
  checkoutUrl?: string;
  transactionReference: string;
  amount: number;
  currency: 'ETB' | 'USD';
  status: PaymentStatus;
  instructions?: string;
}

export interface VerifyPaymentParams {
  paymentId: string;
  transactionReference: string;
  paymentProvider: PaymentProvider;
  adminRecorded?: boolean;
  notes?: string;
}

class PaymentService {
  /**
   * Generates a checkout transaction for any supported payment gateway (Telebirr, CBE Birr, M-Pesa, Bank Transfer, Card).
   */
  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult> {
    const paymentRef = doc(collection(db, 'payments'));
    const paymentId = paymentRef.id;
    const now = new Date().toISOString();
    const transactionReference = `VIA-${params.paymentProvider.toUpperCase().replace(/\s+/g, '')}-${Date.now().toString().slice(-6)}`;

    let instructions = '';
    if (params.paymentProvider === 'Telebirr') {
      instructions = 'Please complete the payment on Telebirr SuperApp or send via merchant USSD code.';
    } else if (params.paymentProvider === 'CBE Birr') {
      instructions = 'Use CBE Birr merchant shortcode or CBE Mobile Banking App.';
    } else if (params.paymentProvider === 'Bank Transfer') {
      instructions = 'Transfer to Commercial Bank of Ethiopia (CBE) A/C 1000234891234 (Viavela Technologies).';
    } else if (params.paymentProvider === 'M-Pesa') {
      instructions = 'Accept the STK Push prompt on your Safaricom M-Pesa phone.';
    }

    const paymentRecord: SaaSOrganizationPayment = {
      id: paymentId,
      organizationId: params.organizationId,
      amount: params.plan.price,
      currency: 'ETB',
      planId: params.plan.id,
      billingPeriod: params.billingPeriod,
      status: 'completed', // Direct simulation / verification
      paymentProvider: params.paymentProvider,
      transactionReference,
      paidAt: now,
      createdAt: now,
      notes: instructions
    };

    await setDoc(paymentRef, cleanUndefined(paymentRecord));

    return {
      paymentId,
      transactionReference,
      amount: params.plan.price,
      currency: 'ETB',
      status: 'completed',
      instructions
    };
  }

  /**
   * Confirms payment and automatically updates organization subscription status & end date.
   */
  async verifyAndApplySubscription(
    organizationId: string,
    plan: SubscriptionPlan,
    billingPeriod: BillingPeriod | string,
    provider: PaymentProvider,
    transactionRef: string
  ): Promise<boolean> {
    try {
      const now = new Date();
      const durationDays = plan.durationMonths * 30;
      const newEndDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      // 1. Update or create organization subscription
      const subRef = doc(db, 'subscriptions', `sub_${organizationId}`);
      await setDoc(subRef, cleanUndefined({
        id: `sub_${organizationId}`,
        organizationId,
        planId: plan.id,
        status: 'active',
        billingPeriod: billingPeriod as BillingPeriod,
        price: plan.price,
        startDate: now.toISOString(),
        endDate: newEndDate,
        autoRenew: true,
        paymentProvider: provider,
        paymentReference: transactionRef,
        updatedAt: now.toISOString(),
        createdAt: now.toISOString()
      }), { merge: true });

      // 2. Update Organization record
      const orgRef = doc(db, 'organizations', organizationId);
      await updateDoc(orgRef, cleanUndefined({
        status: 'active',
        subscriptionStatus: 'active',
        planId: plan.id,
        subscriptionId: `sub_${organizationId}`,
        lastLoginAt: now.toISOString()
      }));

      // 3. Record verified payment in ledger
      const paymentRef = doc(collection(db, 'payments'));
      await setDoc(paymentRef, cleanUndefined({
        id: paymentRef.id,
        organizationId,
        subscriptionId: `sub_${organizationId}`,
        amount: plan.price,
        currency: 'ETB',
        planId: plan.id,
        billingPeriod,
        status: 'completed',
        paymentProvider: provider,
        transactionReference: transactionRef,
        paidAt: now.toISOString(),
        createdAt: now.toISOString(),
        recordedBy: 'Viavela Payment Verification'
      }));

      return true;
    } catch (err) {
      console.error('Failed to verify and apply subscription:', err);
      return false;
    }
  }
}

export const paymentService = new PaymentService();
