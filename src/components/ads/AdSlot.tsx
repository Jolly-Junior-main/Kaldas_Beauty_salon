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
import { ExternalLink, Sparkles, Megaphone, Phone, ArrowRight, ChevronLeft, ChevronRight, Play } from 'lucide-react';

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
      companyName: 'Viavela Beauty Wholesale',
      mediaType: 'banner',
      slotPosition: 'slot_1',
      targetAudience: 'all',
      status: 'active',
      ctaText: 'Explore Catalog',
      destinationUrl: 'https://viavelacrm.com/supplies',
      contactPhone: '+251 911 500 600',
      impressionsCount: 150,
      clicksCount: 24,
      createdAt: new Date().toISOString()
    },
    {
      id: 'default_ad_2',
      title: '💳 Telebirr Merchant QR & Instant Digital Checkout',
      description: 'Accept instant customer payments seamlessly with Zero Transaction Fees for registered beauty salons and spas.',
      companyName: 'Ethio Telecom Telebirr',
      mediaType: 'banner',
      slotPosition: 'slot_1',
      targetAudience: 'all',
      status: 'active',
      ctaText: 'Activate Merchant QR',
      destinationUrl: 'https://telebirr.et',
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
      description: 'Upgrade your salon with salon-grade hair dryers, keratin steam irons, and sterilizers with 2-year warranty.',
      companyName: 'Milano Beauty Equipment',
      mediaType: 'image',
      imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=500&fit=crop',
      imagesList: [
        'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=500&fit=crop',
        'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=500&fit=crop',
        'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&h=500&fit=crop'
      ],
      slotPosition: 'slot_2',
      targetAudience: 'all',
      status: 'active',
      ctaText: 'Shop Equipment',
      destinationUrl: 'https://viavelacrm.com/equipment',
      contactPhone: '+251 922 400 500',
      impressionsCount: 85,
      clicksCount: 12,
      createdAt: new Date().toISOString()
    },
    {
      id: 'default_ad_video_1',
      title: '🎬 Professional Hair Serum Demo Video',
      description: 'Watch 60-second video demo on applying deep keratin treatment serum for silky smooth hair.',
      companyName: 'Keratin Pro Ethiopia',
      mediaType: 'video',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      slotPosition: 'slot_2',
      targetAudience: 'all',
      status: 'active',
      ctaText: 'Order Product Now',
      destinationUrl: 'https://viavelacrm.com/keratin',
      contactPhone: '+251 911 888 999',
      impressionsCount: 140,
      clicksCount: 28,
      createdAt: new Date().toISOString()
    }
  ],
  slot_3: [
    {
      id: 'default_ad_popup_1',
      title: '🎉 Expand Your Salon Revenue with Viavela Loyalty Club',
      description: 'Send automated SMS vouchers and double your client return rate in under 30 days.',
      companyName: 'Viavela Growth Club',
      mediaType: 'banner',
      slotPosition: 'slot_3',
      targetAudience: 'all',
      status: 'active',
      ctaText: 'Learn More',
      destinationUrl: 'https://viavelacrm.com/growth',
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
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

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

  // Photo Slideshow Auto Play
  const slides = activeAd?.imagesList && activeAd.imagesList.length > 0
    ? activeAd.imagesList
    : activeAd?.imageUrl
    ? [activeAd.imageUrl]
    : [];

  useEffect(() => {
    if (slides.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [slides.length]);

  // Rotate ad periodically if multiple campaign ads exist
  useEffect(() => {
    if (ads.length > 1) {
      const timer = setInterval(() => {
        setActiveAdIndex((prev) => (prev + 1) % ads.length);
        setCurrentSlideIndex(0);
      }, 14000);
      return () => clearInterval(timer);
    }
  }, [ads.length]);

  if (!activeAd) return null;

  const handleClick = () => {
    try {
      adEngine.trackClick(activeAd, currentOrganizationId, slot);
    } catch (e) {}
    if (activeAd.destinationUrl || activeAd.ctaUrl) {
      const targetUrl = activeAd.destinationUrl || activeAd.ctaUrl || '#';
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const getYouTubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?autoplay=1&mute=1&loop=1` : null;
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

  // --- SLOT 2: Sidebar Card / Photo Slide & Video Ad Player ---
  const ytEmbed = getYouTubeEmbedUrl(activeAd.videoUrl);

  return (
    <div className={`p-4 bg-neutral-950 border border-amber-500/40 rounded-3xl text-white space-y-3 shadow-xl animate-fade-in ${className}`}>
      {/* Header Badge */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase font-black px-2.5 py-0.5 bg-gradient-to-r from-amber-400 to-amber-500 text-neutral-950 rounded-md shadow-xs flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          <span>{activeAd.mediaType === 'video' ? 'Video Promotion' : 'Featured Partner'}</span>
        </span>
        {ads.length > 1 && (
          <span className="text-[10px] font-mono font-bold text-neutral-400">
            Ad {activeAdIndex + 1}/{ads.length}
          </span>
        )}
      </div>

      {/* 1. Video Player Ad */}
      {(activeAd.mediaType === 'video' || activeAd.videoUrl) ? (
        <div className="relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-md">
          {ytEmbed ? (
            <iframe
              src={ytEmbed}
              title={activeAd.title}
              className="w-full h-44 rounded-2xl"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          ) : (
            <video
              src={activeAd.videoUrl}
              controls
              autoPlay
              muted
              loop
              className="w-full h-44 object-cover rounded-2xl"
            />
          )}
        </div>
      ) : slides.length > 0 ? (
        /* 2. Photo Slideshow Carousel Ad */
        <div className="relative rounded-2xl overflow-hidden aspect-video bg-neutral-900 border border-neutral-800 group shadow-md">
          <img
            src={slides[currentSlideIndex % slides.length]}
            alt={activeAd.title}
            className="w-full h-full object-cover transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent pointer-events-none" />

          {/* Slide Navigation Controls */}
          {slides.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
                }}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 bg-neutral-950/70 hover:bg-neutral-950 text-white rounded-full transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 bg-neutral-950/70 hover:bg-neutral-950 text-white rounded-full transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Indicator Dots */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
                {slides.map((_, idx) => (
                  <span
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlideIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === currentSlideIndex % slides.length ? 'w-4 bg-amber-400' : 'w-1.5 bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}

      {/* Ad Details */}
      <div>
        <h4 className="text-xs font-black text-white">{activeAd.title}</h4>
        {activeAd.companyName && (
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mt-0.5">
            {activeAd.companyName}
          </span>
        )}
        <p className="text-[11px] text-neutral-300 line-clamp-2 mt-1 leading-relaxed">
          {activeAd.description}
        </p>
      </div>

      {/* Action Button */}
      <button
        onClick={handleClick}
        className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
      >
        <span>{activeAd.ctaText || 'Explore Special Offer'}</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
