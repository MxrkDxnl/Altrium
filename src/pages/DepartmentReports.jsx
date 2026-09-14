import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/useAuth';
import api from '../api';
import Card from '../components/ui/Card';
import InfoAlert from '../components/ui/InfoAlert';
import Button from '../components/ui/Button';

export default function DepartmentReports() {
  const { currentUser } = useAuth();
  const isDeptManager = currentUser?.role === 'department_manager';
  const isHrRecipient = currentUser?.role === 'employee' &&
    (currentUser?.department === 'Human Resources' || currentUser?.department === 'HR') &&
    Boolean(currentUser?.report_portfolio);

  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState(null);
  const [reportsList, setReportsList] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  // Form State for Dept Managers
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isRevisionMode, setIsRevisionMode] = useState(false);
  const [parentReportId, setParentReportId] = useState(null);

  const [title, setTitle] = useState('');
  const [reviewsSummary, setReviewsSummary] = useState('');
  const [pipSummary, setPipSummary] = useState('');
  const [pdpSummary, setPdpSummary] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [submissionKey, setSubmissionKey] = useState('');
  
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Preview Drawer Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const fileInputRef = useRef(null);

  // Generate a durable submission key once per form session
  const initSubmissionKey = useCallback(() => {
    const key = `dept_rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setSubmissionKey(key);
    return key;
  }, []);

  // Fetch initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    setFormError('');
    try {
      if (isDeptManager) {
        try {
          const prevRes = await api.get('/reports/recipient-preview');
          setPreviewData(prevRes.data);
        } catch (err) {
          console.error('Failed to fetch recipient preview:', err);
          setFormError(err.response?.data?.message || 'Failed to resolve reporting configuration');
        }
      }

      if (isDeptManager || isHrRecipient) {
        const listRes = await api.get('/reports');
        setReportsList(listRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load reports data:', err);
      setFormError(err.response?.data?.message || 'Error loading department reports');
    } finally {
      setLoading(false);
    }
  }, [isDeptManager, isHrRecipient]);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (isMounted) {
        await loadData();
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [loadData]);

  // Open Form for New Report
  const handleOpenNewReport = () => {
    setIsRevisionMode(false);
    setParentReportId(null);
    setTitle(`${previewData?.department || currentUser?.department || 'Department'} Performance & Capability Summary (${previewData?.quarter || 'Q3'} ${previewData?.year || '2026'})`);
    setReviewsSummary('');
    setPipSummary('');
    setPdpSummary('');
    setRevisionNotes('');
    setSelectedFile(null);
    setFieldErrors({});
    setFormError('');
    setFormSuccess('');
    initSubmissionKey();
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowForm(true);
  };

  // Open Form for Revision
  const handleOpenRevision = (report) => {
    setIsRevisionMode(true);
    setParentReportId(report.parent_report_id || report.id);
    setTitle(`${report.title} (Revision ${report.revision_number + 1})`);
    setReviewsSummary(report.reviews_summary);
    setPipSummary(report.pip_summary);
    setPdpSummary(report.pdp_summary);
    setRevisionNotes('');
    setSelectedFile(null);
    setFieldErrors({});
    setFormError('');
    setFormSuccess('');
    initSubmissionKey();
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Form Validation
  const validateForm = () => {
    const errs = {};
    if (!title.trim() || title.trim().length < 5) {
      errs.title = 'Title must be at least 5 characters long.';
    }
    if (!reviewsSummary.trim() || reviewsSummary.trim().length < 10) {
      errs.reviewsSummary = 'Reviews summary is required (minimum 10 characters). Write "No activity this cycle" if applicable.';
    }
    if (!pipSummary.trim() || pipSummary.trim().length < 10) {
      errs.pipSummary = 'PIP summary is required (minimum 10 characters). Write "No activity this cycle" if applicable.';
    }
    if (!pdpSummary.trim() || pdpSummary.trim().length < 10) {
      errs.pdpSummary = 'PDP summary is required (minimum 10 characters). Write "No activity this cycle" if applicable.';
    }
    if (isRevisionMode && (!revisionNotes.trim() || revisionNotes.trim().length < 5)) {
      errs.revisionNotes = 'Revision notes are required (minimum 5 characters explaining changes).';
    }
    if (!selectedFile) {
      errs.file = 'A summary document (PDF, DOCX, XLSX, PNG, JPG) is required.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle Form Submit
  const handleSubmitReport = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('reviews_summary', reviewsSummary.trim());
      formData.append('pip_summary', pipSummary.trim());
      formData.append('pdp_summary', pdpSummary.trim());
      formData.append('submission_key', submissionKey);
      if (isRevisionMode && parentReportId) {
        formData.append('parent_report_id', parentReportId);
        if (revisionNotes.trim()) {
          formData.append('revision_notes', revisionNotes.trim());
        }
      }
      if (selectedFile) {
        formData.append('reportFile', selectedFile);
      }

      const res = await api.post('/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setFormSuccess(res.data?.message || 'Report submitted successfully!');
      setShowForm(false);
      setShowPreviewModal(false);
      await loadData();
    } catch (err) {
      console.error('Error submitting report:', err);
      if (err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      }
      setFormError(err.response?.data?.message || 'Failed to submit department report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle File Download
  const handleDownloadFile = async (reportId, filename) => {
    try {
      const res = await api.get(`/reports/${reportId}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || 'department_report');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download file:', err);
      alert('Error downloading report document. Please try again.');
    }
  };

  // Render Access Denied for unauthorized roles
  if (!isDeptManager && !isHrRecipient) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <Card title="Department Reports Access" subtitle="Authorization required">
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m12-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 text-sm max-w-md mx-auto">
              Only submitting Department Managers and designated HR Portfolio Recipients may access Department Summary Reports.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full pb-12">
      {/* Header Section */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-amber-600 tracking-wider uppercase mb-1">
            {isDeptManager ? `${currentUser?.department} DEPARTMENT MANAGER` : `HR RECIPIENT • ${currentUser?.report_portfolio} PORTFOLIO`}
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Department Summary Reports</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-gray-100 text-gray-800 py-1.5 px-3 rounded-md text-sm font-medium border border-gray-200">
            Active Cycle: {previewData?.quarter || 'Q3'} {previewData?.year || '2026'}
          </span>
          {isDeptManager && !showForm && (
            <Button
              onClick={handleOpenNewReport}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-sm px-4 py-2"
            >
              + Create Department Report
            </Button>
          )}
        </div>
      </div>

      {/* Info Notice Banner */}
      <InfoAlert title="Protected Department Reporting Policy" variant="green">
        {isDeptManager ? (
          <span>
            Department Managers manually prepare and submit high-level summary reports to their designated HR portfolio recipient.
            Raw peer and upward review responses, individual ratings, private evidence files, and manager feedback are <strong>never automatically exposed</strong>.
          </span>
        ) : (
          <span>
            You are viewing Department Summary Reports for your designated <strong>{currentUser?.report_portfolio}</strong> portfolio.
            Raw peer reviews, private evidence submissions, and employee notes remain confidential.
          </span>
        )}
      </InfoAlert>

      {/* Alert Messages */}
      {formError && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>{formError}</div>
        </div>
      )}

      {formSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div>{formSuccess}</div>
        </div>
      )}

      {/* SUBMISSION FORM (Department Manager Only) */}
      {isDeptManager && showForm && (
        <div className="mb-8 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
            <div>
              <span className="inline-block px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 mb-1">
                {isRevisionMode ? 'Submit Revision' : 'New Report Submission'}
              </span>
              <h2 className="text-xl font-bold text-gray-900">
                {isRevisionMode ? 'Submit Updated Department Report' : 'Prepare Department Summary Report'}
              </h2>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 text-sm font-medium"
            >
              Cancel
            </button>
          </div>

          {/* Resolved Metadata Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-xs text-gray-500 uppercase font-semibold block">Submitting Department</span>
              <span className="font-semibold text-gray-900">{previewData?.department || currentUser?.department}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase font-semibold block">Operational Cycle</span>
              <span className="font-semibold text-gray-900">{previewData?.quarter || 'Q3'} {previewData?.year || '2026'}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase font-semibold block">Designated HR Recipient</span>
              <span className="font-semibold text-amber-700">
                {previewData?.recipient ? `${previewData.recipient.name} (${previewData.recipient.email})` : 'Resolving...'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmitReport} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Report Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  fieldErrors.title ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="e.g. Q3 2026 IT Department Performance & Capability Summary"
              />
              {fieldErrors.title && <p className="text-xs text-red-600 mt-1">{fieldErrors.title}</p>}
            </div>

            {/* Section 1: Reviews Summary */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-gray-800">
                  1. Reviews & Performance Summary <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-500">Provide team-wide review completion & delivery overview</span>
              </div>
              <textarea
                rows={4}
                value={reviewsSummary}
                onChange={(e) => setReviewsSummary(e.target.value)}
                className={`w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  fieldErrors.reviewsSummary ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Summarize team participation, key performance outcomes, and team-level strengths. (Write 'No activity this cycle' if applicable)"
              />
              {fieldErrors.reviewsSummary && <p className="text-xs text-red-600 mt-1">{fieldErrors.reviewsSummary}</p>}
            </div>

            {/* Section 2: PIP Progress Summary */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-gray-800">
                  2. PIP Progress & Remediation Summary <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-500">State milestone statuses without exposing private evidence</span>
              </div>
              <textarea
                rows={3}
                value={pipSummary}
                onChange={(e) => setPipSummary(e.target.value)}
                className={`w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  fieldErrors.pipSummary ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Summarize progress on active Performance Improvement Plans. (Write 'No active PIPs this cycle' if applicable)"
              />
              {fieldErrors.pipSummary && <p className="text-xs text-red-600 mt-1">{fieldErrors.pipSummary}</p>}
            </div>

            {/* Section 3: PDP Progress Summary */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-gray-800">
                  3. PDP Growth & Architecture Summary <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-500">Highlight growth milestones and professional achievements</span>
              </div>
              <textarea
                rows={3}
                value={pdpSummary}
                onChange={(e) => setPdpSummary(e.target.value)}
                className={`w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  fieldErrors.pdpSummary ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Summarize key developments in Professional Development Plans. (Write 'No active PDPs this cycle' if applicable)"
              />
              {fieldErrors.pdpSummary && <p className="text-xs text-red-600 mt-1">{fieldErrors.pdpSummary}</p>}
            </div>

            {/* Revision Notes (Revision Mode Only) */}
            {isRevisionMode && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-semibold text-gray-800">
                    4. Revision Notes / Summary of Changes <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-gray-500">Explain corrections or updates made in this revision</span>
                </div>
                <textarea
                  rows={2}
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  className={`w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    fieldErrors.revisionNotes ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="e.g. Updated engineering review completion rate to 100% and added finalized PDP certifications."
                />
                {fieldErrors.revisionNotes && <p className="text-xs text-red-600 mt-1">{fieldErrors.revisionNotes}</p>}
              </div>
            )}

            {/* Document Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Attached Summary Document <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-amber-500 transition-colors">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                  className="hidden"
                  id="report-file-upload"
                />
                <label htmlFor="report-file-upload" className="cursor-pointer">
                  <div className="text-sm text-gray-600">
                    {selectedFile ? (
                      <span className="font-semibold text-amber-700">
                        📄 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    ) : (
                      <span>
                        <strong className="text-amber-600">Click to upload</strong> summary document (PDF, DOCX, XLSX, PNG, JPG &bull; Max 10MB)
                      </span>
                    )}
                  </div>
                </label>
              </div>
              {fieldErrors.file && <p className="text-xs text-red-600 mt-1">{fieldErrors.file}</p>}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (validateForm()) setShowPreviewModal(true);
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Preview Report
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 py-2"
              >
                {isSubmitting ? 'Submitting...' : isRevisionMode ? 'Submit Revision' : 'Submit Final Report'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* REPORTS LIST TABLE */}
      <Card
        title={isDeptManager ? `${currentUser?.department} Department Submissions` : `${currentUser?.report_portfolio} Portfolio Received Reports`}
        subtitle="Department summary reports and revisions"
      >
        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading department reports...</div>
        ) : reportsList.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500 text-sm">No department reports found for this cycle.</p>
            {isDeptManager && (
              <Button
                onClick={handleOpenNewReport}
                className="mt-4 bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold px-4 py-2"
              >
                + Create First Report
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-3.5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[170px]">Report Title</th>
                  <th className="px-3.5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Department</th>
                  <th className="px-3.5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-20">Period</th>
                  <th className="px-3.5 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-20">Revision</th>
                  <th className="px-3.5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[130px]">
                    {isDeptManager ? 'Recipient' : 'Submitting Manager'}
                  </th>
                  <th className="px-3.5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Submitted</th>
                  <th className="px-3.5 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[210px]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportsList.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3.5 py-3 text-sm font-semibold text-gray-900 break-words max-w-xs sm:max-w-md">
                      {report.title}
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap text-xs text-gray-700">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                        {report.department}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap text-xs text-gray-600">
                      {report.quarter} {report.year}
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap text-xs text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        report.revision_number > 1
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-green-100 text-green-800 border border-green-200'
                      }`}>
                        Rev {report.revision_number}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-xs text-gray-600 break-words max-w-[150px]">
                      {isDeptManager ? report.recipient?.name || 'Ayesha Perera' : report.author?.name || 'Department Manager'}
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap text-xs text-gray-500">
                      {new Date(report.submitted_at || report.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded border border-gray-300 transition-colors whitespace-nowrap"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleDownloadFile(report.id, report.original_filename)}
                          className="text-xs px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-medium rounded border border-amber-300 transition-colors whitespace-nowrap"
                        >
                          Download Document
                        </button>
                        {isDeptManager && (
                          <button
                            onClick={() => handleOpenRevision(report)}
                            className="text-xs px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 font-medium rounded border border-blue-300 transition-colors whitespace-nowrap"
                          >
                            + Revision
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* REPORT DETAILS MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                    {selectedReport.department} Department
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-200 text-gray-800">
                    Rev {selectedReport.revision_number}
                  </span>
                  <span className="text-xs text-gray-500">
                    {selectedReport.quarter} {selectedReport.year}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{selectedReport.title}</h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <span className="text-xs text-gray-500 block">Submitting Manager</span>
                  <span className="font-semibold text-gray-900">{selectedReport.author?.name || 'Department Manager'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Designated HR</span>
                  <span className="font-semibold text-gray-900">{selectedReport.recipient?.name || 'HR Recipient'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Submitted At</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(selectedReport.submitted_at || selectedReport.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Attached File</span>
                  <span className="font-semibold text-amber-700 truncate block">
                    {selectedReport.original_filename}
                  </span>
                </div>
              </div>

              {/* Summary Section 1 */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  1. Reviews & Performance Summary
                </h4>
                <div className="p-4 bg-white border border-gray-200 rounded-lg text-gray-800 whitespace-pre-wrap">
                  {selectedReport.reviews_summary}
                </div>
              </div>

              {/* Summary Section 2 */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  2. PIP Progress & Remediation Summary
                </h4>
                <div className="p-4 bg-white border border-gray-200 rounded-lg text-gray-800 whitespace-pre-wrap">
                  {selectedReport.pip_summary}
                </div>
              </div>

              {/* Summary Section 3 */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  3. PDP Growth & Architecture Summary
                </h4>
                <div className="p-4 bg-white border border-gray-200 rounded-lg text-gray-800 whitespace-pre-wrap">
                  {selectedReport.pdp_summary}
                </div>
              </div>

              {/* Revision Notes (if revision) */}
              {selectedReport.revision_notes && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Revision Notes (Changes in Rev {selectedReport.revision_number})
                  </h4>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-950 text-xs whitespace-pre-wrap font-medium">
                    {selectedReport.revision_notes}
                  </div>
                </div>
              )}

              {/* Revision History Link (if available) */}
              {selectedReport.revisions && selectedReport.revisions.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Revision History ({selectedReport.revisions.length} revision(s))
                  </h4>
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                    {selectedReport.revisions.map((rev) => (
                      <div key={rev.id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-gray-900">Rev {rev.revision_number}: {rev.title}</span>
                          <span className="text-gray-500 block">{new Date(rev.submitted_at).toLocaleDateString()}</span>
                        </div>
                        <button
                          onClick={() => handleDownloadFile(rev.id, rev.original_filename)}
                          className="text-amber-600 hover:text-amber-800 font-medium"
                        >
                          Download Doc
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setSelectedReport(null)}
                className="border-gray-300 text-gray-700"
              >
                Close
              </Button>
              <Button
                onClick={() => handleDownloadFile(selectedReport.id, selectedReport.original_filename)}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs px-4 py-2"
              >
                Download Attached Document ({selectedReport.original_filename})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMISSION PREVIEW MODAL (Dept Manager Preview Before Submit) */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">
              Preview Department Report Before Submission
            </h3>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
              Please review all sections carefully. Once submitted, this report will be immutably recorded and immediately notified to <strong>{previewData?.recipient?.name}</strong>.
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-gray-500 block font-semibold">Title</span>
                <p className="font-medium text-gray-900">{title}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 block font-semibold">1. Reviews Summary</span>
                <p className="p-3 bg-gray-50 rounded border text-gray-800 text-xs whitespace-pre-wrap">{reviewsSummary}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 block font-semibold">2. PIP Summary</span>
                <p className="p-3 bg-gray-50 rounded border text-gray-800 text-xs whitespace-pre-wrap">{pipSummary}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 block font-semibold">3. PDP Summary</span>
                <p className="p-3 bg-gray-50 rounded border text-gray-800 text-xs whitespace-pre-wrap">{pdpSummary}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 block font-semibold">Attached File</span>
                <p className="text-xs font-semibold text-amber-700">📄 {selectedFile?.name}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowPreviewModal(false)}
                className="border-gray-300 text-gray-700"
              >
                Back to Edit
              </Button>
              <Button
                onClick={handleSubmitReport}
                disabled={isSubmitting}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 py-2"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
