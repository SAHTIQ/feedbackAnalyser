import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Shield, ChefHat, User, Users, RotateCcw, MapPin, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const RoleSwitcherBanner: React.FC = () => {
  const { currentUser, currentRole, switchRole, branches, activeBranchId, setActiveBranchId, resetDemoData } = useAuth();
  const navigate = useNavigate();

  const roles: { role: UserRole; label: string; icon: React.ReactNode; path: string }[] = [
    { role: 'CUSTOMER', label: 'Customer', icon: <User className="w-3.5 h-3.5" />, path: '/feedback' },
    { role: 'SUPERVISOR', label: 'Supervisor', icon: <Shield className="w-3.5 h-3.5" />, path: '/supervisor' },
    { role: 'KITCHEN_STAFF', label: 'Kitchen Staff', icon: <ChefHat className="w-3.5 h-3.5" />, path: '/kitchen' },
    { role: 'ADMIN', label: 'Admin', icon: <Users className="w-3.5 h-3.5" />, path: '/admin' },
  ];

  const handleRoleSelect = (role: UserRole, defaultPath: string) => {
    switchRole(role);
    navigate(defaultPath);
  };

  // Branch filter visibility: only relevant for Supervisor or Admin
  const showBranchSelect = currentRole === 'SUPERVISOR' || currentRole === 'ADMIN';

  // Filter available branches for supervisor
  const selectableBranches =
    currentRole === 'SUPERVISOR'
      ? branches.filter((b) => currentUser.branchIds.includes(b.id))
      : branches;

  return (
    <div className="bg-slate-900 text-slate-200 border-b border-slate-800 text-xs px-4 py-2 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-semibold text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span className="hidden sm:inline">FeedbackIQ Demo Role:</span>
        </div>

        {/* Role Pills */}
        <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700/60">
          {roles.map((r) => {
            const isActive = currentRole === r.role;
            return (
              <button
                key={r.role}
                onClick={() => handleRoleSelect(r.role, r.path)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                }`}
                title={`Switch to ${r.label} view`}
              >
                {r.icon}
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Branch Context Selector */}
        {showBranchSelect && selectableBranches.length > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md text-slate-300">
            <MapPin className="w-3 h-3 text-brand-400 shrink-0" />
            <select
              value={activeBranchId}
              onChange={(e) => setActiveBranchId(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer pr-1"
            >
              {currentRole === 'ADMIN' && <option value="ALL" className="bg-slate-800">All Branches (Global)</option>}
              {selectableBranches.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-800">
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Active User Chip */}
        <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-800 text-slate-400">
          <span className="text-slate-300 font-medium">{currentUser.name}</span>
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-slate-800 rounded text-brand-300 border border-slate-700">
            {currentRole}
          </span>
        </div>

        {/* Reset Demo State Button */}
        <button
          onClick={resetDemoData}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 px-2 py-1 rounded transition-colors text-[11px]"
          title="Reset sample feedback, tasks, and state to original mock values"
        >
          <RotateCcw className="w-3 h-3 text-slate-400" />
          <span className="hidden sm:inline">Reset Demo</span>
        </button>
      </div>
    </div>
  );
};
