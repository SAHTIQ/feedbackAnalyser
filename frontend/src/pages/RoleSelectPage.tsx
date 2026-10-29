import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Shield, ChefHat, User, Users, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody } from '../components/common/Card';
import { Button } from '../components/common/Button';

export const RoleSelectPage: React.FC = () => {
  const { currentRole, switchRole, allUsers } = useAuth();
  const navigate = useNavigate();

  const roleCards: Array<{
    role: UserRole;
    title: string;
    badge: string;
    user: string;
    avatar: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    path: string;
    features: string[];
  }> = [
    {
      role: 'SUPERVISOR',
      title: 'Operations Supervisor',
      badge: 'Maria Chen',
      user: 'Downtown Bistro Flagship & Westside',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces',
      description:
        'Monitor feedback across assigned branches, review AI safety triage, override severity with mandatory justifications, approve deadlines, and verify kitchen evidence.',
      icon: <Shield className="w-6 h-6 text-indigo-600" />,
      color: 'border-indigo-200 bg-indigo-50/30',
      path: '/supervisor',
      features: [
        '5 Core KPI cards with live trend calculations',
        'Searchable Feedback Inbox with multi-faceted filtering',
        'AI Root-Cause inspection & severity overrides',
        'Schedule approvals & closed-loop verification gates',
      ],
    },
    {
      role: 'KITCHEN_STAFF',
      title: 'Kitchen & Line Staff',
      badge: 'Marco Rossi',
      user: 'Downtown Bistro Line Station',
      avatar: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=100&h=100&fit=crop&crop=faces',
      description:
        'Streamlined, touch-ready operational checklist. Kitchen staff see only their own assigned corrective duties with minimal necessary customer context.',
      icon: <ChefHat className="w-6 h-6 text-amber-600" />,
      color: 'border-amber-200 bg-amber-50/30',
      path: '/kitchen',
      features: [
        'Strictly isolated to assigned branch tasks',
        'One-click "Start Work" and status tracking',
        'Mandatory completion note + simulated photo uploads',
        'Visible supervisor rejection remarks when reopened',
      ],
    },
    {
      role: 'ADMIN',
      title: 'Executive Administrator',
      badge: 'Sarah Jenkins',
      user: 'Organization Headquarters',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
      description:
        'Full portfolio visibility across all restaurant branches, cross-branch performance benchmarking, staff account governance, and immutable audit trails.',
      icon: <Users className="w-6 h-6 text-purple-600" />,
      color: 'border-purple-200 bg-purple-50/30',
      path: '/admin',
      features: [
        'Global organization KPIs & cross-branch comparisons',
        'Branch directory & management',
        'Staff role assignment & deactivation governance',
        'Comprehensive audit log inspection',
      ],
    },
    {
      role: 'CUSTOMER',
      title: 'Customer & Diner',
      badge: 'Guest Experience',
      user: 'Public Portal',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces',
      description:
        'Frictionless, mobile-optimized public intake form for restaurant diners. Real-time tokenized tracking without requiring account registration.',
      icon: <User className="w-6 h-6 text-emerald-600" />,
      color: 'border-emerald-200 bg-emerald-50/30',
      path: '/feedback',
      features: [
        'Interactive 5-star rating with category-first tag picker',
        'Anonymous submission support',
        'Unique Reference ID & Access Token generation',
        'Redacted resolution milestone tracker',
      ],
    },
  ];

  const handleSelect = (role: UserRole, path: string) => {
    switchRole(role);
    navigate(path);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Interactive Role-Based Prototype
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Select a FeedbackIQ Demo Persona
        </h2>
        <p className="text-sm text-slate-600">
          Switch between roles to experience specialized workflows, security boundaries, and
          closed-loop resolution steps.
        </p>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {roleCards.map((rc) => {
          const isCurrent = currentRole === rc.role;
          return (
            <Card
              key={rc.role}
              className={`relative transition-all border-2 overflow-hidden hover:shadow-lg ${
                isCurrent ? 'border-brand-600 shadow-md ring-2 ring-brand-500/20' : 'border-slate-200'
              }`}
            >
              {isCurrent && (
                <div className="absolute top-0 right-0 bg-brand-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-bl-lg flex items-center gap-1 shadow-xs">
                  <CheckCircle2 className="w-3 h-3" />
                  Active Persona
                </div>
              )}

              <CardBody className="p-6 flex flex-col justify-between h-full space-y-4">
                <div>
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                      {rc.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{rc.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <img
                          src={rc.avatar}
                          alt={rc.badge}
                          className="w-4 h-4 rounded-full object-cover"
                        />
                        <span className="text-xs font-medium text-slate-600">{rc.badge}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-400">{rc.user}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {rc.description}
                  </p>

                  <div className="space-y-1.5 pt-3 border-t border-slate-100">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Key Capabilities:
                    </p>
                    {rc.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                        <span className="text-emerald-500 font-bold shrink-0">✓</span>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={() => handleSelect(rc.role, rc.path)}
                    variant={isCurrent ? 'primary' : 'outline'}
                    className="w-full justify-between"
                  >
                    <span>{isCurrent ? 'Continue as ' + rc.title : 'Switch to ' + rc.title}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
