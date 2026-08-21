/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Professional Vertical Portrait Advertiser Slideshow Engine
 */

import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { adEngine } from '../../lib/adEngine';
import { useTenant } from '../../lib/tenantContext';
import { Advertisement, AdSlotPosition } from '../../types';
import { ExternalLink, Sparkles, Megaphone, Phone, ChevronLeft, ChevronRight, Play, Layers } from 'lucide-react';

interface AdSlotProps {
  slot?: AdSlotPosition;
  className?: string;
}

const DEFAULT_FALLBACK_ADS: Advertisement[] = [
  {
    id: 'default_ad_side_1',
    title: '✨ Premium Italian Hair Care & Styling Equipment',
    description: 'Upgrade your salon with salon-grade hair dryers, keratin steam irons, and sterilizers with 2-year warranty.',
    companyName: 'Milano Beauty Equipment',
    mediaType: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=600&fit=crop',
    imagesList: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&h=600&fit=crop'
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
    title: '🎬 Professional Keratin Hair Serum Demo Video',
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
  },
  {
    id: 'default_ad_wholesale_1',
    title: '🌟 Luxury Organic Hair Oil & Skin Oils Wholesale',
    description: 'Direct distribution of pure Ethiopian Argan Oil, Rosemary Extract, and Lash Serums for professional salons.',
    companyName: 'Habesha Botanicals',
    mediaType: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1608248597261-e4d0450cbf1c?w=800&h=600&fit=crop',
    imagesList: [
      'https://images.unsplash.com/photo-1608248597261-e4d0450cbf1c?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&h=600&fit=crop'
    ],
    slotPosition: 'slot_2',
    targetAudience: 'all',
    status: 'active',
    ctaText: 'Get Wholesale Pricing',
    destinationUrl: 'https://viavelacrm.com/botanicals',
    contactPhone: '+251 911 555 777',
    impressionsCount: 95,
    clicksCount: 19,
    createdAt: new Date().toISOString()
  }
];

