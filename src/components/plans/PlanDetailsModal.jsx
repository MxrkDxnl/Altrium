import { useState, useEffect, useRef } from 'react';
import Button from '../ui/Button';
import api from '../../api';

export default function PlanDetailsModal({ planId, onClose, onEvidenceSubmitted }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Evidence upload & form state
  const generateSubmissionKey = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11)));
  const [submissionKey, setSubmissionKey] = useState(generateSubmissionKey);
  const [selectedFile, setSelectedFile] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  // Assigning manager feedback state per evidence item
  const [feedbackInputs, setFeedbackInputs] = useState({});

  // Assigning manager PDP conclusion state
  const [showEndPdpConfirm, setShowEndPdpConfirm] = useState(false);
  const [endingPdp, setEndingPdp] = useState(false);

  // Assigning manager plan complete / cancel states
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [completingPlan, setCompletingPlan] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancellingPlan, setCancellingPlan] = useState(false);

  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchPlanDetails = () => {
    return api.get(`/plans/${planId}`)
      .then((res) => {
        setPlan(res.data);
        setError('');
        return res.data;
      })
      .catch((err) => {
        console.error('Failed to fetch plan details:', err);
        setError(err.response?.data?.message || 'Failed to load plan details. Please try again.');
        throw err;
      });
  };

  useEffect(() => {
    let active = true;
    api.get(`/plans/${planId}`)
      .then((res) => {
        if (active) {
          setPlan(res.data);
          setError('');
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Failed to fetch plan details:', err);
          setError(err.response?.data?.message || 'Failed to load plan details. Please try again.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [planId]);

  // Handle keyboard events (Escape to close, Tab to trap focus)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showEndPdpConfirm) {
          setShowEndPdpConfirm(false);
          return;
        }
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, showEndPdpConfirm]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No due date specified';
    try {
      if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(n => parseInt(n, 10));
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatAssignedDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleRetry = () => {
    setLoading(true);
    setError('');
    api.get(`/plans/${planId}`)
      .then((res) => {
        setPlan(res.data);
      })
      .catch((err) => {
        console.error('Retry failed:', err);
        setError(err.response?.data?.message || 'Failed to load plan details. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds the maximum allowed size of 10 MB.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const allowedExtensions = ['.pdf', '.docx', '.xlsx', '.png', '.jpg', '.jpeg'];
    const fileName = file.name.toLowerCase();
    const hasValidExt = allowedExtensions.some(ext => fileName.endsWith(ext));
    if (!hasValidExt) {
      setUploadError('Invalid file type. Allowed formats: PDF, DOCX, XLSX, PNG, JPG/JPEG.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadError('');
    setSelectedFile(file);
  };

  const handleSubmitEvidence = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select an evidence file to upload.');
      return;
    }

    // Optional note validation on frontend
    if (note && note.trim().length > 0) {
      const trimmed = note.trim();
      if (trimmed.length < 10) {
        setUploadError('If provided, the explanatory note must be at least 10 characters long.');
        return;
      }
      const words = trimmed.split(/\s+/).filter(w => w.length > 0);
      if (words.length < 2) {
        setUploadError('If provided, the explanatory note must contain at least 2 words describing the deliverables.');
        return;
      }
      if (/^(.)\1{4,}$/i.test(trimmed) || /^[\s.,_\-!@#$%^&*()+=/\\|<>?]+$/.test(trimmed)) {
        setUploadError('Explanatory note cannot consist solely of punctuation or repeated filler characters.');
        return;
      }
    }

    setSubmitting(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const formData = new FormData();
      formData.append('evidenceFile', selectedFile);
      formData.append('idempotency_key', submissionKey);
      if (note && note.trim()) {
        formData.append('note', note.trim());
      }

      const res = await api.post(`/plans/${planId}/evidence`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Clear input form & generate new submission key for subsequent uploads
      setSelectedFile(null);
      setNote('');
      setSubmissionKey(generateSubmissionKey()); // Fresh key for next intentional submission
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Re-fetch full plan details from server for comprehensive evidence history & status update
      await fetchPlanDetails().catch(refreshErr => {
        console.warn('Background refresh after evidence upload failed:', refreshErr);
      });

      setUploadSuccess(res.data.isDuplicate ? 'Evidence already received.' : 'Evidence submitted successfully! Your manager has been notified.');

      if (onEvidenceSubmitted) {
        onEvidenceSubmitted();
      }
    } catch (err) {
      console.error('Evidence submission failed:', err);
      // On error, submissionKey remains unchanged so retrying uses the same idempotency key
      setUploadError(err.response?.data?.message || 'Failed to submit evidence. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadEvidence = async (evidenceItem) => {
    if (!evidenceItem) return;
    setDownloadingId(evidenceItem.id);
    try {
      const response = await api.get(`/plans/${planId}/evidence/${evidenceItem.id}/download`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: evidenceItem.mime_type || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = evidenceItem.original_filename || 'evidence_file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      setUploadError('Failed to download evidence file. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleEndPdpConfirm = async () => {
    setEndingPdp(true);
    setUploadError('');
    try {
      await api.patch(`/plans/${planId}/end-pdp`);
      setPlan(prev => ({
        ...prev,
        status: 'completed',
        canEndPdp: false,
        lifecycleStatus: {
          ...prev.lifecycleStatus,
          isOpen: false,
          reason: 'This Personal Development Plan has been completed and concluded.'
        }
      }));
      setShowEndPdpConfirm(false);
      setUploadSuccess('Personal Development Plan concluded and marked completed successfully.');
      if (onEvidenceSubmitted) {
        onEvidenceSubmitted();
      }
    } catch (err) {
      console.error('Failed to end PDP:', err);
      setUploadError(err.response?.data?.message || 'Failed to end plan. Please try again.');
    } finally {
      setEndingPdp(false);
    }
  };

  const handleCompleteConfirm = async () => {
    setCompletingPlan(true);
    setUploadError('');
    try {
      await api.post(`/plans/${planId}/complete`);
      setPlan(prev => ({
        ...prev,
        status: 'completed',
        canEndPdp: false,
        lifecycleStatus: {
          ...prev.lifecycleStatus,
          isOpen: false,
          reason: `This ${prev.type} plan has been completed and concluded.`
        }
      }));
      setShowCompleteConfirm(false);
      setUploadSuccess(`${plan.type} plan concluded and marked completed successfully.`);
      if (onEvidenceSubmitted) {
        onEvidenceSubmitted();
      }
    } catch (err) {
      console.error('Failed to complete plan:', err);
      setUploadError(err.response?.data?.message || 'Failed to complete plan. Please try again.');
    } finally {
      setCompletingPlan(false);
    }
  };

  const handleCancelConfirm = async () => {
    setCancellingPlan(true);
    setUploadError('');
    try {
      await api.post(`/plans/${planId}/cancel`);
      setPlan(prev => ({
        ...prev,
        status: 'cancelled',
        canEndPdp: false,
        lifecycleStatus: {
          ...prev.lifecycleStatus,
          isOpen: false,
          reason: 'This plan has been cancelled by the assigning manager.'
        }
      }));
      setShowCancelConfirm(false);
      setUploadSuccess('Plan has been successfully cancelled.');
      if (onEvidenceSubmitted) {
        onEvidenceSubmitted();
      }
    } catch (err) {
      console.error('Failed to cancel plan:', err);
      setUploadError(err.response?.data?.message || 'Failed to cancel plan. Please try again.');
    } finally {
      setCancellingPlan(false);
    }
  };

  const getFeedbackState = (evidenceId) => {
    return feedbackInputs[evidenceId] || {
      text: '',
      submitting: false,
      error: '',
      success: '',
      idempotencyKey: generateSubmissionKey(),
      isFormOpen: false
    };
  };

  const updateFeedbackState = (evidenceId, updates) => {
    setFeedbackInputs(prev => ({
      ...prev,
      [evidenceId]: {
        ...getFeedbackState(evidenceId),
        ...updates
      }
    }));
  };

  const handleSubmitFeedback = async (e, evidenceId) => {
    e.preventDefault();
    const state = getFeedbackState(evidenceId);
    const text = state.text.trim();

    if (!text) {
      updateFeedbackState(evidenceId, { error: 'Feedback text is required and cannot be empty.' });
      return;
    }
    if (text.length < 10) {
      updateFeedbackState(evidenceId, { error: 'Feedback must be at least 10 characters long to provide meaningful guidance.' });
      return;
    }
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 2) {
      updateFeedbackState(evidenceId, { error: 'Feedback must contain at least 2 words explaining your review or guidance.' });
      return;
    }
    if (/^[\s.,_\-!@#$%^&*()+=/\\|<>?~`"':;{}]+$/.test(text) || /^(.)\1{4,}$/i.test(text)) {
      updateFeedbackState(evidenceId, { error: 'Feedback cannot consist solely of punctuation or repeated characters.' });
      return;
    }

    updateFeedbackState(evidenceId, { submitting: true, error: '', success: '' });

    try {
      const res = await api.post(`/plans/${planId}/evidence/${evidenceId}/feedback`, {
        feedback_text: text,
        idempotency_key: state.idempotencyKey
      });

      const newFeedback = res.data.feedback;

      setPlan(prev => {
        if (!prev || !prev.evidences) return prev;
        const updatedEvidences = prev.evidences.map(ev => {
          if (ev.id === evidenceId) {
            const existingFeedbacks = ev.feedbacks || [];
            const alreadyPresent = existingFeedbacks.some(fb => fb.id === newFeedback.id);
            return {
              ...ev,
              feedbacks: alreadyPresent ? existingFeedbacks : [...existingFeedbacks, newFeedback]
            };
          }
          return ev;
        });
        return { ...prev, evidences: updatedEvidences };
      });

      updateFeedbackState(evidenceId, {
        text: '',
        submitting: false,
        error: '',
        success: res.data.isDuplicate ? 'Feedback already recorded.' : 'Feedback submitted successfully! Recipient has been notified.',
        idempotencyKey: generateSubmissionKey(),
        isFormOpen: false
      });
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      updateFeedbackState(evidenceId, {
        submitting: false,
        error: err.response?.data?.message || 'Failed to submit feedback. Please try again.'
      });
    }
  };

  const evidences = plan?.evidences || [];
  const isPdpActive = plan?.type === 'PDP' && plan?.status !== 'completed';
  const isPipActive = plan?.type === 'PIP' && plan?.status !== 'completed' && plan?.lifecycleStatus?.isOpen;
  const canUpload = plan?.isRecipient && (isPdpActive || isPipActive);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs overflow-y-auto p-4 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget && !showEndPdpConfirm) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-details-title"
    >
      <div
        ref={modalRef}
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center space-x-3">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${
                plan?.type === 'PIP'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}
            >
              {plan?.type === 'PIP' ? 'Performance Improvement Plan (PIP)' : 'Personal Development Plan (PDP)'}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${
                plan?.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : plan?.status === 'evidence_submitted'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-yellow-50 text-yellow-800 border-yellow-200'
              }`}
            >
              {plan?.status === 'completed'
                ? 'Completed'
                : plan?.status === 'evidence_submitted'
                ? 'Evidence Submitted'
                : plan?.status || 'Pending'}
            </span>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close plan details"
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 font-medium">Loading plan details...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center space-y-4">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm max-w-md mx-auto">
                <p className="font-semibold">Unable to load plan details</p>
                <p className="text-xs mt-1 text-red-600">{error}</p>
              </div>
              <Button variant="outline" onClick={handleRetry} className="text-xs px-4 py-1.5">
                Retry
              </Button>
            </div>
          ) : plan ? (
            <>
              {/* Title & Manager Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 id="plan-details-title" className="text-2xl font-bold text-gray-900 tracking-tight leading-snug">
                  {plan.title}
                </h2>

                {/* Assigning Manager Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                  {plan.canEndPdp && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowEndPdpConfirm(true)}
                      className="text-xs px-3.5 py-1.5 font-semibold text-emerald-800 border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 transition-colors shadow-2xs whitespace-nowrap"
                    >
                      End Development Plan
                    </Button>
                  )}

                  {plan.type === 'PIP' && plan.isAssigningManager && plan.status !== 'completed' && plan.status !== 'cancelled' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCompleteConfirm(true)}
                      className="text-xs px-3.5 py-1.5 font-semibold text-emerald-800 border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 transition-colors shadow-2xs whitespace-nowrap"
                    >
                      Mark PIP Completed
                    </Button>
                  )}

                  {plan.isAssigningManager && plan.status !== 'completed' && plan.status !== 'cancelled' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCancelConfirm(true)}
                      className="text-xs px-3 py-1.5 font-semibold text-red-700 border-red-200 bg-red-50/50 hover:bg-red-100 transition-colors shadow-2xs whitespace-nowrap"
                    >
                      Cancel Plan
                    </Button>
                  )}
                </div>
              </div>

              {/* Complete PIP Confirmation Banner */}
              {showCompleteConfirm && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-start space-x-2.5">
                    <svg className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-900">
                        Confirm Concluding Performance Improvement Plan
                      </h4>
                      <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                        Are you sure you want to mark this PIP as completed for <span className="font-semibold">{plan.recipient?.name}</span>?
                        Ending the plan concludes further evidence uploads while permanently preserving all uploaded evidence files, notes, and records.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-1 border-t border-emerald-200">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCompleteConfirm(false)}
                      disabled={completingPlan}
                      className="text-xs px-3 py-1.5 bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleCompleteConfirm}
                      disabled={completingPlan}
                      className="text-xs px-3.5 py-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {completingPlan ? 'Concluding Plan...' : 'Confirm & Complete'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Cancel Plan Confirmation Banner */}
              {showCancelConfirm && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-start space-x-2.5">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-bold text-red-900">
                        Confirm Cancelling {plan.type} Plan
                      </h4>
                      <p className="text-xs text-red-800 mt-1 leading-relaxed">
                        Are you sure you want to cancel the {plan.type} plan &ldquo;{plan.title}&rdquo; for <span className="font-semibold">{plan.recipient?.name}</span>?
                        This will mark the plan and linked tasks as cancelled.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-1 border-t border-red-200">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCancelConfirm(false)}
                      disabled={cancellingPlan}
                      className="text-xs px-3 py-1.5 bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    >
                      Keep Plan
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleCancelConfirm}
                      disabled={cancellingPlan}
                      className="text-xs px-3.5 py-1.5 font-semibold bg-red-600 hover:bg-red-700 text-white"
                    >
                      {cancellingPlan ? 'Cancelling Plan...' : 'Confirm & Cancel Plan'}
                    </Button>
                  </div>
                </div>
              )}

              {/* End PDP Confirmation Modal / Banner */}
              {showEndPdpConfirm && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-start space-x-2.5">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-bold text-amber-900">
                        Confirm Concluding Personal Development Plan
                      </h4>
                      <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                        Are you sure you want to mark this PDP as completed for <span className="font-semibold">{plan.recipient?.name}</span>?
                        Ending the plan concludes further evidence uploads while permanently preserving all uploaded evidence files, notes, and records.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-1 border-t border-amber-200">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowEndPdpConfirm(false)}
                      disabled={endingPdp}
                      className="text-xs px-3 py-1.5 bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleEndPdpConfirm}
                      disabled={endingPdp}
                      className="text-xs px-3.5 py-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {endingPdp ? 'Concluding Plan...' : 'Confirm & End Plan'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-gray-50/80 border border-gray-100 text-sm">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                    Assigned By
                  </span>
                  <span className="font-medium text-gray-900 mt-0.5 block">
                    {plan.manager?.name || 'Manager'}
                  </span>
                  {plan.manager?.role && (
                    <span className="text-xs text-gray-500 capitalize block">
                      {plan.manager.role.replace('_', ' ')}
                      {plan.manager.department ? ` • ${plan.manager.department}` : ''}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                    Assigned Cycle
                  </span>
                  <span className="font-medium text-gray-900 mt-0.5 block">
                    {plan.quarter} {plan.year}
                  </span>
                  <span className="text-xs text-gray-500 block">
                    Assigned: {formatAssignedDate(plan.createdAt)}
                  </span>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-gray-200/60 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                      {plan.type === 'PIP' ? 'Evidence Deadline' : 'Plan Timeline'}
                    </span>
                    <span className={`font-medium mt-0.5 block ${plan.type === 'PDP' ? 'text-emerald-800 font-medium' : plan.lifecycleStatus?.deadline ? 'text-amber-700 font-semibold' : 'text-gray-500 italic'}`}>
                      {plan.type === 'PDP' ? 'Ongoing Development' : (plan.lifecycleStatus?.deadline || formatDate(plan.due_date))}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block text-right">
                      Recipient
                    </span>
                    <span className="font-medium text-gray-900 mt-0.5 block text-right">
                      {plan.recipient?.name || 'You'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Instructions / Expected Outcomes */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Manager Instructions & Expected Outcomes
                </label>
                <div className="bg-amber-50/30 border border-amber-100 rounded-lg p-4 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words font-normal">
                  {plan.description}
                </div>
              </div>

              {/* Evidence Section */}
              <div className="pt-4 border-t border-gray-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900">
                    Evidence & Deliverables History
                  </h3>
                  {plan.lifecycleStatus && (
                    <span
                      className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                        plan.status === 'completed'
                          ? 'bg-gray-100 text-gray-800 border border-gray-200'
                          : plan.lifecycleStatus.isOpen
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {plan.status === 'completed'
                        ? 'Plan Concluded'
                        : plan.type === 'PDP'
                        ? 'Continuous Upload'
                        : plan.lifecycleStatus.isOpen
                        ? `Open • ${plan.lifecycleStatus.deadline}`
                        : 'Submission deadline passed'}
                    </span>
                  )}
                </div>

                {uploadSuccess && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-r-md text-sm text-green-800 animate-in fade-in duration-150">
                    <p className="font-semibold">{uploadSuccess}</p>
                  </div>
                )}

                {uploadError && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-md text-sm text-red-700 animate-in fade-in duration-150">
                    <p className="font-semibold">Action Error</p>
                    <p className="text-xs mt-0.5">{uploadError}</p>
                  </div>
                )}

                {/* Submitted Evidence List */}
                {evidences.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Submitted Evidence ({evidences.length} {evidences.length === 1 ? 'file' : 'files'})
                    </p>
                    {evidences.map((evItem) => (
                      <div key={evItem.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-2xs space-y-2.5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="p-2 bg-amber-50 rounded-lg text-amber-600 border border-amber-100 shrink-0">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">
                                {evItem.original_filename}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {formatFileSize(evItem.file_size)} • Submitted {formatDateTime(evItem.submitted_at)}
                              </p>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleDownloadEvidence(evItem)}
                            disabled={downloadingId === evItem.id}
                            className="text-xs px-3 py-1.5 font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            {downloadingId === evItem.id ? 'Downloading...' : 'Download'}
                          </Button>
                        </div>

                        {evItem.note && (
                          <div className="bg-gray-50/80 rounded-md p-2.5 border border-gray-100 text-xs text-gray-700">
                            <span className="font-semibold text-gray-500 uppercase text-[10px] tracking-wider block mb-0.5">
                              Explanatory Note
                            </span>
                            <p className="whitespace-pre-wrap break-words leading-relaxed">
                              {evItem.note}
                            </p>
                          </div>
                        )}

                        {/* Manager Feedback History Section */}
                        <div className="pt-2 border-t border-gray-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center">
                              <svg className="w-3.5 h-3.5 mr-1.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              Manager Review & Feedback {evItem.feedbacks && evItem.feedbacks.length > 0 ? `(${evItem.feedbacks.length})` : ''}
                            </span>

                            {plan.isAssigningManager && (
                              <button
                                type="button"
                                onClick={() => {
                                  const currentState = getFeedbackState(evItem.id);
                                  updateFeedbackState(evItem.id, { isFormOpen: !currentState.isFormOpen, error: '', success: '' });
                                }}
                                className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100/80 px-2.5 py-1 rounded-md transition-colors border border-amber-200/80"
                              >
                                {getFeedbackState(evItem.id).isFormOpen ? 'Cancel' : (evItem.feedbacks && evItem.feedbacks.length > 0 ? '+ Add Follow-up Feedback' : '+ Provide Feedback')}
                              </button>
                            )}
                          </div>

                          {/* Existing Feedbacks */}
                          {evItem.feedbacks && evItem.feedbacks.length > 0 ? (
                            <div className="space-y-2">
                              {evItem.feedbacks.map((fb) => (
                                <div key={fb.id} className="bg-amber-50/40 rounded-lg p-3 border border-amber-200/60 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-bold text-xs text-gray-900">
                                        {fb.manager?.name || 'Assigning Manager'}
                                      </span>
                                      {fb.manager?.role && (
                                        <span className="text-[10px] uppercase font-semibold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded capitalize">
                                          {fb.manager.role.replace('_', ' ')}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-gray-500">
                                      {formatDateTime(fb.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                                    {fb.feedback_text}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            !plan.isAssigningManager && (
                              <p className="text-xs text-gray-400 italic">
                                No manager feedback provided yet for this deliverable.
                              </p>
                            )
                          )}

                          {/* Manager Feedback Form (Expandable) */}
                          {plan.isAssigningManager && getFeedbackState(evItem.id).isFormOpen && (
                            <form
                              onSubmit={(e) => handleSubmitFeedback(e, evItem.id)}
                              className="bg-gray-50/90 rounded-lg border border-gray-200 p-3.5 space-y-3 mt-2 animate-in fade-in zoom-in-95 duration-100"
                            >
                              <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                                  Provide Feedback on Deliverable
                                </label>
                                <span className="text-[11px] text-gray-400">
                                  {getFeedbackState(evItem.id).text.length}/2000
                                </span>
                              </div>

                              <textarea
                                value={getFeedbackState(evItem.id).text}
                                onChange={(e) => updateFeedbackState(evItem.id, { text: e.target.value.slice(0, 2000), error: '' })}
                                rows={3}
                                placeholder="Provide constructive review comments, deliverable assessment, or specific action items for the recipient (minimum 10 characters and 2 words)..."
                                className="w-full text-xs text-gray-900 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-white"
                              />

                              {getFeedbackState(evItem.id).error && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-2 rounded-r-md text-xs text-red-700">
                                  {getFeedbackState(evItem.id).error}
                                </div>
                              )}

                              {getFeedbackState(evItem.id).success && (
                                <div className="bg-green-50 border-l-4 border-green-500 p-2 rounded-r-md text-xs text-green-800">
                                  {getFeedbackState(evItem.id).success}
                                </div>
                              )}

                              <div className="flex items-center justify-end space-x-2 pt-1 border-t border-gray-200/60">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => updateFeedbackState(evItem.id, { isFormOpen: false, error: '' })}
                                  disabled={getFeedbackState(evItem.id).submitting}
                                  className="text-xs px-3 py-1.5"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="submit"
                                  variant="primary"
                                  disabled={!getFeedbackState(evItem.id).text.trim() || getFeedbackState(evItem.id).submitting}
                                  className="text-xs px-3.5 py-1.5 font-semibold"
                                >
                                  {getFeedbackState(evItem.id).submitting ? 'Submitting...' : 'Submit Feedback'}
                                </Button>
                              </div>
                            </form>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-center text-xs text-gray-500 border border-dashed border-gray-200">
                    No evidence files submitted yet.
                  </div>
                )}

                {/* Evidence Upload Form for Recipient when active */}
                {canUpload && (
                  <form onSubmit={handleSubmitEvidence} className="bg-gray-50/70 rounded-lg border border-gray-200 p-4 space-y-4">
                    <div>
                      <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block mb-1">
                        {evidences.length > 0 ? 'Add Additional Evidence Deliverable' : 'Upload Evidence Document / Image'}
                      </span>
                      <p className="text-xs text-gray-500 mb-2">
                        Upload deliverables as work progresses. All submissions are preserved in your evidence history.
                      </p>

                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg"
                        className="block w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer border border-gray-300 rounded-lg bg-white p-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Accepted formats: <span className="font-medium text-gray-700">PDF, DOCX, XLSX, PNG, JPG/JPEG</span> • Maximum size: <span className="font-medium text-gray-700">10 MB</span>
                      </p>
                      {selectedFile && (
                        <div className="mt-2 flex items-center justify-between bg-amber-50/60 border border-amber-200/80 rounded-md px-3 py-1.5 text-xs text-amber-900">
                          <span className="truncate font-medium">{selectedFile.name} ({formatFileSize(selectedFile.size)})</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="text-gray-400 hover:text-gray-600 ml-2 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Optional Note with length validation */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Explanatory Note <span className="text-gray-400 font-normal normal-case">(Optional)</span>
                        </label>
                        <span className="text-[11px] text-gray-400">
                          {note.length}/1000
                        </span>
                      </div>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value.slice(0, 1000))}
                        placeholder="Provide deliverables context or summary for your manager (minimum 10 characters and 2 words if entered)..."
                        rows={3}
                        className="w-full text-xs text-gray-900 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-white"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={!selectedFile || submitting}
                        className="text-xs px-4 py-2 font-semibold shadow-2xs"
                      >
                        {submitting ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Uploading & Appending...</span>
                          </div>
                        ) : (
                          'Submit Evidence'
                        )}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Plan Concluded Notice */}
                {plan.status === 'completed' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 text-xs text-gray-700 space-y-1">
                    <p className="font-semibold text-gray-900 flex items-center">
                      <svg className="w-4 h-4 mr-1.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      This plan has concluded
                    </p>
                    <p className="text-gray-600">
                      Further evidence uploads are concluded. All previously submitted deliverables and notes remain permanently preserved above.
                    </p>
                  </div>
                )}

                {/* PIP Deadline Passed Notice */}
                {plan.type === 'PIP' && plan.status !== 'completed' && plan.lifecycleStatus?.isPast && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900 space-y-1">
                    <p className="font-semibold flex items-center text-amber-900">
                      <svg className="w-4 h-4 mr-1.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Submission deadline passed
                    </p>
                    <p className="text-xs text-amber-800 mt-0.5">
                      The evidence submission window for this Performance Improvement Plan ended on {plan.lifecycleStatus?.deadline} (evidence was allowed throughout August 30, 2027 in Asia/Colombo; rejection began August 31, 2027 at 00:00:00). Further evidence uploads are closed. All previously submitted deliverables and notes remain permanently preserved above.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
