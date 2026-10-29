import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { mockApiService } from '../../services/mockApiService';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import {
  FeedbackTrendsChart,
  CategoryDistributionChart,
  BranchComparisonChart,
  RatingDistributionChart,
} from '../../components/charts/FeedbackCharts';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  MapPin,
  TrendingUp,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { currentUser, currentRole, branches, activeBranchId } = useAuth();
  const [dateRange, setDateRange] = useState<'WEEK' | 'MONTH' | 'QUARTER'>('WEEK');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [metrics, setMetrics] = useState<{
    totalFeedback: number;
    avgRating: number;
    severeIssues: number;
    pendingActions: number;
    verifiedResolved: number;
    categoryDistribution: Array<{ name: string; value: number }>;
    ratingDist: Array<{ stars: string; count: number; percentage: number }>;
  } | null>(null);

  // Scoped branches: supervisor sees assigned branches; admin sees all
  const authorizedBranches =
    currentRole === 'SUPERVISOR'
      ? branches.filter((b) => currentUser.branchIds.includes(b.id))
      : branches;

  const scopedBranchIds =
    activeBranchId !== 'ALL'
      ? [activeBranchId]
      : currentRole === 'SUPERVISOR'
      ? currentUser.branchIds
      : [];

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        const data = await mockApiService.getDashboardMetrics(scopedBranchIds);
        setMetrics(data);
      } catch (err) {
        console.error('Failed to load reports', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMetrics();
  }, [dateRange, activeBranchId, currentUser]);

  // Realistic recurring issues data
  const recurringIssuesList = [
    {
      issue: 'Undercooked Poultry Line Station Bypass',
      branch: 'Downtown Bistro Flagship',
      category: 'Food Quality',
      count: 3,
      avgSeverity: 'CRITICAL',
      status: 'Corrective Action in Progress',
    },
    {
      issue: 'Pass Expediting Heat Lamp Cool Down',
      branch: 'Downtown Bistro Flagship',
      category: 'Food Quality',
      count: 4,
      avgSeverity: 'HIGH',
      status: 'Awaiting Verification',
    },
    {
      issue: 'Dishwasher Rinse Booster Temp Drop',
      branch: 'Westside Gourmet Kitchen',
      category: 'Cleanliness',
      count: 2,
      avgSeverity: 'HIGH',
      status: 'Awaiting Schedule Approval',
    },
    {
      issue: 'French Onion Soup Salinity Concentration',
      branch: 'Downtown Bistro Flagship',
      category: 'Food Quality',
      count: 2,
      avgSeverity: 'MEDIUM',
      status: 'Verified & Closed',
    },
  ];

  // Daily Trend Data
  const trendData = [
    { date: 'Oct 23', total: 4, negative: 1, severe: 0, resolved: 1 },
    { date: 'Oct 24', total: 6, negative: 2, severe: 1, resolved: 2 },
    { date: 'Oct 25', total: 8, negative: 3, severe: 1, resolved: 2 },
    { date: 'Oct 26', total: 9, negative: 4, severe: 2, resolved: 3 },
    { date: 'Oct 27', total: 11, negative: 5, severe: 3, resolved: 4 },
    { date: 'Oct 28', total: 14, negative: 6, severe: 3, resolved: 5 },
    {
      date: 'Oct 29',
      total: 16,
      negative: 7,
      severe: metrics?.severeIssues || 4,
      resolved: metrics?.verifiedResolved || 5,
    },
  ];

  const branchData = authorizedBranches.map((b) => {
    if (b.id === 'branch-1') return { branch: b.code, avgRating: 3.4, severeRate: 28 };
    if (b.id === 'branch-2') return { branch: b.code, avgRating: 3.8, severeRate: 22 };
    if (b.id === 'branch-3') return { branch: b.code, avgRating: 4.8, severeRate: 5 };
    return { branch: b.code, avgRating: 4.3, severeRate: 10 };
  });

  if (isLoading || !metrics) {
    return <LoadingSpinner label="Compiling verified report aggregates..." fullPage />;
  }

  const severeRate =
    metrics.totalFeedback > 0
      ? Math.round((metrics.severeIssues / metrics.totalFeedback) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Quality Intelligence & Performance Reports
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {currentRole === 'ADMIN' ? 'Executive (Global)' : 'Assigned Branches'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand-600" />
            Scope:{' '}
            <strong className="text-slate-800">
              {activeBranchId === 'ALL'
                ? `All Supervised Outlets (${authorizedBranches.length} Branches)`
                : branches.find((b) => b.id === activeBranchId)?.name}
            </strong>
          </p>
        </div>

        {/* Date Filter & Export */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs">
            {(['WEEK', 'MONTH', 'QUARTER'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  dateRange === r
                    ? 'bg-brand-600 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r === 'WEEK' && 'Last 7 Days'}
                {r === 'MONTH' && 'Last 30 Days'}
                {r === 'QUARTER' && 'This Quarter'}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => alert('Simulated export: Quality_Report_2026.csv downloaded.')}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Verified Closed Issues"
          value={metrics.verifiedResolved}
          subtext="Supervisor inspected & verified"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
        />

        <StatCard
          title="Severe Issue Rate"
          value={`${severeRate}%`}
          subtext={`${metrics.severeIssues} of ${metrics.totalFeedback} reviews`}
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
        />

        <StatCard
          title="Avg Resolution SLA"
          value="18.4 hrs"
          subtext="From intake to supervisor closure"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          trend={{ value: '4.2h faster', isPositive: true }}
        />

        <StatCard
          title="Recurring Pattern Rate"
          value="31%"
          subtext="Identified by Historical Insights"
          icon={<TrendingUp className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader
            title="Feedback Influx vs Verified Closures"
            subtitle="Comparing pre-action vs post-action verified resolutions"
          />
          <CardBody className="p-4">
            <FeedbackTrendsChart data={trendData} />
          </CardBody>
        </Card>

        <Card className="shadow-sm">
          <CardHeader
            title="Star Rating Distribution"
            subtitle="Breakdown across all guest reviews"
          />
          <CardBody className="p-5">
            <RatingDistributionChart data={metrics.ratingDist} />
          </CardBody>
        </Card>
      </div>

      {/* Branch & Category Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader
            title="Outlets Comparison: Rating vs Severe Rate"
            subtitle="Benchmarking performance across branches"
          />
          <CardBody className="p-4">
            <BranchComparisonChart data={branchData} />
          </CardBody>
        </Card>

        <Card className="shadow-sm">
          <CardHeader
            title="Category Volume Breakdown"
            subtitle="Categorical concentration of guest comments"
          />
          <CardBody className="p-4">
            <CategoryDistributionChart data={metrics.categoryDistribution} />
          </CardBody>
        </Card>
      </div>

      {/* Recurring Issues Intelligence Table */}
      <Card className="shadow-sm">
        <CardHeader
          title="Recurring Incident Pattern Analysis"
          subtitle="Clusters identified by LangGraph Historical Insights Engine"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <th className="py-3 px-4">Pattern Summary</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Occurrences</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Current Workflow State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recurringIssuesList.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{item.issue}</td>
                  <td className="py-3 px-4 text-slate-700">{item.branch}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-brand-600">
                    {item.count}x
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.avgSeverity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800'
                          : item.avgSeverity === 'HIGH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {item.avgSeverity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
