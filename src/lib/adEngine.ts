/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Advertisement Engine
 */

import { collection, doc, updateDoc, increment, setDoc, getDoc } from 'firebase/firestore';
import { db, cleanUndefined } from './firebase';
import { AdAnalyticsRecord, Advertisement } from '../types';

class AdEngine {
  private recordedImpressions = new Set<string>();

  /**
   * Tracks an advertisement impression (debounced per session).
   */
  async trackImpression(ad: Advertisement, organizationId: string, slotPosition: string) {
    if (!ad || !ad.id) return;
    const key = `${ad.id}_${organizationId || 'global'}_${slotPosition}_${new Date().toDateString()}`;
    if (this.recordedImpressions.has(key)) return;
    this.recordedImpressions.add(key);

    const newImpCount = (ad.impressionsCount || 0) + 1;

    // 1. Write to advertisements collection
    try {
      const adRef = doc(db, 'advertisements', ad.id);
      await setDoc(adRef, { impressionsCount: newImpCount }, { merge: true });
    } catch (err) {
      console.warn('Ad impression collection write notice:', err);
    }

    // 2. Settings document backup update
    try {
      const settingsRef = doc(db, 'settings', 'saas_advertisements');
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        const list: Advertisement[] = snap.data().list || [];
        const updated = list.map(a => a.id === ad.id ? { ...a, impressionsCount: newImpCount } : a);
        await setDoc(settingsRef, { list: updated }, { merge: true });
      }
    } catch (e) {}

    // 3. Local storage update
    try {
      const local = JSON.parse(localStorage.getItem('viavela_local_ads') || '[]');
      const updatedLocal = local.map((a: any) => a.id === ad.id ? { ...a, impressionsCount: newImpCount } : a);
      localStorage.setItem('viavela_local_ads', JSON.stringify(updatedLocal));
    } catch (e) {}

    // 4. Record analytic event
    try {
      const eventRef = doc(collection(db, 'ad_analytics'));
      const record: AdAnalyticsRecord = {
        id: eventRef.id,
        adId: ad.id,
        organizationId: organizationId || 'global',
        eventType: 'impression',
        slotPosition,
        timestamp: new Date().toISOString()
      };
      await setDoc(eventRef, cleanUndefined(record));
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('viavela_ad_updated', { detail: { adId: ad.id, type: 'impression' } }));
  }

  /**
   * Tracks an advertisement click event and redirects to destination URL.
   */
  async trackClick(ad: Advertisement, organizationId: string, slotPosition: string) {
    if (!ad || !ad.id) return;
    const newClickCount = (ad.clicksCount || 0) + 1;

    // 1. Write to advertisements collection
    try {
      const adRef = doc(db, 'advertisements', ad.id);
      await setDoc(adRef, { clicksCount: newClickCount }, { merge: true });
    } catch (err) {
      console.warn('Ad click collection write notice:', err);
    }

    // 2. Settings document backup update
    try {
      const settingsRef = doc(db, 'settings', 'saas_advertisements');
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        const list: Advertisement[] = snap.data().list || [];
        const updated = list.map(a => a.id === ad.id ? { ...a, clicksCount: newClickCount } : a);
        await setDoc(settingsRef, { list: updated }, { merge: true });
      }
    } catch (e) {}

    // 3. Local storage update
    try {
      const local = JSON.parse(localStorage.getItem('viavela_local_ads') || '[]');
      const updatedLocal = local.map((a: any) => a.id === ad.id ? { ...a, clicksCount: newClickCount } : a);
      localStorage.setItem('viavela_local_ads', JSON.stringify(updatedLocal));
    } catch (e) {}

    // 4. Record analytic event
    try {
      const eventRef = doc(collection(db, 'ad_analytics'));
      const record: AdAnalyticsRecord = {
        id: eventRef.id,
        adId: ad.id,
        organizationId: organizationId || 'global',
        eventType: 'click',
        slotPosition,
        timestamp: new Date().toISOString()
      };
      await setDoc(eventRef, cleanUndefined(record));
    } catch (e) {}

    if (ad.destinationUrl) {
      window.open(ad.destinationUrl, '_blank', 'noopener,noreferrer');
    }
  }
}

export const adEngine = new AdEngine();
