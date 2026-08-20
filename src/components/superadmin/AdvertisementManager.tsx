/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Super Admin: Advertisement Manager & Campaign Creator
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, cleanUndefined, uploadToStorage } from '../../lib/firebase';
import { AdMediaType, AdSlotPosition, AdStatus, AdTargetAudience, Advertisement, Organization } from '../../types';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  Upload, 
  ExternalLink, 
  Eye, 
  MousePointerClick, 
  BarChart3, 
  Check, 
  X,
  PlayCircle,
  Image as ImageIcon
} from 'lucide-react';

interface AdvertisementManagerProps {
  organizations: Organization[];
}

export default function AdvertisementManager({ organizations }: AdvertisementManagerProps) {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'analytics'>('campaigns');

  // Form states
  // Form states
  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [ctaText, setCtaText] = useState('Learn More');
  const [slotPosition, setSlotPosition] = useState<AdSlotPosition>('slot_1');
  const [mediaType, setMediaType] = useState<AdMediaType>('image');
  const [targetAudience, setTargetAudience] = useState<AdTargetAudience>('all');
  const [targetOrgId, setTargetOrgId] = useState<string>('');
  const [campaignPrice, setCampaignPrice] = useState<number>(1500);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [slideshowUrls, setSlideshowUrls] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'advertisements'), (snap) => {
      const list: Advertisement[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Advertisement));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAds(list);
    });
    return () => unsub();
  }, []);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setMediaPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let uploadedUrl = mediaUrlInput.trim();
      if (mediaFile) {
        try {
          uploadedUrl = await uploadToStorage('ad_media', mediaFile);
        } catch (err) {
          console.warn('Firebase storage notice, using base64 preview:', err);
          uploadedUrl = mediaPreview;
        }
      }

      if (!uploadedUrl) {
        uploadedUrl = mediaPreview || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=450&fit=crop';
      }

      const parsedSlideshow = slideshowUrls.split('\n').map(s => s.trim()).filter(Boolean);
      const adRef = doc(collection(db, 'advertisements'));
      const now = new Date();

      const newAd: Advertisement = {
        id: adRef.id,
        title: title.trim(),
        companyName: companyName.trim(),
        description: description.trim(),
        imageUrl: mediaType === 'image' || mediaType === 'banner' ? uploadedUrl : undefined,
        videoUrl: mediaType === 'video' ? (videoUrlInput.trim() || uploadedUrl) : (videoUrlInput.trim() || undefined),
        imagesList: parsedSlideshow.length > 0 ? parsedSlideshow : (uploadedUrl ? [uploadedUrl] : undefined),
        destinationUrl: destinationUrl.trim() || 'https://viavelacrm.com',
        contactPhone: contactPhone.trim() || undefined,
        ctaText: ctaText.trim() || 'Learn More',
        startDate: now.toISOString(),
        endDate: new Date(now.getTime() + 30 * 86400000).toISOString(),
        status: 'active',
        targetAudience,
        targetOrganizationId: targetOrgId || undefined,
        slotPosition,
        mediaType,
        impressionsCount: 0,
        clicksCount: 0,
        revenueGenerated: Number(campaignPrice) || 0,
        createdAt: now.toISOString()
      };

      await setDoc(adRef, cleanUndefined(newAd));
      setShowCreateModal(false);
      // Reset
      setTitle('');
      setCompanyName('');
      setDescription('');
      setDestinationUrl('');
      setMediaUrlInput('');
      setVideoUrlInput('');
      setSlideshowUrls('');
      setMediaFile(null);
      setMediaPreview('');
    } catch (err) {
      console.error('Failed to create ad:', err);
      alert('Error creating campaign. Please check all fields.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (ad: Advertisement) => {
    const newStatus = ad.status === 'active' ? 'paused' : 'active';
    await updateDoc(doc(db, 'advertisements', ad.id), { status: newStatus });
  };

  const handleDeleteAd = async (adId: string) => {
    if (window.confirm('Are you sure you want to delete this ad campaign?')) {
      await deleteDoc(doc(db, 'advertisements', adId));
    }
  };

  const totalImpressions = ads.reduce((sum, a) => sum + (a.impressionsCount || 0), 0);
  const totalClicks = ads.reduce((sum, a) => sum + (a.clicksCount || 0), 0);
  const overallCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
  const totalAdRevenue = ads.reduce((sum, a) => sum + (a.revenueGenerated || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Advertisement Engine & Campaigns</h2>
          <p className="text-xs text-neutral-500">Deploy non-intrusive sponsor promotions across Slot 1, Slot 2, and Slot 3 in all salon CRMs.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-neutral-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'campaigns' ? 'bg-white text-neutral-900 shadow-xs font-black' : 'text-neutral-600'
              }`}
            >
              Campaigns ({ads.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'analytics' ? 'bg-white text-neutral-900 shadow-xs font-black' : 'text-neutral-600'
              }`}
            >
              Analytics
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ios-active-scale"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* High-level Ad Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-neutral-200/70 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-neutral-400 block">Total Impressions</span>
          <p className="text-xl font-black font-mono text-neutral-900 mt-1">{totalImpressions.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-neutral-200/70 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-neutral-400 block">Total Clicks</span>
          <p className="text-xl font-black font-mono text-neutral-900 mt-1">{totalClicks.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-neutral-200/70 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-neutral-400 block">Click-Through Rate (CTR)</span>
          <p className="text-xl font-black font-mono text-emerald-600 mt-1">{overallCtr}%</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-neutral-200/70 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-neutral-400 block">Total Ad Revenue</span>
          <p className="text-xl font-black font-mono text-amber-700 mt-1">{totalAdRevenue.toLocaleString()} ETB</p>
        </div>
      </div>

      {activeTab === 'campaigns' ? (
        /* Campaigns Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ads.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-3xl border border-neutral-200 text-center text-neutral-400">
              <Sparkles className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-xs font-semibold">No active advertisement campaigns created yet.</p>
            </div>
          ) : (
            ads.map((ad) => (
              <div key={ad.id} className="bg-white rounded-3xl border border-neutral-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      ad.status === 'active' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-neutral-100 text-neutral-600'
                    }`}>
                      {ad.status}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                      {ad.slotPosition.replace('_', ' ')}
                    </span>
                  </div>

                  {ad.imageUrl && (
                    <div className="rounded-xl overflow-hidden aspect-video bg-neutral-100 border border-neutral-200">
                      <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-black text-neutral-900">{ad.title}</h3>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase">{ad.companyName}</p>
                    <p className="text-xs text-neutral-600 line-clamp-2 mt-1">{ad.description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/60 text-center">
                    <div>
                      <span className="text-[8px] uppercase font-bold text-neutral-400 block">Views</span>
                      <span className="text-xs font-black font-mono">{ad.impressionsCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-bold text-neutral-400 block">Clicks</span>
                      <span className="text-xs font-black font-mono">{ad.clicksCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-bold text-neutral-400 block">CTR</span>
                      <span className="text-xs font-black font-mono text-emerald-600">
                        {ad.impressionsCount ? ((ad.clicksCount / ad.impressionsCount) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleStatus(ad)}
                    className="text-xs font-bold text-neutral-700 hover:text-neutral-900"
                  >
                    {ad.status === 'active' ? 'Pause Campaign' : 'Resume'}
                  </button>

                  <button
                    onClick={() => handleDeleteAd(ad.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Detailed Analytics View */
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider">Slot Performance Telemetry</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { slot: 'slot_1', name: 'Slot 1: Header Top Ribbon', desc: 'Prominent ribbon above main navigation' },
              { slot: 'slot_2', name: 'Slot 2: Dashboard Sidebar Card', desc: 'Featured partner card in intelligence feed' },
              { slot: 'slot_3', name: 'Slot 3: Queue & Footer Banner', desc: 'Companion banner next to queue tickets' }
            ].map(sl => {
              const slotAds = ads.filter(a => a.slotPosition === sl.slot || a.slotPosition === 'all');
              const imp = slotAds.reduce((sum, a) => sum + (a.impressionsCount || 0), 0);
              const clk = slotAds.reduce((sum, a) => sum + (a.clicksCount || 0), 0);
              const ctr = imp > 0 ? ((clk / imp) * 100).toFixed(2) : '0.00';

              return (
                <div key={sl.slot} className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-2">
                  <h4 className="text-xs font-black text-neutral-900">{sl.name}</h4>
                  <p className="text-[10px] text-neutral-500">{sl.desc}</p>
                  <div className="pt-2 border-t border-neutral-200/60 flex justify-between text-xs font-mono font-bold">
                    <span>Views: {imp.toLocaleString()}</span>
                    <span>Clicks: {clk.toLocaleString()}</span>
                    <span className="text-emerald-700">CTR: {ctr}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Ad Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto font-sans animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-neutral-200 shadow-2xl overflow-hidden my-8">
            <div className="p-6 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">Create Advertisement Campaign</h3>
                  <p className="text-xs text-neutral-400">Launch a new banner or sponsored ad in salon dashboards</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAd} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">Campaign Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 20% Off L'Oreal Hair Serum"
                    className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">Company / Sponsor Name *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. L'Oreal Ethiopia Distribution"
                    className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-neutral-700">Ad Description / Body Copy *</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Exclusive discount available for professional salon partners..."
                  className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">Target Ad Slot *</label>
                  <select
                    value={slotPosition}
                    onChange={(e) => setSlotPosition(e.target.value as AdSlotPosition)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold"
                  >
                    <option value="slot_1">Slot 1 (Header Top Ribbon)</option>
                    <option value="slot_2">Slot 2 (Sidebar/Card)</option>
                    <option value="slot_3">Slot 3 (Queue/Footer)</option>
                    <option value="all">All 3 Slots</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">Media Type</label>
                  <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value as AdMediaType)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold"
                  >
                    <option value="image">Image Banner</option>
                    <option value="video">Video Ad</option>
                    <option value="banner">Text Banner</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">Campaign Fee (ETB)</label>
                  <input
                    type="number"
                    value={campaignPrice}
                    onChange={(e) => setCampaignPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">Destination Website URL</label>
                  <input
                    type="url"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://sponsor.com/offer"
                    className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 font-mono font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">Call-to-Action Button Text</label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="e.g. Claim 20% Off"
                    className="w-full px-3.5 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 font-medium"
                  />
                </div>
              </div>

              {/* Media URL / Video / Slideshow Inputs */}
              <div className="space-y-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">Image Asset URL (Optional Direct URL)</label>
                  <input
                    type="url"
                    value={mediaUrlInput}
                    onChange={(e) => setMediaUrlInput(e.target.value)}
                    placeholder="https://images.unsplash.com/... or image link"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-xl font-mono"
                  />
                </div>

                {mediaType === 'video' && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-neutral-700">Video Ad URL (MP4 / YouTube Link)</label>
                    <input
                      type="url"
                      value={videoUrlInput}
                      onChange={(e) => setVideoUrlInput(e.target.value)}
                      placeholder="https://commondatastorage... or YouTube video URL"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-xl font-mono"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-neutral-700">Photo Slideshow Image URLs (One URL per line)</label>
                  <textarea
                    rows={2}
                    value={slideshowUrls}
                    onChange={(e) => setSlideshowUrls(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-1&#10;https://images.unsplash.com/photo-2"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-xl font-mono"
                  />
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase">or Upload File:</span>
                  {mediaPreview ? (
                    <img src={mediaPreview} alt="Preview" className="w-12 h-10 rounded-lg object-cover border border-neutral-200" />
                  ) : null}
                  <label className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-800 text-[11px] font-bold rounded-xl border border-neutral-300 flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Local Creative</span>
                    <input type="file" accept="image/*,video/*" onChange={handleMediaChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !title || !companyName}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-40"
                >
                  {isSaving ? 'Publishing...' : 'Publish Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
