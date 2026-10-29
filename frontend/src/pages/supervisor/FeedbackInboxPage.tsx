import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { mockApiService } from '../../services/mockApiService';
import {
  FeedbackSubmission,
  SeverityLevel,
  WorkflowStatus,
  FeedbackFilterOptions,
} from '../../types';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {
  SeverityBadge,
  SentimentBadge,
  WorkflowStatusBadge,
} from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Search,
  Filter,
  RotateCcw,
  Star,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Repeat,
  AlertCircle,
} from 'lucide-react';

export const FeedbackInboxPage: React.FC = () => {
  const { currentUser, currentRole, branches, activeBranchId } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>(
    activeBranchId !== 'ALL' ? activeBranchId : 'ALL'
  );
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel | 'ALL'>(
    (searchParams.get('severity') as SeverityLevel) || 'ALL'
  );
  const [selectedStatus, setSelectedStatus] = useState<WorkflowStatus | 'ALL'>(
    (searchParams.get('status') as WorkflowStatus) || 'ALL'
  );
  const [selectedRating, setSelectedRating] = useState<number | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<FeedbackFilterOptions['sortBy']>('PRIORITY_DESC');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Data State
  const [feedbackList, setFeedbackList] = useState<FeedbackSubmission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync selected branch if global activeBranchId changes
  useEffect(() => {
    if (activeBranchId !== 'ALL') {
      setSelectedBranch(activeBranchId);
    }
  }, [activeBranchId]);

  const loadFeedbacks = async () => {
    try {
      setIsLoading(true);
      const data = await mockApiService.getFeedbackList({
        searchQuery,
        branchId: selectedBranch,
        severity: selectedSeverity,
        workflowStatus: selectedStatus,
        rating: selectedRating,
        category: selectedCategory,
        sortBy,
      });

      // If user is supervisor and viewing "ALL", restrict to assigned branches
      let scoped = data;
      if (currentRole === 'SUPERVISOR' && selectedBranch === 'ALL') {
        scoped = data.filter((item) => currentUser.branchIds.includes(item.branchId));
      }

      setFeedbackList(scoped);
      setCurrentPage(1); // reset to page 1 on filter update
    } catch (err) {
      console.error('Failed to load feedback inbox', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, [
    searchQuery,
    selectedBranch,
    selectedSeverity,
    selectedStatus,
    selectedRating,
    selectedCategory,
    sortBy,
    currentUser,
  ]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedBranch('ALL');
    setSelectedSeverity('ALL');
    setSelectedStatus('ALL');
    setSelectedRating('ALL');
    setSelectedCategory('ALL');
    setSortBy('PRIORITY_DESC');
  };

  const isFilterActive =
    searchQuery.trim() !== '' ||
    selectedBranch !== 'ALL' ||
    selectedSeverity !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedRating !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    sortBy !== 'PRIORITY_DESC';

  // Pagination slicing
  const totalPages = Math.ceil(feedbackList.length / itemsPerPage) || 1;
  const paginatedItems = feedbackList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-5">
      {/* Page Title & Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Feedback Inbox</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational triage, multi-agent AI analysis, and corrective workflow management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Total Matches: <strong>{feedbackList.length}</strong>
          </span>
          {isFilterActive && (
            <Button
              onClick={handleResetFilters}
              variant="outline"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <Card className="shadow-xs p-4 space-y-3">
        {/* Row 1: Search & Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, guest comment, tag, branch, or issue..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium shrink-0 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
            >
              <option value="PRIORITY_DESC">Highest Priority Score (Default)</option>
              <option value="DATE_DESC">Newest Date First</option>
              <option value="DATE_ASC">Oldest Date First</option>
              <option value="RATING_ASC">Lowest Rating First</option>
              <option value="RATING_DESC">Highest Rating First</option>
            </select>
          </div>
        </div>

        {/* Row 2: Secondary Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          {/* Branch Filter */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Branch
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Severity
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Workflow Status Filter */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Workflow Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="ANALYSIS_COMPLETED">Analysis Completed</option>
              <option value="ACTION_REQUIRED">Action Required</option>
              <option value="ACTION_IN_PROGRESS">Action In Progress</option>
              <option value="AWAITING_VERIFICATION">Awaiting Verification</option>
              <option value="VERIFIED_RESOLVED">Verified Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Star Rating Filter */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Rating
            </label>
            <select
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Ratings</option>
              <option value="1">1 Star</option>
              <option value="2">2 Stars</option>
              <option value="3">3 Stars</option>
              <option value="4">4 Stars</option>
              <option value="5">5 Stars</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="Food Quality">Food Quality</option>
              <option value="Service">Service</option>
              <option value="Cleanliness">Cleanliness</option>
              <option value="Overall Experience">Overall Experience</option>
            </select>
          </div>
        </div>

        {/* Active Filters Bar */}
        {isFilterActive && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-400">Active Filters:</span>
            {searchQuery && (
              <span className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded-md border border-brand-200">
                Query: "{searchQuery}"
              </span>
            )}
            {selectedBranch !== 'ALL' && (
              <span className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded-md border border-brand-200">
                Branch: {branches.find((b) => b.id === selectedBranch)?.code}
              </span>
            )}
            {selectedSeverity !== 'ALL' && (
              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-md border border-rose-200">
                Severity: {selectedSeverity}
              </span>
            )}
            {selectedStatus !== 'ALL' && (
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md border border-purple-200">
                Status: {selectedStatus}
              </span>
            )}
            {selectedRating !== 'ALL' && (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-200">
                Rating: {selectedRating}★
              </span>
            )}
            {selectedCategory !== 'ALL' && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                Category: {selectedCategory}
              </span>
            )}
          </div>
        )}
      </Card>

      {/* Feedback Table / List */}
      {isLoading ? (
        <LoadingSpinner label="Querying feedback records..." />
      ) : feedbackList.length === 0 ? (
        <EmptyState
          icon={<AlertCircle className="w-6 h-6" />}
          title="No Feedback Records Found"
          description="Try broadening your search query or clearing active severity and status filters."
          actionLabel="Clear Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <Card className="shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Ref ID</th>
                  <th className="py-3 px-4">Date & Branch</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Tags & Comments</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Recurrence</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Priority</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.map((fb) => (
                  <tr
                    key={fb.id}
                    onClick={() => navigate(`/supervisor/feedback/${fb.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {fb.referenceId}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{fb.branchName}</p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(fb.createdAt).toLocaleDateString()}
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center text-amber-500">
                        <span className="font-bold mr-1">{fb.rating}</span>
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </div>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex flex-wrap gap-1 mb-1">
                        {fb.selectedTags.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium"
                          >
                            {t}
                          </span>
                        ))}
                        {fb.selectedTags.length > 2 && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            +{fb.selectedTags.length - 2}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-[11px] truncate italic">
                        {fb.comments ? `"${fb.comments}"` : 'No written text'}
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      <SeverityBadge severity={fb.severity} size="sm" />
                    </td>

                    <td className="py-3 px-4">
                      {fb.isRecurring ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                          <Repeat className="w-3 h-3 text-amber-600" />
                          x{fb.recurrenceCount}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Single</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <WorkflowStatusBadge status={fb.workflowStatus} size="sm" />
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-1 rounded font-bold text-xs ${
                          fb.priorityScore >= 80
                            ? 'bg-rose-100 text-rose-800'
                            : fb.priorityScore >= 50
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {fb.priorityScore}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/supervisor/feedback/${fb.id}`);
                        }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile / Tablet Cards Fallback */}
          <div className="lg:hidden divide-y divide-slate-100">
            {paginatedItems.map((fb) => (
              <div
                key={fb.id}
                onClick={() => navigate(`/supervisor/feedback/${fb.id}`)}
                className="p-4 space-y-2 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {fb.referenceId}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <SeverityBadge severity={fb.severity} size="sm" />
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                      Score: {fb.priorityScore}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium text-slate-800">{fb.branchName}</span>
                  <div className="flex items-center text-amber-500">
                    <span className="font-bold mr-1">{fb.rating}</span>
                    <Star className="w-3 h-3 fill-current" />
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">
                  {fb.comments || fb.selectedTags.join(', ')}
                </p>

                <div className="flex items-center justify-between pt-1">
                  <WorkflowStatusBadge status={fb.workflowStatus} size="sm" />
                  <span className="text-[11px] text-slate-400">
                    {new Date(fb.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, feedbackList.length)} of {feedbackList.length} items
            </span>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                icon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Prev
              </Button>
              <span className="font-semibold text-slate-800">
                {currentPage} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                icon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
