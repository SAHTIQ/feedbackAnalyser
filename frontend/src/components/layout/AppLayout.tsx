import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { RoleSwitcherBanner } from '../common/RoleSwitcherBanner';
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  BarChart3,
  Bell,
  Users,
  Building2,
  FileText,
  Send,
  Search,
  Menu,
  X,
  ShieldCheck,
  ChefHat,
  ChevronRight,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const { unreadCount } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Navigation Items per role
  const getNavLinks = () => {
    switch (currentRole) {
      case 'CUSTOMER':
        return [
          { to: '/feedback', label: 'Submit Feedback', icon: <Send className="w-4 h-4" /> },
          { to: '/track', label: 'Track Resolution', icon: <Search className="w-4 h-4" /> },
          { to: '/roles', label: 'Demo Role Switcher', icon: <Users className="w-4 h-4" /> },
        ];
      case 'SUPERVISOR':
        return [
          { to: '/supervisor', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, end: true },
          { to: '/supervisor/inbox', label: 'Feedback Inbox', icon: <Inbox className="w-4 h-4" /> },
          { to: '/supervisor/actions', label: 'Corrective Actions', icon: <CheckSquare className="w-4 h-4" /> },
          { to: '/supervisor/reports', label: 'Reports & Trends', icon: <BarChart3 className="w-4 h-4" /> },
          {
            to: '/notifications',
            label: 'Notifications',
            icon: <Bell className="w-4 h-4" />,
            badge: unreadCount > 0 ? unreadCount : undefined,
          },
          { to: '/roles', label: 'Switch Demo Role', icon: <Users className="w-4 h-4" /> },
        ];
      case 'KITCHEN_STAFF':
        return [
          { to: '/kitchen', label: 'My Assigned Tasks', icon: <ChefHat className="w-4 h-4" /> },
          {
            to: '/notifications',
            label: 'Task Notifications',
            icon: <Bell className="w-4 h-4" />,
            badge: unreadCount > 0 ? unreadCount : undefined,
          },
          { to: '/roles', label: 'Switch Demo Role', icon: <Users className="w-4 h-4" /> },
        ];
      case 'ADMIN':
        return [
          { to: '/admin', label: 'Organization KPIs', icon: <LayoutDashboard className="w-4 h-4" />, end: true },
          { to: '/admin/branches', label: 'Branch Network', icon: <Building2 className="w-4 h-4" /> },
          { to: '/admin/staff', label: 'Staff & Roles', icon: <Users className="w-4 h-4" /> },
          { to: '/admin/audit', label: 'Audit Log', icon: <FileText className="w-4 h-4" /> },
          { to: '/supervisor/inbox', label: 'Global Inbox', icon: <Inbox className="w-4 h-4" /> },
          { to: '/supervisor/actions', label: 'All Corrective Actions', icon: <CheckSquare className="w-4 h-4" /> },
          { to: '/supervisor/reports', label: 'Executive Reports', icon: <BarChart3 className="w-4 h-4" /> },
          {
            to: '/notifications',
            label: 'All Alerts',
            icon: <Bell className="w-4 h-4" />,
            badge: unreadCount > 0 ? unreadCount : undefined,
          },
          { to: '/roles', label: 'Switch Demo Role', icon: <Users className="w-4 h-4" /> },
        ];
    }
  };

  const navLinks = getNavLinks();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Demo Banner */}
      <RoleSwitcherBanner />

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Desktop Left Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0">
          {/* Brand Logo Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm shadow-brand-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-base text-slate-900 leading-tight">FeedbackIQ</h1>
                <p className="text-[11px] text-slate-500 font-medium">Quality Intelligence</p>
              </div>
            </div>
          </div>

          {/* User Profile Card in Sidebar */}
          <div className="px-4 py-3 mx-3 my-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-xs shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 truncate">{currentUser.name}</p>
              <p className="text-[11px] text-brand-600 font-medium truncate capitalize">
                {currentRole.replace('_', ' ').toLowerCase()}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <span className="text-current opacity-80">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Sidebar Footer info */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Prototype v2.0</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Frontend Ready
              </span>
            </div>
          </div>
        </aside>

        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-[33px] z-30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 text-sm">FeedbackIQ</span>
          </div>

          <div className="flex items-center gap-2">
            <NavLink
              to="/notifications"
              className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </NavLink>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-1 shadow-lg animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg mb-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div>
                <p className="text-xs font-semibold text-slate-900">{currentUser.name}</p>
                <p className="text-[11px] text-brand-600 capitalize">
                  {currentRole.replace('_', ' ').toLowerCase()}
                </p>
              </div>
            </div>
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500 text-white">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        )}

        {/* Main Workspace Content Area */}
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
