/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Viavela CRM Super Admin: Activity Audit Trail
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ActivityLog } from '../../types';
import { ShieldCheck, Clock, Search, UserCheck, AlertCircle } from 'lucide-react';

export default function ActivityLogView() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'activityLogs'), (snap) => {
      const list: ActivityLog[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as ActivityLog));
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(list);
    });
    return () => unsub();
  }, []);

  const filteredLogs = logs.filter(l => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (l.action || '').toLowerCase().includes(q) ||
      (l.description || '').toLowerCase().includes(q) ||
      (l.userName || '').toLowerCase().includes(q) ||
      (l.organizationId || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Super Admin Activity & Security Audit Log</h2>
          <p className="text-xs text-neutral-500">Immutable chronological record of administrative actions, trial extensions, and status changes.</p>
        </div>
        <span className="px-3 py-1.5 bg-neutral-100 font-mono font-bold text-neutral-700 text-xs rounded-xl border border-neutral-200">
          {logs.length} Logged Events
        </span>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-neutral-200/70 shadow-xs flex items-center gap-2 max-w-md">
        <Search className="w-4 h-4 text-neutral-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter audit events..."
          className="w-full bg-transparent text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none font-medium"
        />
      </div>

      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs divide-y divide-neutral-100 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <ShieldCheck className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-xs font-semibold">No audit log records recorded yet.</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-neutral-50/60 transition-colors flex items-start justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-mono text-[9px] font-black uppercase">
                    {log.action}
                  </span>
                  <span className="font-bold text-neutral-900">{log.userName || 'Super Admin'}</span>
                  {log.organizationId && (
                    <span className="text-[10px] text-neutral-400 font-mono">Org: {log.organizationId}</span>
                  )}
                </div>
                <p className="text-neutral-700 font-medium">{log.description}</p>
              </div>

              <span className="font-mono text-[10px] text-neutral-400 shrink-0">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
