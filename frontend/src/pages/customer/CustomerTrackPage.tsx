import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { mockApiService } from '../../services/mockApiService';
import { FeedbackSubmission } from '../../types';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { WorkflowStatusBadge } from '../../components/common/Badge';
import { Search, CheckCircle2, Clock, AlertCircle, ShieldCheck, Sparkles, Star } from 'lucide-react';

export const CustomerTrackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [referenceId, setReferenceId] = useState<string>(searchParams.get('ref') || '');
  const [accessToken, setAccessToken] = useState<string>(searchParams.get('token') || '');
  const [record, setRecord] = useState<FeedbackSubmission | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Auto-search if query params present
  useEffect(() => {
    const ref = searchParams.get('ref');
    const token = searchParams.get('token');
    if (ref && token) {
      setReferenceId(ref);
      setAccessToken(token);
      handleLookup(ref, token);
    }
  }, [searchParams]);

  const handleLookup = async (refVal = referenceId, tokenVal = accessToken) => {
    if (!refVal.trim() || !tokenVal.trim()) {
      setErrorMessage('Please enter both your Reference ID and Access Token.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setHasSearched(true);
      const found = await mockApiService.getFeedbackByTracking(refVal.trim(), tokenVal.trim());
      if (found) {
        setRecord(found);
      } else {
        setRecord(null);
        setErrorMessage(
          'No matching feedback record found. Please verify your Reference ID and Access Token format.'
        );
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('An error occurred during lookup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSampleFill = (ref: string, token: string) => {
    setReferenceId(ref);
    setAccessToken(token);
    handleLookup(ref, token);
  };

  // Milestone stages computation
  const getMilestones = (fb: FeedbackSubmission) => {
    const isUnderAction =
      fb.workflowStatus === 'ACTION_REQUIRED' ||
      fb.workflowStatus === 'ACTION_IN_PROGRESS' ||
      fb.workflowStatus === 'AWAITING_VERIFICATION' ||
      fb.workflowStatus === 'VERIFIED_RESOLVED' ||
      fb.workflowStatus === 'CLOSED';

    const isVerificationStage =
      fb.workflowStatus === 'AWAITING_VERIFICATION' ||
      fb.workflowStatus === 'VERIFIED_RESOLVED' ||
      fb.workflowStatus === 'CLOSED';

    const isResolved =
      fb.workflowStatus === 'VERIFIED_RESOLVED' || fb.workflowStatus === 'CLOSED';

    return [
      {
        title: 'Feedback Received & Ingested',
        description: 'Securely recorded and assigned tracking token.',
        completed: true,
        current: fb.workflowStatus === 'NEW',
        date: new Date(fb.createdAt).toLocaleDateString(),
      },
      {
        title: 'Quality Triage & Categorization',
        description: 'Categorized by our Quality Intelligence team.',
        completed: fb.workflowStatus !== 'NEW',
        current: fb.workflowStatus === 'ANALYSIS_COMPLETED',
      },
      {
        title: 'Corrective Action Plan Dispatched',
        description: 'Branch management assigned specific resolution duties.',
        completed: isUnderAction,
        current: fb.workflowStatus === 'ACTION_IN_PROGRESS',
      },
      {
        title: 'Supervisor Organoleptic & Process Verification',
        description: 'Quality supervisor audits remedy and retrains station staff.',
        completed: isVerificationStage,
        current: fb.workflowStatus === 'AWAITING_VERIFICATION',
      },
      {
        title: 'Issue Verified & Resolved',
        description: 'Corrective protocols verified and operational workflow closed.',
        completed: isResolved,
        current: isResolved,
      },
    ];
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-2">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-brand-600 font-semibold text-xs uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          Customer Resolution Portal
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Track Feedback Resolution</h2>
        <p className="text-sm text-slate-500 max-w-xl">
          Enter the Reference ID and private Access Token you received when submitting your
          dining review to monitor corrective measures in real time.
        </p>

        {/* Demo Helper Shortcuts */}
        <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-600">Sample Records:</span>
          <button
            type="button"
            onClick={() => handleSampleFill('FB-2026-901', 'TK-8412')}
            className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-mono hover:bg-rose-100 transition-colors"
          >
            FB-2026-901 / TK-8412 (Critical Poultry)
          </button>
          <button
            type="button"
            onClick={() => handleSampleFill('FB-2026-905', 'TK-5531')}
            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-mono hover:bg-emerald-100 transition-colors"
          >
            FB-2026-905 / TK-5531 (Resolved Soup)
          </button>
          <button
            type="button"
            onClick={() => handleSampleFill('FB-2026-902', 'TK-7741')}
            className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md font-mono hover:bg-indigo-100 transition-colors"
          >
            FB-2026-902 / TK-7741 (Heat Lamps Pending)
          </button>
        </div>
      </div>

      {/* Input Lookup Form */}
      <Card className="shadow-sm">
        <CardBody className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ref-id" className="block text-xs font-semibold text-slate-700 mb-1">
                Reference ID
              </label>
              <input
                id="ref-id"
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="e.g. FB-2026-901"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label htmlFor="token-id" className="block text-xs font-semibold text-slate-700 mb-1">
                Access Token
              </label>
              <input
                id="token-id"
                type="text"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="e.g. TK-8412"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={() => handleLookup()}
              loading={isLoading}
              variant="primary"
              size="md"
              icon={<Search className="w-4 h-4" />}
            >
              Search Status
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Lookup Result Display */}
      {record && (
        <div className="space-y-6">
          {/* Status Header Card */}
          <Card className="shadow-sm">
            <CardBody className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                      {record.referenceId}
                    </span>
                    <WorkflowStatusBadge status={record.workflowStatus} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{record.branchName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Submitted on {new Date(record.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          record.rating >= s ? 'fill-current' : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-700 ml-1">
                    {record.rating} of 5 Stars
                  </span>
                </div>
              </div>

              {/* Redacted Customer-Friendly Summary */}
              <div className="pt-5 space-y-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Recorded Feedback Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {record.categories.map((c) => (
                      <span
                        key={c}
                        className="text-xs bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded"
                      >
                        {c}
                      </span>
                    ))}
                    {record.selectedTags.map((t) => (
                      <span
                        key={t}
                        className="text-xs bg-brand-50 text-brand-700 font-medium px-2 py-0.5 rounded border border-brand-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Resolution Status Message for Guest */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-brand-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Management Action Status
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {record.workflowStatus === 'VERIFIED_RESOLVED' || record.workflowStatus === 'CLOSED'
                      ? 'Action verified: Our operations supervisor inspected the station and confirmed that corrective measures and retraining have been successfully enacted.'
                      : record.workflowStatus === 'ACTION_IN_PROGRESS' || record.workflowStatus === 'AWAITING_VERIFICATION'
                      ? 'In remediation: A prioritized task has been dispatched to the branch culinary and service staff, and corrective adjustments are actively underway.'
                      : 'Under review: Quality supervisors have logged your review and are preparing targeted operational adjustments.'}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Progress Timeline Milestones */}
          <Card className="shadow-sm">
            <CardHeader
              title="Resolution Milestone Progress"
              subtitle="Closed-loop verification pipeline"
            />
            <CardBody className="p-6">
              <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {getMilestones(record).map((m, idx) => (
                  <div key={idx} className="relative flex items-start gap-3.5">
                    <div
                      className={`absolute -left-6 sm:-left-8 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white ${
                        m.completed
                          ? 'bg-emerald-500 text-white'
                          : m.current
                          ? 'bg-brand-600 text-white animate-pulse'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {m.completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-sm font-semibold ${
                            m.completed || m.current ? 'text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {m.title}
                        </h4>
                        {m.current && (
                          <span className="text-[10px] uppercase font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                            Current Stage
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Empty State after search */}
      {hasSearched && !record && !isLoading && (
        <Card className="p-8 text-center bg-white border border-slate-200">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Record Matches</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Check that the Reference ID begins with FB- and the Access Token is valid. You can
            use one of the sample buttons above to explore.
          </p>
        </Card>
      )}
    </div>
  );
};
