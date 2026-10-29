import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { mockApiService } from '../../services/mockApiService';
import { FeedbackSubmission, CorrectiveActionTask } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SeverityBadge, WorkflowStatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  FeedbackTrendsChart,
  CategoryDistributionChart,
  BranchComparisonChart,
} from '../../components/charts/FeedbackCharts';
import {
  MessageSquare,
  Star,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowRight,
  TrendingUp,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SupervisorDashboardPage: React.FC = () => {
  const { currentUser, currentRole, branches, activeBranchId } = useAuth();
  const navigate = useNavigate();

  // Date Range filter
  const [datePreset, setDatePreset] = useState<'TODAY' | '7_DAYS' | '30_DAYS' | 'CUSTOM'>('7_DAYS');
  const [customStart, setCustomStart] = useState<string>('2026-10-22');
  const [customEnd, setCustomEnd] = useState<string>('2026-10-29');

  // Data state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<{
    totalFeedback: number;
    avgRating: number;
    severeIssues: number;
    pendingActions: number;
    verifiedResolved: number;
    severeAlerts: FeedbackSubmission[];
    highPriorityFeedbacks: FeedbackSubmission[];
    categoryDistribution: Array<{ name: string; value: number }>;
    ratingDist: Array<{ stars: string; count: number; percentage: number }>;
  } | null>(null);

  const [recentTasks, setRecentTasks] = useState<CorrectiveActionTask[]>([]);

  // Branches to evaluate: if supervisor, restrict to assigned branchIds; if specific activeBranchId is selected, use that
  const authorizedBranchIds =
    activeBranchId !== 'ALL'
      ? [activeBranchId]
      : currentRole === 'SUPERVISOR'
      ? currentUser.branchIds
      : [];

  const loadData = async () => {
    try {
      setIsLoading(true);
      const metricsData = await mockApiService.getDashboardMetrics(authorizedBranchIds);
      setMetrics(metricsData);

      const tasks = await mockApiService.getTasks({
        branchId: activeBranchId !== 'ALL' ? activeBranchId : undefined,
      });
      // Filter tasks to authorized branches
      const filteredTasks =
        currentRole === 'SUPERVISOR' && activeBranchId === 'ALL'
          ? tasks.filter((t) => currentUser.branchIds.includes(t.branchId))
          : tasks;
      setRecentTasks(filteredTasks.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBranchId, datePreset, currentUser]);

  // Derived Trend Chart series based on realistic mock data
  const trendData = [
    { date: 'Oct 23', total: 4, negative: 1, severe: 0, resolved: 1 },
    { date: 'Oct 24', total: 6, negative: 2, severe: 1, resolved: 2 },
    { date: 'Oct 25', total: 8, negative: 3, severe: 1, resolved: 2 },
    { date: 'Oct 26', total: 9, negative: 4, severe: 2, resolved: 3 },
    { date: 'Oct 27', total: 11, negative: 5, severe: 3, resolved: 4 },
    { date: 'Oct 28', total: 14, negative: 6, severe: 3, resolved: 5 },
    { date: 'Oct 29', total: 16, negative: 7, severe: metrics?.severeIssues || 4, resolved: metrics?.verifiedResolved || 5 },
  ];

  // Branch comparison data: computed only for supervisor's assigned branches or all for admin
  const branchComparisonData = branches
    .filter((b) => (currentRole === 'SUPERVISOR' ? currentUser.branchIds.includes(b.id) : true))
    .map((b) => {
      if (b.id === 'branch-1') return { branch: b.code, avgRating: 3.4, severeRate: 28 };
      if (b.id === 'branch-2') return { branch: b.code, avgRating: 3.8, severeRate: 22 };
      if (b.id === 'branch-3') return { branch: b.code, avgRating: 4.8, severeRate: 5 };
      return { branch: b.code, avgRating: 4.3, severeRate: 10 };
    });

  if (isLoading || !metrics) {
    return <LoadingSpinner label="Loading quality intelligence dashboard..." fullPage />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Operations Supervisor Dashboard
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Live Monitor
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand-600" />
            Showing metrics for:{' '}
            <strong className="text-slate-700">
              {activeBranchId === 'ALL'
                ? `All Assigned Branches (${currentUser.branchIds.length || 'All'})`
                : branches.find((b) => b.id === activeBranchId)?.name}
            </strong>
          </p>
        </div>

        {/* Date Preset Controls */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs">
            {(['TODAY', '7_DAYS', '30_DAYS', 'CUSTOM'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => setDatePreset(preset)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  datePreset === preset
                    ? 'bg-brand-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset === 'TODAY' && 'Today'}
                {preset === '7_DAYS' && '7 Days'}
                {preset === '30_DAYS' && '30 Days'}
                {preset === 'CUSTOM' && 'Custom'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Date Range Picker if selected */}
      {datePreset === 'CUSTOM' && (
        <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center gap-3 text-xs shadow-xs">
          <span className="font-semibold text-slate-700">Custom Date Interval:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-slate-700"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-slate-700"
            />
          </div>
          <Button size="sm" variant="outline" onClick={loadData}>
            Apply Filter
          </Button>
        </div>
      )}

      {/* 5 REQUIRED KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1 */}
        <StatCard
          title="Total Feedback"
          value={metrics.totalFeedback}
          subtext="Customer dining reviews"
          icon={<MessageSquare className="w-5 h-5" />}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          trend={{ value: '18%', isPositive: true, label: 'vs last week' }}
          onClick={() => navigate('/supervisor/inbox')}
        />

        {/* KPI 2 */}
        <StatCard
          title="Average Rating"
          value={`${metrics.avgRating} / 5`}
          subtext="Net guest score"
          icon={<Star className="w-5 h-5" />}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-500"
          trend={{ value: '0.2', isPositive: false, label: 'variance' }}
        />

        {/* KPI 3 */}
        <StatCard
          title="Severe Issues"
          value={metrics.severeIssues}
          subtext="Safety & critical alerts"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-rose-50"
          iconColor="text-rose-600"
          badge={
            metrics.severeIssues > 0 ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 animate-pulse">
                Action Required
              </span>
            ) : undefined
          }
          onClick={() => navigate('/supervisor/inbox?severity=CRITICAL')}
        />

        {/* KPI 4 */}
        <StatCard
          title="Pending Actions"
          value={metrics.pendingActions}
          subtext="Tasks in progress or review"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-purple-50"
          iconColor="text-purple-600"
          onClick={() => navigate('/supervisor/actions')}
        />

        {/* KPI 5 */}
        <StatCard
          title="Verified Resolved"
          value={metrics.verifiedResolved}
          subtext="Audited closed workflows"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
          trend={{ value: '100%', isPositive: true, label: 'closure rate' }}
          onClick={() => navigate('/supervisor/actions?status=VERIFIED_CLOSED')}
        />
      </div>

      {/* SEVERE ISSUE ALERT SECTION */}
      {metrics.severeAlerts.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/40 shadow-xs">
          <CardHeader
            title={
              <div className="flex items-center gap-2 text-rose-800">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Severe Issues Requiring Immediate Attention ({metrics.severeAlerts.length})</span>
              </div>
            }
            subtitle="Automated intake flagged potential safety, food hygiene, or contamination risks"
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/supervisor/inbox?severity=CRITICAL')}
                className="border-rose-300 text-rose-800 hover:bg-rose-100"
              >
                View All Severe
              </Button>
            }
          />
          <div className="divide-y divide-rose-100">
            {metrics.severeAlerts.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/supervisor/feedback/${item.id}`)}
                className="p-4 hover:bg-rose-100/40 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {item.referenceId}
                    </span>
                    <SeverityBadge severity={item.severity} size="sm" />
                    <span className="text-xs font-semibold text-slate-700">{item.branchName}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 line-clamp-1 italic">
                    "{item.comments || item.selectedTags.join(', ')}"
                  </p>
                  {item.aiAnalysis?.severeAlertReason && (
                    <p className="text-[11px] font-medium text-rose-700">
                      ⚠ AI Safety Trigger: {item.aiAnalysis.severeAlertReason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                      Priority Score
                    </span>
                    <span className="text-sm font-bold text-rose-600">{item.priorityScore} / 100</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart (2 Columns) */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader
            title="Feedback Volume & Incident Trends"
            subtitle="Trajectory of incoming complaints, critical issues, and verified resolutions"
          />
          <CardBody className="p-4">
            <FeedbackTrendsChart data={trendData} />
          </CardBody>
        </Card>

        {/* Category Breakdown (1 Column) */}
        <Card className="shadow-sm">
          <CardHeader
            title="Category Distribution"
            subtitle="Derived proportion from customer selections"
          />
          <CardBody className="p-4">
            <CategoryDistributionChart data={metrics.categoryDistribution} />
          </CardBody>
        </Card>
      </div>

      {/* BOTTOM ROW: HIGH-PRIORITY FEEDBACK & BRANCH COMPARISON */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High-Priority Feedback List */}
        <Card className="shadow-sm">
          <CardHeader
            title="High-Priority Feedback Queue"
            subtitle="Ranked deterministically by AI Priority Engine"
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate('/supervisor/inbox')}
                className="text-xs"
              >
                Open Inbox <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            }
          />
          <div className="divide-y divide-slate-100">
            {metrics.highPriorityFeedbacks.map((fb) => (
              <div
                key={fb.id}
                onClick={() => navigate(`/supervisor/feedback/${fb.id}`)}
                className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold text-slate-700">
                      {fb.referenceId}
                    </span>
                    <SeverityBadge severity={fb.severity} size="sm" />
                    <WorkflowStatusBadge status={fb.workflowStatus} size="sm" />
                  </div>
                  <p className="text-xs text-slate-800 font-medium truncate">
                    {fb.branchName} — {fb.selectedTags.join(', ')}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {fb.comments || 'No written comment provided.'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
                    Score: {fb.priorityScore}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Branch Comparison (Visible only for supervisor's assigned branches or all for admin) */}
        <Card className="shadow-sm">
          <CardHeader
            title="Branch Benchmark Performance"
            subtitle={`Average star rating vs severe issue rate across assigned locations`}
          />
          <CardBody className="p-4">
            <BranchComparisonChart data={branchComparisonData} />
          </CardBody>
        </Card>
      </div>

      {/* RECENT ACTIONS TIMELINE */}
      <Card className="shadow-sm">
        <CardHeader
          title="Recent Corrective Duties & Verification Workflow"
          subtitle="Audit log of task states across your supervised locations"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/supervisor/actions')}
            >
              Manage All Tasks
            </Button>
          }
        />
        <div className="divide-y divide-slate-100">
          {recentTasks.map((t) => (
            <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{t.title}</span>
                  <SeverityBadge severity={t.severity} size="sm" />
                </div>
                <p className="text-slate-500">
                  Assigned to <strong className="text-slate-700">{t.assignedToStaffName}</strong> at {t.branchName}.
                  Deadline: {new Date(t.approvedDeadline).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-400">{t.feedbackRef}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/supervisor/actions')}
                >
                  Review Task
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
