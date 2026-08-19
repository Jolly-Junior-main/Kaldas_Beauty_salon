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
import { ExternalLink, Sparkles, Volume2, VolumeX } from 'lucide-react';

interface AdSlotProps {
  slot: AdSlotPosition;
  className?: string;
}

export default function AdSlot({ slot, className = '' }: AdSlotProps) {
  const { currentOrganizationId, isTrialActive } = useTenant();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

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

      setAds(matchedAds);
    }, (err) => {
      console.warn('AdSlot listener warning:', err);
    });

    return () => unsub();
  }, [slot, isTrialActive, currentOrganizationId]);

  const activeAd = ads[activeAdIndex % (ads.length || 1)];

  // Track impression when active ad changes
  useEffect(() => {
    if (activeAd) {
      adEngine.trackImpression(activeAd, currentOrganizationId, slot);
    }
  }, [activeAd, currentOrganizationId, slot]);

  if (!activeAd) return null;

  const handleClick = () => {
    adEngine.trackClick(activeAd, currentOrganizationId, slot);
  };

  // --- SLOT 1: Header/Top Ribbon Banner ---
  if (slot === 'slot_1') {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-r from-neutral-900 via-amber-950/80 to-neutral-900 border border-amber-500/30 rounded-2xl p-3 shadow-md text-white ${className}`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 bg-amber-500 text-neutral-950 text-[9px] font-black uppercase tracking-wider rounded-md">
              Sponsored
            </span>
            <div>
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {activeAd.title}
              </h4>
              <p className="text-[11px] text-neutral-300 line-clamp-1">{activeAd.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeAd.contactPhone && (
              <span className="text-[10px] text-amber-200 font-mono hidden md:inline">
                📞 {activeAd.contactPhone}
              </span>
            )}
            <button
              onClick={handleClick}
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-black rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer ios-active-scale"
            >
              <span>{activeAd.ctaText || 'Learn More'}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- SLOT 2: Sidebar / Dashboard Intelligence Card ---
  if (slot === 'slot_2') {
    return (
      <div className={`bg-neutral-900/90 backdrop-blur-md rounded-2xl border border-neutral-800 p-4 shadow-xl text-white space-y-3 overflow-hidden ${className}`}>
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
            Featured Partner
          </span>
          <span className="text-[10px] text-neutral-400 font-medium">{activeAd.companyName}</span>
        </div>

        {activeAd.imageUrl && (
          <div className="relative rounded-xl overflow-hidden aspect-video bg-neutral-950 border border-neutral-800">
            <img 
              src={activeAd.imageUrl} 
              alt={activeAd.title} 
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
              onClick={handleClick}
            />
          </div>
        )}

        {activeAd.videoUrl && (
          <div className="relative rounded-xl overflow-hidden aspect-video bg-neutral-950">
            <video 
              src={activeAd.videoUrl} 
              autoPlay 
              loop 
              muted={isMuted} 
              playsInline
              className="w-full h-full object-cover"
            />
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className="absolute bottom-2 right-2 p-1.5 bg-neutral-900/80 rounded-full text-neutral-300 hover:text-white"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        <div>
          <h4 className="text-xs font-black text-white">{activeAd.title}</h4>
          <p className="text-[11px] text-neutral-300 leading-relaxed mt-1">{activeAd.description}</p>
        </div>

        <button
          onClick={handleClick}
          className="w-full py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ios-active-scale"
        >
          <span>{activeAd.ctaText || 'Claim Special Offer'}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // --- SLOT 3: Queue & Footer Banner ---
  return (
    <div className={`bg-neutral-50 rounded-2xl border border-neutral-200/80 p-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-neutral-800 ${className}`}>
      <div className="flex items-center gap-3">
        {activeAd.imageUrl && (
          <img 
            src={activeAd.imageUrl} 
            alt={activeAd.title} 
            className="w-12 h-12 rounded-xl object-cover border border-neutral-200 shrink-0" 
          />
        )}
        <div>
          <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-100/80 px-2 py-0.2 rounded-md">
            Partner Notice
          </span>
          <h4 className="text-xs font-black text-neutral-900 mt-0.5">{activeAd.title}</h4>
          <p className="text-[10px] text-neutral-500 line-clamp-1">{activeAd.description}</p>
        </div>
      </div>

      <button
        onClick={handleClick}
        className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1 shrink-0 cursor-pointer ios-active-scale"
      >
        <span>{activeAd.ctaText || 'View Details'}</span>
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}
