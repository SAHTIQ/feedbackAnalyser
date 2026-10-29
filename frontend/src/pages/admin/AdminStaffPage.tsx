import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, UserRole } from '../../types';
import { mockApiService } from '../../services/mockApiService';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Building,
} from 'lucide-react';

export const AdminStaffPage: React.FC = () => {
  const { allUsers, branches, refreshUserData, currentUser } = useAuth();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editBranchModalOpen, setEditBranchModalOpen] = useState<boolean>(false);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Deactivate confirmation modal
  const [deactivateModalOpen, setDeactivateModalOpen] = useState<boolean>(false);
  const [targetUserToToggle, setTargetUserToToggle] = useState<UserProfile | null>(null);

  const handleToggleStatusPrompt = (user: UserProfile) => {
    setTargetUserToToggle(user);
    setDeactivateModalOpen(true);
  };

  const handleConfirmToggleStatus = async () => {
    if (!targetUserToToggle) return;
    try {
      setIsUpdating(true);
      const newStatus = !targetUserToToggle.active;
      await mockApiService.updateStaffStatus(
        targetUserToToggle.id,
        newStatus,
        currentUser.name
      );
      await refreshUserData();
      setDeactivateModalOpen(false);
      setNoticeMessage(
        newStatus
          ? `Account for ${targetUserToToggle.name} has been activated.`
          : `Account for ${targetUserToToggle.name} deactivated. Login is disabled, audit history is preserved, and open tasks require reassignment.`
      );
      setTimeout(() => setNoticeMessage(null), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenEditBranches = (user: UserProfile) => {
    setSelectedUser(user);
    setSelectedBranchIds(user.branchIds);
    setEditBranchModalOpen(true);
  };

  const handleSaveBranchAssignments = async () => {
    if (!selectedUser) return;
    try {
      setIsUpdating(true);
      await mockApiService.updateStaffAssignment(
        selectedUser.id,
        selectedBranchIds,
        currentUser.name
      );
      await refreshUserData();
      setEditBranchModalOpen(false);
      setNoticeMessage(`Branch assignments updated for ${selectedUser.name}.`);
      setTimeout(() => setNoticeMessage(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleBranchSelection = (branchId: string) => {
    if (selectedBranchIds.includes(branchId)) {
      setSelectedBranchIds((prev) => prev.filter((id) => id !== branchId));
    } else {
      setSelectedBranchIds((prev) => [...prev, branchId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Staff & Role Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure user profiles, role-based access control, branch assignments, and account
            deactivation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
            {allUsers.length} Registered Accounts
          </span>
        </div>
      </div>

      {/* Notice Alert */}
      {noticeMessage && (
        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="font-semibold">{noticeMessage}</span>
        </div>
      )}

      {/* Staff Accounts Table */}
      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Branch Assignments</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allUsers.map((user) => {
                const assignedBranchNames = branches
                  .filter((b) => user.branchIds.includes(b.id))
                  .map((b) => b.name);

                return (
                  <tr
                    key={user.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      !user.active ? 'bg-slate-50/60 opacity-75' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-900 flex items-center gap-1.5">
                            {user.name}
                            {!user.active && (
                              <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 rounded border border-rose-200">
                                Deactivated
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {user.role}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600">{user.department || 'Operations'}</td>

                    <td className="py-3 px-4">
                      {user.role === 'ADMIN' ? (
                        <span className="text-slate-500 font-medium">All Branches (Global)</span>
                      ) : assignedBranchNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {assignedBranchNames.map((name, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-brand-50 text-brand-700 text-[10px] font-medium border border-brand-200"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None assigned</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {user.active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <Lock className="w-3 h-3 text-rose-500" />
                          Login Disabled
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {user.role !== 'ADMIN' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditBranches(user)}
                            className="text-xs"
                          >
                            <Building className="w-3 h-3 mr-1" />
                            Branches
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant={user.active ? 'danger' : 'success'}
                          onClick={() => handleToggleStatusPrompt(user)}
                          className="text-xs"
                        >
                          {user.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DEACTIVATE CONFIRMATION MODAL */}
      {deactivateModalOpen && targetUserToToggle && (
        <Modal
          isOpen={true}
          onClose={() => setDeactivateModalOpen(false)}
          title={
            targetUserToToggle.active
              ? `Deactivate Staff Account: ${targetUserToToggle.name}?`
              : `Reactivate Staff Account: ${targetUserToToggle.name}?`
          }
          subtitle={`Account ID: ${targetUserToToggle.id}`}
          maxWidth="md"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeactivateModalOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                variant={targetUserToToggle.active ? 'danger' : 'primary'}
                size="sm"
                onClick={handleConfirmToggleStatus}
                loading={isUpdating}
              >
                {targetUserToToggle.active ? 'Confirm Deactivation' : 'Confirm Activation'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {targetUserToToggle.active ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-700">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>Important Governance Policy:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-rose-800">
                  <li>
                    <strong>Login is disabled immediately</strong> for {targetUserToToggle.name}.
                  </li>
                  <li>
                    <strong>Audit history is strictly preserved</strong> and will remain fully
                    intact for compliance audits.
                  </li>
                  <li>
                    <strong>Open tasks require reassignment:</strong> Any tasks currently
                    assigned to this account should be reassigned to another active staff member.
                  </li>
                </ul>
              </div>
            ) : (
              <p className="text-slate-600">
                Reactivating this account will restore access and allow the staff member to receive
                assigned corrective tasks again.
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* EDIT BRANCH ASSIGNMENTS MODAL */}
      {editBranchModalOpen && selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => setEditBranchModalOpen(false)}
          title={`Edit Branch Assignments for ${selectedUser.name}`}
          subtitle={`Role: ${selectedUser.role}`}
          maxWidth="md"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditBranchModalOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveBranchAssignments}
                loading={isUpdating}
              >
                Save Branch Scope
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <p className="text-slate-600">
              Select which restaurant outlets {selectedUser.name} is authorized to oversee or
              receive tasks from:
            </p>

            <div className="space-y-2 pt-2">
              {branches.map((b) => {
                const isSelected = selectedBranchIds.includes(b.id);
                return (
                  <div
                    key={b.id}
                    onClick={() => toggleBranchSelection(b.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{b.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {b.code} • {b.city}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-brand-600"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