export default function AdSlot({ slot = 'slot_2', className = '' }: AdSlotProps) {
  const { currentOrganizationId } = useTenant();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Subscribe to active advertisements across Firestore, settings document, and localStorage
  useEffect(() => {
    let firestoreList: Advertisement[] = [];
    let settingsList: Advertisement[] = [];

    const combineAndSetAds = () => {
      const customAdsMap = new Map<string, Advertisement>();
      
      // 1. Settings document ads
      settingsList.forEach(a => {
        if (a.status === 'active' || !a.status) customAdsMap.set(a.id, a);
      });
      // 2. Firestore collection ads
      firestoreList.forEach(a => {
        if (a.status === 'active' || !a.status) customAdsMap.set(a.id, a);
      });
      // 3. Local storage ads
      try {
        const local = JSON.parse(localStorage.getItem('viavela_local_ads') || '[]');
        local.forEach((a: Advertisement) => {
          if (a.status === 'active' || !a.status) customAdsMap.set(a.id, { ...customAdsMap.get(a.id), ...a });
        });
      } catch (e) {}

      const finalMap = new Map<string, Advertisement>();
      if (customAdsMap.size > 0) {
        customAdsMap.forEach((ad, id) => finalMap.set(id, ad));
      } else {
        DEFAULT_FALLBACK_ADS.forEach(a => finalMap.set(a.id, a));
      }

      const list = Array.from(finalMap.values());
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setAds(list);
    };

    const handleAdUpdatedEvent = () => {
      combineAndSetAds();
    };

    window.addEventListener('viavela_ad_updated', handleAdUpdatedEvent);
    window.addEventListener('storage', handleAdUpdatedEvent);

    const unsubFirestore = onSnapshot(collection(db, 'advertisements'), (snap) => {
      firestoreList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Advertisement));
      combineAndSetAds();
    }, (err) => {
      console.warn('AdSlot firestore notice:', err);
      combineAndSetAds();
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'saas_advertisements'), (snap) => {
      if (snap.exists()) {
        settingsList = snap.data().list || [];
        combineAndSetAds();
      }
    }, (err) => {
      combineAndSetAds();
    });

    return () => {
      window.removeEventListener('viavela_ad_updated', handleAdUpdatedEvent);
      window.removeEventListener('storage', handleAdUpdatedEvent);
      unsubFirestore();
      unsubSettings();
    };
  }, []);

  const activeAd = ads[activeAdIndex % (ads.length || 1)] || DEFAULT_FALLBACK_ADS[0];

  // Track impression whenever activeAd changes
  useEffect(() => {
    if (activeAd && activeAd.id) {
      adEngine.trackImpression(activeAd, currentOrganizationId || 'global', slot);
    }
  }, [activeAd?.id, currentOrganizationId, slot]);

  // Photo Slideshow Auto Play per ad creative
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
  }, [slides.length, activeAdIndex]);

  // Rotate between different advertisers sequentially (6-second slideshow loop)
  useEffect(() => {
    if (ads.length > 1) {
      const timer = setInterval(() => {
        setActiveAdIndex((prev) => (prev + 1) % ads.length);
        setCurrentSlideIndex(0);
      }, 6000);
      return () => clearInterval(timer);
    }
  }, [ads.length]);

  if (!activeAd) return null;

  const handleClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      adEngine.trackClick(activeAd, currentOrganizationId || 'global', slot);
    } catch (err) {
      console.warn('Ad click warning:', err);
    }
    if (activeAd.destinationUrl) {
      window.open(activeAd.destinationUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const getYouTubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?autoplay=1&mute=1&loop=1` : null;
  };

  const ytEmbed = getYouTubeEmbedUrl(activeAd.videoUrl);

  return (
    <div className={`relative bg-neutral-950 border border-neutral-800 rounded-[28px] p-4 sm:p-5 text-white shadow-ios overflow-hidden flex flex-col justify-between space-y-3 animate-fade-in ${className}`}>
      
      {/* Top Header: Sponsored Badge & Advertiser Counter Carousel Controller */}
      <div className="space-y-2.5 pb-2.5 border-b border-neutral-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-gradient-to-r from-amber-400 to-amber-500 text-neutral-950 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1">
              <Megaphone className="w-3 h-3 text-neutral-950" />
              <span>Promotional Showcase</span>
            </span>
          </div>

          {/* Advertiser Count Badge */}
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold text-amber-400">
            <Layers className="w-3 h-3 text-amber-400" />
            <span>Ad {activeAdIndex + 1}/{ads.length}</span>
          </div>
        </div>

        {/* Manual Advertiser Selector Buttons */}
        {ads.length > 1 && (
          <div className="flex items-center justify-between pt-0.5">
            <button
              onClick={() => {
                setActiveAdIndex((prev) => (prev - 1 + ads.length) % ads.length);
                setCurrentSlideIndex(0);
              }}
              className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg text-[10px] font-bold border border-neutral-800 flex items-center gap-1 cursor-pointer transition-colors"
              title="Previous Advertiser"
            >
              <ChevronLeft className="w-3 h-3" />
              <span>Prev</span>
            </button>

            <div className="flex items-center gap-1">
              {ads.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveAdIndex(idx);
                    setCurrentSlideIndex(0);
                  }}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === activeAdIndex ? 'w-4 bg-amber-400' : 'w-1.5 bg-neutral-700 hover:bg-neutral-500'
                  }`}
                  title={`Switch to Advertiser ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={() => {
                setActiveAdIndex((prev) => (prev + 1) % ads.length);
                setCurrentSlideIndex(0);
              }}
              className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg text-[10px] font-bold border border-neutral-800 flex items-center gap-1 cursor-pointer transition-colors"
              title="Next Advertiser"
            >
              <span>Next</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Main Creative Showcase Area (Video, Photo Slideshow, or Banner) */}
      <div className="my-2 space-y-3 flex-1 flex flex-col justify-center">
        {(activeAd.mediaType === 'video' || activeAd.videoUrl) ? (
          /* 1. Video Player Ad Creative */
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
          /* 2. Photo Slideshow Carousel Creative */
          <div 
            onClick={handleClick}
            className="relative rounded-2xl overflow-hidden aspect-[16/10] max-h-44 bg-neutral-900 border border-neutral-800 group shadow-md cursor-pointer"
          >
            <img
              src={slides[currentSlideIndex % slides.length]}
              alt={activeAd.title}
              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-80" />

            {/* Inner Photo Controls */}
            {slides.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-neutral-950/80 hover:bg-neutral-950 text-white rounded-full transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-neutral-950/80 hover:bg-neutral-950 text-white rounded-full transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
                  {slides.map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === currentSlideIndex % slides.length ? 'w-4 bg-amber-400' : 'w-1.5 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}

        {/* Advertiser Copy & Company Name */}
        <div onClick={handleClick} className="space-y-1.5 cursor-pointer group">
          {activeAd.companyName && (
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block font-mono">
              {activeAd.companyName}
            </span>
          )}
          <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors leading-snug">
            {activeAd.title}
          </h4>
          <p className="text-xs text-neutral-300 line-clamp-3 leading-relaxed font-normal">
            {activeAd.description}
          </p>
        </div>
      </div>

      {/* Footer Controls & Call-to-Action Link */}
      <div className="pt-4 border-t border-neutral-800/80 space-y-2.5">
        {activeAd.contactPhone && (
          <a
            href={`tel:${activeAd.contactPhone}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-amber-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call Partner: {activeAd.contactPhone}</span>
          </a>
        )}

        <button
          onClick={handleClick}
          className="w-full py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer active:scale-95"
        >
          <span>{activeAd.ctaText || 'Claim Special Offer / Visit Website'}</span>
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
