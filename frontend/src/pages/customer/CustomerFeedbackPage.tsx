import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MOCK_CATEGORIES } from '../../data/mockData';
import { mockApiService } from '../../services/mockApiService';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Star, CheckCircle, ShieldAlert, Sparkles, Send, Copy, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CustomerFeedbackPage: React.FC = () => {
  const { branches } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || '');
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTagsByCategory, setSelectedTagsByCategory] = useState<Record<string, string[]>>({});
  const [otherTagText, setOtherTagText] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerContact, setCustomerContact] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);

  // Status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmationData, setConfirmationData] = useState<{
    referenceId: string;
    accessToken: string;
    branchName: string;
  } | null>(null);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);

  // Toggle Category selection
  const handleToggleCategory = (categoryName: string) => {
    setValidationError(null);
    if (selectedCategories.includes(categoryName)) {
      setSelectedCategories((prev) => prev.filter((c) => c !== categoryName));
      // Remove tags for this category
      setSelectedTagsByCategory((prev) => {
        const next = { ...prev };
        delete next[categoryName];
        return next;
      });
    } else {
      setSelectedCategories((prev) => [...prev, categoryName]);
      setSelectedTagsByCategory((prev) => ({ ...prev, [categoryName]: [] }));
    }
  };

  // Toggle Tag selection (Max 3 tags per category!)
  const handleToggleTag = (categoryName: string, tag: string) => {
    setValidationError(null);
    const currentTags = selectedTagsByCategory[categoryName] || [];
    if (currentTags.includes(tag)) {
      setSelectedTagsByCategory((prev) => ({
        ...prev,
        [categoryName]: currentTags.filter((t) => t !== tag),
      }));
    } else {
      if (currentTags.length >= 3) {
        setValidationError(`You can select a maximum of 3 tags for "${categoryName}".`);
        return;
      }
      setSelectedTagsByCategory((prev) => ({
        ...prev,
        [categoryName]: [...currentTags, tag],
      }));
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!selectedBranchId) {
      setValidationError('Please select the restaurant branch you visited.');
      return;
    }

    if (rating === 0) {
      setValidationError('Please select a star rating from 1 to 5.');
      return;
    }

    if (selectedCategories.length === 0) {
      setValidationError('Please select at least one feedback category.');
      return;
    }

    const branch = branches.find((b) => b.id === selectedBranchId);
    const branchName = branch ? branch.name : 'Unknown Branch';

    // Flatten all selected tags
    const allSelectedTags = Object.values(selectedTagsByCategory).flat();

    try {
      setIsSubmitting(true);
      const result = await mockApiService.submitFeedback({
        branchId: selectedBranchId,
        branchName,
        rating,
        categories: selectedCategories,
        selectedTags: allSelectedTags,
        otherTagText: otherTagText.trim() || undefined,
        comments: comments.trim() || undefined,
        customerName: isAnonymous ? undefined : customerName.trim() || undefined,
        customerContact: isAnonymous ? undefined : customerContact.trim() || undefined,
        isAnonymous,
      });

      setConfirmationData({
        referenceId: result.referenceId,
        accessToken: result.accessToken,
        branchName: result.branchName,
      });
    } catch (err) {
      console.error(err);
      setValidationError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!confirmationData) return;
    const text = `FeedbackIQ Tracking Reference: ${confirmationData.referenceId}\nAccess Token: ${confirmationData.accessToken}`;
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleResetForm = () => {
    setRating(0);
    setSelectedCategories([]);
    setSelectedTagsByCategory({});
    setOtherTagText('');
    setComments('');
    setCustomerName('');
    setCustomerContact('');
    setIsAnonymous(false);
    setConfirmationData(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-2">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-brand-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-md">
        <div className="max-w-xl space-y-2">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Guest Feedback Intake
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Help Us Perfect Your Dining Experience
          </h2>
          <p className="text-sm text-brand-100">
            Your feedback triggers immediate investigation and corrective action across our
            kitchen and hospitality teams.
          </p>
        </div>
      </div>

      {/* Main Feedback Form Card */}
      <Card className="shadow-md">
        <form onSubmit={handleSubmit}>
          <CardBody className="p-6 sm:p-8 space-y-8">
            {/* Validation Alert */}
            {validationError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Please check your submission</p>
                  <p className="mt-0.5">{validationError}</p>
                </div>
              </div>
            )}

            {/* 1. Branch Selection */}
            <div className="space-y-2">
              <label htmlFor="branch-select" className="block text-sm font-semibold text-slate-900">
                1. Which branch did you visit? <span className="text-rose-500">*</span>
              </label>
              <select
                id="branch-select"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                required
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.city} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Star Rating */}
            <div className="space-y-2.5">
              <label className="block text-sm font-semibold text-slate-900">
                2. How would you rate your overall experience? <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = (hoveredRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="p-1 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-lg transition-transform active:scale-95"
                      aria-label={`${star} Star${star > 1 ? 's' : ''}`}
                    >
                      <Star
                        className={`w-9 h-9 transition-colors ${
                          isFilled
                            ? 'fill-amber-400 text-amber-400 filter drop-shadow-xs'
                            : 'text-slate-300 hover:text-slate-400'
                        }`}
                      />
                    </button>
                  );
                })}
                <span className="ml-3 text-sm font-semibold text-slate-700">
                  {rating === 1 && '1 Star — Poor'}
                  {rating === 2 && '2 Stars — Below Average'}
                  {rating === 3 && '3 Stars — Average'}
                  {rating === 4 && '4 Stars — Good'}
                  {rating === 5 && '5 Stars — Excellent'}
                </span>
              </div>
            </div>

            {/* 3. Category Selection Before Tag Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900">
                  3. Select feedback categories <span className="text-rose-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose one or more categories to reveal specific tags.
                </p>
              </div>

              {/* Category Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {MOCK_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.name);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleToggleCategory(cat.name)}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{cat.name}</span>
                        {isSelected && <span className="text-brand-600 font-bold">✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Tags Grouped by Selected Category (Max 3 tags per category) */}
              {selectedCategories.length > 0 && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  {selectedCategories.map((categoryName) => {
                    const categoryObj = MOCK_CATEGORIES.find((c) => c.name === categoryName);
                    if (!categoryObj) return null;
                    const chosenTags = selectedTagsByCategory[categoryName] || [];

                    return (
                      <div
                        key={categoryName}
                        className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            {categoryName} Tags
                          </span>
                          <span className="text-[11px] font-medium text-slate-500">
                            {chosenTags.length} / 3 tags selected
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {categoryObj.tags.map((tag) => {
                            const isTagSelected = chosenTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => handleToggleTag(categoryName, tag)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  isTagSelected
                                    ? 'bg-brand-600 text-white shadow-xs'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Other Tag Option */}
              <div className="space-y-1.5 pt-2">
                <label htmlFor="other-tag" className="block text-xs font-medium text-slate-700">
                  Have an unlisted issue or "Other" tag? (Optional)
                </label>
                <input
                  id="other-tag"
                  type="text"
                  value={otherTagText}
                  onChange={(e) => setOtherTagText(e.target.value)}
                  placeholder="e.g. Broken AC in booth, Foreign object in salad, etc."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            {/* 4. Written Comments */}
            <div className="space-y-2">
              <label htmlFor="comments" className="block text-sm font-semibold text-slate-900">
                4. Additional Comments & Description (Optional)
              </label>
              <textarea
                id="comments"
                rows={4}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Tell us more about your visit. Specific details help our kitchen and floor team investigate."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* 5. Contact Information & Anonymous Option */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Contact Details</h4>
                  <p className="text-xs text-slate-500">
                    Provide contact information if you would like the branch manager to follow up.
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                  />
                  <span>Submit Anonymously</span>
                </label>
              </div>

              {!isAnonymous && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  <div>
                    <label htmlFor="customer-name" className="block text-xs font-medium text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      id="customer-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="customer-contact" className="block text-xs font-medium text-slate-700 mb-1">
                      Email or Mobile Phone
                    </label>
                    <input
                      id="customer-contact"
                      type="text"
                      value={customerContact}
                      onChange={(e) => setCustomerContact(e.target.value)}
                      placeholder="e.g. alex@example.com"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                className="w-full py-3 text-base font-semibold shadow-md"
                icon={<Send className="w-5 h-5" />}
              >
                Submit Feedback
              </Button>
            </div>
          </CardBody>
        </form>
      </Card>

      {/* Confirmation Modal */}
      {confirmationData && (
        <Modal
          isOpen={true}
          onClose={() => setConfirmationData(null)}
          title="Feedback Submitted Successfully!"
          subtitle="Your review has been securely logged and sent to quality supervision."
          maxWidth="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button onClick={handleResetForm} variant="outline" size="sm">
                Submit Another Review
              </Button>
              <Button
                onClick={() =>
                  navigate(
                    `/track?ref=${confirmationData.referenceId}&token=${confirmationData.accessToken}`
                  )
                }
                variant="primary"
                size="sm"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Track This Feedback
              </Button>
            </div>
          }
        >
          <div className="space-y-5 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Destination Branch</p>
                <p className="text-sm font-bold text-slate-900">{confirmationData.branchName}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Tracking Reference ID
                </span>
                <p className="text-xl font-mono font-bold text-brand-600 mt-0.5">
                  {confirmationData.referenceId}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Access Token (Private)
                  </span>
                  <p className="text-base font-mono font-bold text-slate-800">
                    {confirmationData.accessToken}
                  </p>
                </div>
                <Button
                  onClick={handleCopyCredentials}
                  variant="outline"
                  size="sm"
                  icon={<Copy className="w-3.5 h-3.5" />}
                >
                  {copiedToken ? 'Copied!' : 'Copy Info'}
                </Button>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Save your Reference ID and Access Token to track our operational progress,
              investigation findings, and resolution verification in real time.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};
