import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, Branch } from '../types';
import { MOCK_USERS, MOCK_BRANCHES } from '../data/mockData';
import { mockApiService } from '../services/mockApiService';

interface AuthContextType {
  currentUser: UserProfile;
  currentRole: UserRole;
  allUsers: UserProfile[];
  branches: Branch[];
  activeBranchId: string;
  setActiveBranchId: (id: string) => void;
  switchRole: (role: UserRole, specificUserId?: string) => void;
  resetDemoData: () => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_STORAGE_KEY = 'feedbackiq_active_user_v2';
const ACTIVE_BRANCH_STORAGE_KEY = 'feedbackiq_active_branch_v2';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allUsers, setAllUsers] = useState<UserProfile[]>(MOCK_USERS);
  const [branches, setBranches] = useState<Branch[]>(MOCK_BRANCHES);
  
  // Default to Supervisor Maria Chen for immediate rich experience
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const match = MOCK_USERS.find((u) => u.id === parsed.id);
        if (match) return match;
      }
    } catch {}
    return MOCK_USERS.find((u) => u.role === 'SUPERVISOR') || MOCK_USERS[0];
  });

  const [activeBranchId, setActiveBranchIdState] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY) || 'ALL';
  });

  const setActiveBranchId = (id: string) => {
    setActiveBranchIdState(id);
    localStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, id);
  };

  const refreshUserData = async () => {
    const updatedUsers = await mockApiService.getUsers();
    const updatedBranches = await mockApiService.getBranches();
    setAllUsers(updatedUsers);
    setBranches(updatedBranches);
    
    // Update currentUser if modified
    const currentStillExists = updatedUsers.find((u) => u.id === currentUser.id);
    if (currentStillExists) {
      setCurrentUser(currentStillExists);
    }
  };

  useEffect(() => {
    refreshUserData();
  }, []);

  const switchRole = (role: UserRole, specificUserId?: string) => {
    let targetUser: UserProfile | undefined;
    if (specificUserId) {
      targetUser = allUsers.find((u) => u.id === specificUserId);
    }
    if (!targetUser) {
      targetUser = allUsers.find((u) => u.role === role);
    }
    if (!targetUser) {
      targetUser = {
        id: `temp-${role.toLowerCase()}`,
        name: `Demo ${role}`,
        email: `${role.toLowerCase()}@feedbackiq.org`,
        role,
        branchIds: role === 'SUPERVISOR' ? ['branch-1', 'branch-2'] : [],
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
        active: true,
      };
    }

    setCurrentUser(targetUser);
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(targetUser));

    // Reset active branch if not authorized
    if (role === 'SUPERVISOR' && targetUser.branchIds.length > 0) {
      setActiveBranchId(targetUser.branchIds[0]);
    } else if (role === 'KITCHEN_STAFF' && targetUser.branchIds.length > 0) {
      setActiveBranchId(targetUser.branchIds[0]);
    } else {
      setActiveBranchId('ALL');
    }
  };

  const resetDemoData = () => {
    mockApiService.resetAllData();
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);
    window.location.reload();
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: currentUser.role,
        allUsers,
        branches,
        activeBranchId,
        setActiveBranchId,
        switchRole,
        resetDemoData,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
