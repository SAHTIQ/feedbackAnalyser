import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Branch } from '../../types';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import {
  Building2,
  MapPin,
  Phone,
  User,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminBranchesPage: React.FC = () => {
  const { branches } = useAuth();
  const navigate = useNavigate();
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Branch Network</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage organization outlets, physical addresses, and assigned operations leadership.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => alert('Add branch action simulated in demo mode.')}
        >
          Add New Branch
        </Button>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {branches.map((b) => (
          <Card key={b.id} className="border-slate-200 hover:shadow-md transition-all">
            <CardBody className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{b.name}</h3>
                    <span className="font-mono text-xs font-semibold text-slate-400">
                      Code: {b.code}
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {b.address}, {b.city}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Manager: <strong className="text-slate-800">{b.managerName}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{b.phone}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedBranch(b)}
                  className="text-xs"
                >
                  View Details
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/supervisor/inbox?branch=${b.id}`)}
                  className="text-xs text-brand-600"
                >
                  View Branch Feedback
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Branch Details Modal */}
      {selectedBranch && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedBranch(null)}
          title={selectedBranch.name}
          subtitle={`Branch Code: ${selectedBranch.code}`}
          maxWidth="md"
          footer={
            <Button variant="outline" size="sm" onClick={() => setSelectedBranch(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div>
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                  Address
                </span>
                <span className="font-medium text-slate-800">{selectedBranch.address}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                  City / Region
                </span>
                <span className="font-medium text-slate-800">{selectedBranch.city}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                  Supervising General Manager
                </span>
                <span className="font-medium text-slate-800">{selectedBranch.managerName}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                  Telephone Contact
                </span>
                <span className="font-medium text-slate-800">{selectedBranch.phone}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Multi-agent background monitoring active for this outlet.</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
