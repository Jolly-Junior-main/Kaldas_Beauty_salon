/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Advertisement Engine
 */

import { collection, doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { db, cleanUndefined } from './firebase';
import { AdAnalyticsRecord, Advertisement } from '../types';

class AdEngine {
  private recordedImpressions = new Set<string>();

  /**
   * Tracks an advertisement impression (debounced per session).
   */
  async trackImpression(ad: Advertisement, organizationId: string, slotPosition: string) {
    const key = `${ad.id}_${organizationId}_${slotPosition}_${new Date().toDateString()}`;
    if (this.recordedImpressions.has(key)) return;
    this.recordedImpressions.add(key);

    try {
      // 1. Increment impression count on the Ad document
      const adRef = doc(db, 'advertisements', ad.id);
      await updateDoc(adRef, {
        impressionsCount: increment(1)
      });

      // 2. Record analytic event
      const eventRef = doc(collection(db, 'adImpressions'));
      const record: AdAnalyticsRecord = {
        id: eventRef.id,
        adId: ad.id,
        organizationId,
        eventType: 'impression',
        slotPosition,
        timestamp: new Date().toISOString()
      };
      await setDoc(eventRef, cleanUndefined(record));
    } catch (err) {
      console.warn('Ad impression tracking warning:', err);
    }
  }

  /**
   * Tracks an advertisement click event and redirects to destination URL.
   */
  async trackClick(ad: Advertisement, organizationId: string, slotPosition: string) {
    try {
      const adRef = doc(db, 'advertisements', ad.id);
      await updateDoc(adRef, {
        clicksCount: increment(1)
      });

      const eventRef = doc(collection(db, 'adClicks'));
      const record: AdAnalyticsRecord = {
        id: eventRef.id,
        adId: ad.id,
        organizationId,
        eventType: 'click',
        slotPosition,
        timestamp: new Date().toISOString()
      };
      await setDoc(eventRef, cleanUndefined(record));
    } catch (err) {
      console.warn('Ad click tracking warning:', err);
    }

    if (ad.destinationUrl) {
      window.open(ad.destinationUrl, '_blank', 'noopener,noreferrer');
    }
  }
}

export const adEngine = new AdEngine();
