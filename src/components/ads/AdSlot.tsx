/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Professional Advertisement Slots (Slot 1, Slot 2, Slot 3)
 */

import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { adEngine } from '../../lib/adEngine';
import { useTenant } from '../../lib/tenantContext';
import { Advertisement, AdSlotPosition } from '../../types';
import { ExternalLink, Sparkles, Megaphone, Phone, ArrowRight } from 'lucide-react';

interface AdSlotProps {
  slot: AdSlotPosition;
  className?: string;
}

const DEFAULT_FALLBACK_ADS: Record<AdSlotPosition, Advertisement[]> = {
  slot_1: [
    {
      id: 'default_ad_1',
      title: '🌟 Viavela Pro Salon Supply & Wholesale Partner',
      description: 'Get up to 25% discount on bulk professional shampoos, hair oils, keratin treatments, and disposable salon supplies with express delivery in Addis Ababa.',
      advertiserName: 'Viavela Beauty Wholesale',
      adType: 'banner',
      slotPosition: 'slot_1',
      targetAudience: 'all',
      status: 'active',
      ctaText: 'Explore Catalog',
      ctaUrl: 'https://viavelacrm.com/supplies',
      contactPhone: '+251 911 500 600',
      impressionsCount: 150,
      clicksCount: 24,
      createdAt: new Date().toISOString()
    },
    {
      id: 'default_ad_2',
      title: '💳 Telebirr Merchant QR & Instant Digital Checkout',
      description: 'Accept instant customer payments seamlessly with Zero Transaction Fees for registered beauty salons and spas.',
      advertiserName: 'Ethio Telecom Telebirr',
      adType: 'banner',
      slotPosition: 'slot_1',
      targetAudience: 'all',
      status: 'active',
      ctaText: 'Activate Merchant QR',
      ctaUrl: 'https://telebirr.et',
      contactPhone: '127',
      impressionsCount: 320,
      clicksCount: 45,
      createdAt: new Date().toISOString()
    }
  ],
  slot_2: [
    {
      id: 'default_ad_side_1',
      title: '✨ Premium Italian Hair Care & Styling Equipment',
      description: 'Upgrade your salon with salon-grade hair dryers, curling irons, and sterilizers with 2-year warranty.',
      advertiserName: 'Milano Beauty Equipment',
      adType: 'banner',
      slotPosition: 'slot_2',
      targetAudience: 'all',
      status: 'active',
      ctaText: 'Shop Equipment',
      ctaUrl: 'https://viavelacrm.com/equipment',
      contactPhone: '+251 922 400 500',
      impressionsCount: 85,
      clicksCount: 12,
      createdAt: new Date().toISOString()
    }
  ],
  slot_3: [
    {
      id: 'default_ad_popup_1',
      title: '🎉 Expand Your Salon Revenue with Viavela Loyalty Club',
      description: 'Send automated SMS vouchers and double your client return rate in under 30 days.',
      advertiserName: 'Viavela Growth Club',
      adType: 'banner',
      slotPosition: 'slot_3',
      targetAudience: 'all',
      status: 'active',
      ctaText: 'Learn More',
      ctaUrl: 'https://viavelacrm.com/growth',
      contactPhone: '+251 900 000 000',
      impressionsCount: 40,
      clicksCount: 9,
      createdAt: new Date().toISOString()
    }
  ],
  all: []
};

export default function AdSlot({ slot, className = '' }: AdSlotProps) {
  const { currentOrganizationId, isTrialActive } = useTenant();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [activeAdIndex, setActiveAdIndex] = useState(0);

  // Subscribe to active advertisements
  useEffect(() => {
    const q = query(
      collection(db, 'advertisements'),
      where('status', '==', 'active')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const now = new Date().toISOString();
      const matchedAds: Advertisement[] = [];

      snapshot.forEach((docSnap) => {
        const ad = { id: docSnap.id, ...docSnap.data() } as Advertisement;
        
        // Slot matching
        const slotMatches = ad.slotPosition === slot || ad.slotPosition === 'all';
        if (!slotMatches) return;

        // Date validity matching
        if (ad.startDate && ad.startDate > now) return;
        if (ad.endDate && ad.endDate < now) return;

        // Target audience matching
        if (ad.targetAudience === 'trial_only' && !isTrialActive) return;
        if (ad.targetAudience === 'paid_only' && isTrialActive) return;
        if (ad.targetOrganizationId && ad.targetOrganizationId !== currentOrganizationId) return;

        matchedAds.push(ad);
      });

      // Fallback to default promotional partner ads if none created yet
      if (matchedAds.length === 0 && DEFAULT_FALLBACK_ADS[slot]?.length > 0) {
        setAds(DEFAULT_FALLBACK_ADS[slot]);
      } else {
        setAds(matchedAds);
      }
    }, (err) => {
      console.warn('AdSlot listener notice:', err);
      if (DEFAULT_FALLBACK_ADS[slot]?.length > 0) {
        setAds(DEFAULT_FALLBACK_ADS[slot]);
      }
    });

    return () => unsub();
  }, [slot, isTrialActive, currentOrganizationId]);

  const activeAd = ads[activeAdIndex % (ads.length || 1)] || DEFAULT_FALLBACK_ADS[slot]?.[0];

  // Rotate ad periodically if multiple
  useEffect(() => {
    if (ads.length > 1) {
      const timer = setInterval(() => {
        setActiveAdIndex((prev) => (prev + 1) % ads.length);
      }, 12000);
      return () => clearInterval(timer);
    }
  }, [ads.length]);

  if (!activeAd) return null;

  const handleClick = () => {
    try {
      adEngine.trackClick(activeAd, currentOrganizationId, slot);
    } catch (e) {}
    if (activeAd.ctaUrl) {
      window.open(activeAd.ctaUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // --- SLOT 1: Header/Top Ribbon Banner ---
  if (slot === 'slot_1' || slot === 'all') {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 border border-amber-500/40 rounded-2xl p-3 sm:p-3.5 shadow-md text-white animate-fade-in ${className}`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-amber-500 text-neutral-950 text-[9px] font-black uppercase tracking-wider rounded-md shadow-xs flex items-center gap-1 shrink-0">
              <Megaphone className="w-2.5 h-2.5" />
              <span>Sponsored</span>
            </span>
            <div>
              <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {activeAd.title}
              </h4>
              <p className="text-[11px] text-neutral-300 line-clamp-1 mt-0.5">{activeAd.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeAd.contactPhone && (
              <span className="text-[10px] text-amber-200 font-mono hidden md:inline bg-neutral-850 px-2.5 py-1 rounded-lg border border-neutral-800">
                📞 {activeAd.contactPhone}
              </span>
            )}
            <button
              onClick={handleClick}
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 text-[11px] font-black rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
            >
              <span>{activeAd.ctaText || 'View Partner Offer'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- SLOT 2: Sidebar / Card Ad ---
  return (
    <div className={`p-4 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-amber-500/30 rounded-2xl text-white space-y-2.5 shadow-md ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase font-black px-2 py-0.5 bg-amber-500 text-neutral-950 rounded-md">
          Partner Spotlight
        </span>
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
      </div>
      <h4 className="text-xs font-bold text-amber-300">{activeAd.title}</h4>
      <p className="text-[11px] text-neutral-300 leading-relaxed">{activeAd.description}</p>
      <button
        onClick={handleClick}
        className="w-full py-2 bg-neutral-800 hover:bg-neutral-750 text-amber-400 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        <span>{activeAd.ctaText || 'Learn More'}</span>
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}
