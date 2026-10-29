import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { mockApiService } from '../../services/mockApiService';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import {
  FeedbackTrendsChart,
  BranchComparisonChart,
  CategoryDistributionChart,
} from '../../components/charts/FeedbackCharts';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Building2,
  Users,
  ShieldAlert,
  BarChart3,
  FileText,
  ArrowRight,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Star,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  const { branches } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const loadGlobalMetrics = async () => {
      try {
        setIsLoading(true);
        // Pass empty array for global org-wide aggregation
        const data = await mockApiService.getDashboardMetrics([]);
        setMetrics(data);
      } catch (err) {
        console.error('Failed to load admin metrics', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadGlobalMetrics();
  }, []);

  const branchMatrix = [
    {
      id: 'branch-1',
      code: 'BR-01',
      name: 'Downtown Bistro Flagship',
      manager: 'Maria Chen',
      feedbacks: 6,
      rating: 3.4,
      severeRate: 28,
      openTasks: 3,
      health: 'Attention Needed',
      healthColor: 'text-rose-600 bg-rose-50 border-rose-200',
    },
    {
      id: 'branch-2',
      code: 'BR-02',
      name: 'Westside Gourmet Kitchen',
      manager: 'Marcus Vance',
      feedbacks: 4,
      rating: 3.8,
      severeRate: 22,
      openTasks: 2,
      health: 'Moderate Risk',
      healthColor: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      id: 'branch-3',
      code: 'BR-03',
      name: 'Airport Terminal Hub',
      manager: 'David Kalu',
      feedbacks: 3,
      rating: 4.8,
      severeRate: 0,
      openTasks: 0,
      health: 'Optimal Quality',
      healthColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      id: 'branch-4',
      code: 'BR-04',
      name: 'Riverside Waterfront Terrace',
      manager: 'Aisha Patel',
      feedbacks: 3,
      rating: 4.3,
      severeRate: 10,
      openTasks: 1,
      health: 'Optimal Quality',
      healthColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
  ];

  const branchData = [
    { branch: 'BR-01 (Downtown)', avgRating: 3.4, severeRate: 28 },
    { branch: 'BR-02 (Westside)', avgRating: 3.8, severeRate: 22 },
    { branch: 'BR-03 (Airport)', avgRating: 4.8, severeRate: 5 },
    { branch: 'BR-04 (Riverside)', avgRating: 4.3, severeRate: 10 },
  ];

  if (isLoading || !metrics) {
    return <LoadingSpinner label="Compiling executive organization KPIs..." fullPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Executive Organization Overview
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Headquarters View
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidated intelligence across all 4 dining branches and operations networks.
          </p>
        </div>

        {/* Quick Admin Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/admin/branches')}
            icon={<Building2 className="w-3.5 h-3.5" />}
          >
            Branches
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/admin/staff')}
            icon={<Users className="w-3.5 h-3.5" />}
          >
            Manage Staff
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate('/admin/audit')}
            icon={<FileText className="w-3.5 h-3.5" />}
          >
            Audit Log
          </Button>
        </div>
      </div>

      {/* Global Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Outlets"
          value={branches.length}
          subtext="Active licensed restaurants"
          icon={<Building2 className="w-5 h-5" />}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />

        <StatCard
          title="Org-Wide Average Rating"
          value={`${metrics.avgRating} / 5`}
          subtext="Net across all locations"
          icon={<Star className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-500"
        />

        <StatCard
          title="Active Severe Alerts"
          value={metrics.severeIssues}
          subtext="Under active remediation"
          icon={<ShieldAlert className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
          onClick={() => navigate('/supervisor/inbox?severity=CRITICAL')}
        />

        <StatCard
          title="Closed-Loop Resolutions"
          value={metrics.verifiedResolved}
          subtext="Verified by station supervisor"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
        />
      </div>

      {/* Benchmark Matrix Table */}
      <Card className="shadow-sm">
        <CardHeader
          title="Cross-Branch Comparative Benchmark Matrix"
          subtitle="Real-time aggregation of guest satisfaction vs operational risk indicators"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4">Branch Code & Outlet</th>
                <th className="py-3 px-4">Supervising Manager</th>
                <th className="py-3 px-4 text-center">Avg Rating</th>
                <th className="py-3 px-4 text-center">Severe Issue Rate</th>
                <th className="py-3 px-4 text-center">Open Tasks</th>
                <th className="py-3 px-4">Operational Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branchMatrix.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{item.name}</p>
                    <span className="font-mono text-[10px] text-slate-400">{item.code}</span>
                  </td>

                  <td className="py-3 px-4 text-slate-700">{item.manager}</td>

                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-1 font-bold text-slate-800">
                      <span>{item.rating}</span>
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    </div>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span
                      className={`font-semibold ${
                        item.severeRate >= 20 ? 'text-rose-600' : 'text-slate-700'
                      }`}
                    >
                      {item.severeRate}%
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center font-bold text-slate-800">
                    {item.openTasks}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.healthColor}`}
                    >
                      {item.health}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate('/supervisor/inbox')}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cross-Branch Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader
            title="Portfolio Benchmark Comparison"
            subtitle="Star rating vs severe incident rate by branch"
          />
          <CardBody className="p-4">
            <BranchComparisonChart data={branchData} />
          </CardBody>
        </Card>

        <Card className="shadow-sm">
          <CardHeader
            title="Organization Feedback Concentration"
            subtitle="Breakdown of customer comment themes"
          />
          <CardBody className="p-4">
            <CategoryDistributionChart data={metrics.categoryDistribution} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
