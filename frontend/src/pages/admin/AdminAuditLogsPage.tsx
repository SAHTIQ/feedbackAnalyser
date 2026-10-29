import React, { useState, useEffect } from 'react';
import { mockApiService } from '../../services/mockApiService';
import { AuditLogEntry } from '../../types';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  FileText,
  Search,
  Filter,
  Shield,
  Clock,
  User,
  Activity,
} from 'lucide-react';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string>('ALL');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const data = await mockApiService.getAuditLogs({
          entityType: selectedEntity !== 'ALL' ? selectedEntity : undefined,
        });
        setLogs(data);
      } catch (err) {
        console.error('Failed to load audit logs', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [selectedEntity]);

  const filteredLogs = logs.filter((log) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      log.actorName.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.entityId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              System Audit & Compliance Log
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Immutable Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically timestamped record of supervisor decisions, severity overrides, task verifications, and user security events.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by actor, action keyword, details, or entity ID..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
            >
              <option value="ALL">All Entity Types</option>
              <option value="FEEDBACK">Feedback Incidents</option>
              <option value="TASK">Corrective Tasks</option>
              <option value="STAFF">Staff & Roles</option>
              <option value="SCHEDULE">Schedules & SLAs</option>
              <option value="SYSTEM">System AI Watchdogs</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Audit Log Table */}
      {isLoading ? (
        <LoadingSpinner label="Fetching audit entries..." />
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-6 h-6" />}
          title="No Audit Records Matched"
          description="Try clearing your search term or selecting All Entity Types."
        />
      ) : (
        <Card className="shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor & Role</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Audit Details & Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredLogs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="font-sans font-bold text-slate-900">{entry.actorName}</p>
                      <span className="text-[10px] uppercase font-semibold text-brand-600">
                        {entry.actorRole}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-[10px]">
                        {entry.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      <span className="font-sans font-semibold text-slate-800 block">
                        {entry.entityType}
                      </span>
                      <span className="text-[10px] text-slate-400">{entry.entityId}</span>
                    </td>

                    <td className="py-3 px-4 font-sans text-xs text-slate-700 leading-relaxed max-w-md">
                      {entry.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
