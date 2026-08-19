/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Dynamic 14-Day Trial & Subscription Status Ribbon
 */

import React, { useState } from 'react';
import { useTenant } from '../../lib/tenantContext';
import { Sparkles, Clock, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import SubscriptionRenewalModal from './SubscriptionRenewalModal';

export default function TrialBanner() {
  const { currentOrganization, daysRemainingInTrial, isTrialActive, isExpired, subscriptionStatus } = useTenant();
  const [showRenewalModal, setShowRenewalModal] = useState(false);

  // If subscription is permanently active and not on trial, render quiet active indicator or null
  if (subscriptionStatus === 'active') {
    return (
      <>
        {showRenewalModal && (
          <SubscriptionRenewalModal 
            onClose={() => setShowRenewalModal(false)}
            initialPlanId={currentOrganization?.planId || 'plan_1y'}
          />
        )}
      </>
    );
  }

  // Determine alert text and theme based on dynamic days remaining
  let bannerBg = 'from-amber-500/15 via-amber-500/10 to-amber-500/5 border-amber-300 text-amber-950';
  let bannerIcon = <Clock className="w-4 h-4 text-amber-600 animate-pulse" />;
  let bannerText = `Your free trial ends in ${daysRemainingInTrial} day${daysRemainingInTrial === 1 ? '' : 's'}.`;

  if (daysRemainingInTrial <= 1) {
    bannerBg = 'from-red-500/20 via-red-500/15 to-red-500/10 border-red-300 text-red-950';
    bannerIcon = <AlertTriangle className="w-4 h-4 text-red-600" />;
    bannerText = 'Your trial ends tomorrow! Choose a subscription plan to continue uninterrupted.';
  } else if (daysRemainingInTrial <= 3) {
    bannerBg = 'from-red-500/15 via-amber-500/15 to-amber-500/10 border-amber-400 text-amber-950';
    bannerIcon = <AlertTriangle className="w-4 h-4 text-amber-700" />;
    bannerText = `Your trial ends in ${daysRemainingInTrial} days. Choose a subscription plan to continue.`;
  } else if (daysRemainingInTrial <= 7) {
    bannerBg = 'from-amber-500/20 via-amber-500/10 to-amber-500/5 border-amber-300 text-amber-950';
    bannerText = `Your trial ends in ${daysRemainingInTrial} days.`;
  }

  if (isExpired) {
    bannerBg = 'from-red-600/20 via-red-600/15 to-red-600/10 border-red-400 text-red-950';
    bannerIcon = <AlertTriangle className="w-4 h-4 text-red-700" />;
    bannerText = 'Your free trial has ended. Select a subscription plan to unlock full CRM access.';
  }

  return (
    <>
      <div className={`w-full bg-gradient-to-r ${bannerBg} border-b px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-semibold shadow-2xs`}>
        <div className="flex items-center gap-2.5">
          {bannerIcon}
          <span>{bannerText}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRenewalModal(true)}
            className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition-all shadow-xs cursor-pointer ios-active-scale"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{isExpired ? 'Renew Subscription' : 'Upgrade Plan'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {showRenewalModal && (
        <SubscriptionRenewalModal 
          onClose={() => setShowRenewalModal(false)}
          initialPlanId={currentOrganization?.planId || 'plan_1y'}
        />
      )}
    </>
  );
}
