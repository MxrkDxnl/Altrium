import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import api from '../api';
import { useAuth } from '../context/useAuth';

export default function AssignPlan() {
  const { currentUser } = useAuth();
  const isCompanyManager = currentUser?.role === 'company_manager';
  const isDepartmentManager = currentUser?.role === 'department_manager';

  const [planType, setPlanType] = useState('');
  const [planRecipientId, setPlanRecipientId] = useState('');
  const [planTitle, setPlanTitle] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [eligibleRecipients, setEligibleRecipients] = useState([]);
  const [activeCycleInfo, setActiveCycleInfo] = useState({ quarter: 'Q3', year: 2026 });
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [planError, setPlanError] = useState('');
  const [planSuccess, setPlanSuccess] = useState('');
  const [planSubmitting, setPlanSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const refreshRecipients = () => {
    return api.get('/plans/eligible-recipients')
      .then(res => {
        setEligibleRecipients(res.data.recipients || []);
        if (res.data.activeQuarter && res.data.activeYear) {
          setActiveCycleInfo({ quarter: res.data.activeQuarter, year: res.data.activeYear });
        }
      })
      .catch(err => {
        console.error('Failed to fetch eligible plan recipients:', err);
        setPlanError(err.response?.data?.message || (isCompanyManager ? 'Failed to load eligible Department Heads' : isDepartmentManager ? 'Failed to load eligible Team Managers' : 'Failed to load eligible direct reports'));
      });
  };

  useEffect(() => {
    let active = true;

    api.get('/plans/eligible-recipients')
      .then(res => {
        if (active) {
          setEligibleRecipients(res.data.recipients || []);
          if (res.data.activeQuarter && res.data.activeYear) {
            setActiveCycleInfo({ quarter: res.data.activeQuarter, year: res.data.activeYear });
          }
        }
      })
      .catch(err => {
        if (active) {
          console.error('Failed to load eligible recipients:', err);
          setPlanError(err.response?.data?.message || (isCompanyManager ? 'Failed to load eligible Department Heads' : isDepartmentManager ? 'Failed to load eligible Team Managers' : 'Failed to load eligible direct reports'));
        }
      })
      .finally(() => {
        if (active) {
          setLoadingRecipients(false);
        }
      });

    return () => { active = false; };
  }, [isDepartmentManager, isCompanyManager]);

  const validateFrontendPlanInputs = (title, description) => {
    const errs = {};
    const PURE_PLACEHOLDER_REGEX = /^(asdf|qwerty|abc|xyz|123|1234|aaa|bbb|ccc|zzz|dummy|placeholder|lorem|ipsum|filler|foo|bar|baz|test|testing|sample|temp|note|feedback)$/i;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      errs.title = 'Plan title is required and cannot be empty.';
    } else {
      const cleanTitle = title.trim();
      if (cleanTitle.length < 10) {
        errs.title = 'Plan title must be at least 10 characters long.';
      } else if (cleanTitle.length > 255) {
        errs.title = 'Plan title cannot exceed 255 characters.';
      } else {
        const words = cleanTitle.split(/\s+/).filter(w => w.length > 0);
        if (words.length < 2) {
          errs.title = 'Plan title must contain at least 2 words.';
        } else if (/^[\s.,_\-!@#$%^&*()+=/\\|<>?~`"':;{}[\]]+$/.test(cleanTitle)) {
          errs.title = 'Plan title cannot consist solely of punctuation or symbols.';
        } else if (/^(.)\1{4,}$/i.test(cleanTitle) || words.some(w => /^(.)\1{4,}$/i.test(w))) {
          errs.title = 'Plan title cannot consist of repeated filler characters.';
        } else if (words.every(w => {
          const stripped = w.replace(/[^\w]/g, '');
          return stripped.length === 0 || PURE_PLACEHOLDER_REGEX.test(stripped);
        })) {
          errs.title = 'Please provide a meaningful, descriptive plan title.';
        }
      }
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      errs.description = 'Plan instructions / expected outcomes are required and cannot be empty.';
    } else {
      const cleanDesc = description.trim();
      if (cleanDesc.length < 30) {
        errs.description = 'Plan instructions must be at least 30 characters long to provide clear guidance.';
      } else if (cleanDesc.length > 5000) {
        errs.description = 'Plan instructions cannot exceed 5000 characters.';
      } else {
        const words = cleanDesc.split(/\s+/).filter(w => w.length > 0);
        if (words.length < 4) {
          errs.description = 'Plan instructions must contain at least 4 words describing the scope.';
        } else if (/^[\s.,_\-!@#$%^&*()+=/\\|<>?~`"':;{}[\]]+$/.test(cleanDesc)) {
          errs.description = 'Plan instructions cannot consist solely of punctuation or symbols.';
        } else if (/^(.)\1{4,}$/i.test(cleanDesc) || words.some(w => /^(.)\1{4,}$/i.test(w))) {
          errs.description = 'Plan instructions cannot consist of repeated filler characters.';
        } else if (words.every(w => {
          const stripped = w.replace(/[^\w]/g, '');
          return stripped.length === 0 || PURE_PLACEHOLDER_REGEX.test(stripped);
        })) {
          errs.description = 'Please provide meaningful, descriptive instructions for the recipient.';
        }
      }
    }

    return errs;
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    setPlanError('');
    setPlanSuccess('');
    setFieldErrors({});

    const clientErrors = validateFrontendPlanInputs(planTitle, planDescription);
    if (!planRecipientId) {
      clientErrors.recipient = isCompanyManager ? 'Please select a Department Head.' : isDepartmentManager ? 'Please select a Team Manager.' : 'Please select an eligible direct report.';
    }
    if (!planType) {
      clientErrors.type = 'Please select a plan type (PIP or PDP).';
    }

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setPlanError('Please resolve the highlighted fields before submitting.');
      return;
    }

    setPlanSubmitting(true);
    try {
      const payload = {
        recipient_id: parseInt(planRecipientId, 10),
        type: planType,
        title: planTitle.trim(),
        description: planDescription.trim()
      };

      const res = await api.post('/plans', payload);
      const recipientObj = eligibleRecipients.find(r => r.id === parseInt(planRecipientId, 10));
      const recipientName = recipientObj ? recipientObj.name : 'the recipient';
      const deadlineNote = res.data.plan?.due_date ? ` (Evidence deadline: ${res.data.plan.due_date})` : '';

      setPlanSuccess(`${planType} plan "${res.data.plan.title}" has been successfully assigned to ${recipientName}${deadlineNote}. Notification and task created.`);
      
      // Clear form inputs
      setPlanTitle('');
      setPlanDescription('');
      setPlanRecipientId('');

      // Refresh recipient eligibility
      await refreshRecipients();
    } catch (err) {
      if (err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      }
      setPlanError(err.response?.data?.message || 'Failed to assign plan. Please review the details and try again.');
    } finally {
      setPlanSubmitting(false);
    }
  };

  const unassignedCount = planType
    ? eligibleRecipients.filter(r => (planType === 'PIP' ? !r.hasPip : !r.hasPdp)).length
    : eligibleRecipients.length;

  const isFormReady = !!planType && !!planRecipientId;

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-amber-600 tracking-wider uppercase mb-1">MANAGEMENT ACTION</p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 leading-tight">Assign PIP / PDP</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Create performance improvement plans (PIP) and professional development plans (PDP) for direct reports.
          </p>
        </div>

        <Link
          to="/assigned-plans"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors shadow-2xs self-start sm:self-auto"
        >
          <span>Manage Assigned Plans</span>
          <span>&rarr;</span>
        </Link>
      </div>

      <Card className="w-full">
        <form className="space-y-6" onSubmit={handlePlanSubmit}>
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Create & Assign a Plan</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Select PIP or PDP, pick an eligible direct report, and specify objectives and expected deliverables.
              </p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              Active Cycle: {activeCycleInfo.quarter} {activeCycleInfo.year}
            </span>
          </div>

          {planError && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-md text-sm">
              <span className="font-semibold block">Submission Error</span>
              {planError}
            </div>
          )}

          {planSuccess && (
            <div className="bg-green-50 border border-green-300 text-green-950 px-4 py-3.5 rounded-lg text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center space-x-2.5">
                <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <span className="font-bold block text-green-950">Plan Assigned Successfully!</span>
                  <span className="text-xs text-green-800">{planSuccess}</span>
                </div>
              </div>
              <Link
                to="/assigned-plans"
                className="inline-flex items-center justify-center px-4 py-1.5 text-xs font-semibold rounded-md bg-green-800 text-white hover:bg-green-900 transition-colors shadow-2xs whitespace-nowrap"
              >
                View in Assigned Plans &rarr;
              </Link>
            </div>
          )}

          {/* Step 1: Plan Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              id="plan-type-pip"
              role="button"
              tabIndex={0}
              onClick={() => {
                setPlanType('PIP');
                setPlanRecipientId('');
                if (fieldErrors.type) setFieldErrors(prev => ({ ...prev, type: '' }));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPlanType('PIP');
                  setPlanRecipientId('');
                  if (fieldErrors.type) setFieldErrors(prev => ({ ...prev, type: '' }));
                }
              }}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                planType === 'PIP'
                  ? 'border-amber-500 bg-amber-50/40 shadow-xs ring-2 ring-amber-500/20'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  planType === 'PIP' ? 'border-amber-600 bg-amber-600' : 'border-gray-300'
                }`}>
                  {planType === 'PIP' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <span className="text-sm font-bold text-gray-900 block">Performance Improvement Plan (PIP)</span>
                  <span className="text-xs text-gray-500">Structured improvement scope with milestone deliverables</span>
                </div>
              </div>
            </div>

            <div
              id="plan-type-pdp"
              role="button"
              tabIndex={0}
              onClick={() => {
                setPlanType('PDP');
                setPlanRecipientId('');
                if (fieldErrors.type) setFieldErrors(prev => ({ ...prev, type: '' }));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPlanType('PDP');
                  setPlanRecipientId('');
                  if (fieldErrors.type) setFieldErrors(prev => ({ ...prev, type: '' }));
                }
              }}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                planType === 'PDP'
                  ? 'border-emerald-500 bg-emerald-50/40 shadow-xs ring-2 ring-emerald-500/20'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  planType === 'PDP' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                }`}>
                  {planType === 'PDP' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <span className="text-sm font-bold text-gray-900 block">Personal Development Plan (PDP)</span>
                  <span className="text-xs text-gray-500">Continuous professional growth and skill building</span>
                </div>
              </div>
            </div>
          </div>
          {fieldErrors.type && (
            <p className="text-xs text-red-600 font-medium -mt-2">{fieldErrors.type}</p>
          )}

          {/* Step 2: Recipient Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              {isCompanyManager
                ? 'Select Department Head (Recipient)'
                : isDepartmentManager
                ? 'Select Team Manager (Recipient)'
                : 'Select Direct Report (Recipient)'}
            </label>

            {loadingRecipients ? (
              <p className="text-xs text-gray-500">
                {isCompanyManager ? 'Loading Department Heads...' : isDepartmentManager ? 'Loading Team Managers...' : 'Loading direct reports...'}
              </p>
            ) : eligibleRecipients.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                {isCompanyManager
                  ? 'No direct Department Heads found.'
                  : isDepartmentManager
                  ? 'No direct Team Managers found in your department.'
                  : 'No eligible direct reports found for the active cycle.'}
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  disabled={!planType}
                  className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={planRecipientId}
                  onChange={(e) => {
                    setPlanRecipientId(e.target.value);
                    if (fieldErrors.recipient) setFieldErrors(prev => ({ ...prev, recipient: '' }));
                  }}
                >
                  <option value="">
                    {!planType
                      ? '← Select PIP or PDP above first'
                      : isCompanyManager
                      ? '-- Select Department Head --'
                      : isDepartmentManager
                      ? '-- Select Team Manager --'
                      : '-- Select Direct Report --'}
                  </option>
                  {eligibleRecipients.map((rec) => {
                    const isAssigned = planType === 'PIP' ? rec.hasPip : rec.hasPdp;
                    return (
                      <option
                        key={rec.id}
                        value={rec.id}
                        disabled={isAssigned}
                      >
                        {rec.name} ({isCompanyManager ? (rec.department ? `${rec.department} Dept` : 'Management') : rec.team || rec.role?.replace('_', ' ')})
                        {isAssigned ? ` — [Already assigned a ${planType} for ${activeCycleInfo.quarter} ${activeCycleInfo.year}]` : ''}
                      </option>
                    );
                  })}
                </select>

                {planType && (
                  <p className="text-xs text-gray-500">
                    {unassignedCount > 0
                      ? `${unassignedCount} of ${eligibleRecipients.length} eligible recipients available for ${planType} assignment.`
                      : isCompanyManager
                      ? `All direct Department Heads have already been assigned a ${planType} for ${activeCycleInfo.quarter} ${activeCycleInfo.year}.`
                      : isDepartmentManager
                      ? `All direct Team Managers have already been assigned a ${planType} for ${activeCycleInfo.quarter} ${activeCycleInfo.year}.`
                      : `All eligible direct reports have already been assigned a ${planType} for ${activeCycleInfo.quarter} ${activeCycleInfo.year}.`}
                  </p>
                )}
              </div>
            )}
            {fieldErrors.recipient && (
              <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.recipient}</p>
            )}
          </div>

          {/* Step 3: Plan Content & Details */}
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Plan Title
                </label>
                <span className="text-[11px] text-gray-400">
                  {planTitle.length}/255
                </span>
              </div>
              <input
                type="text"
                disabled={!isFormReady}
                className={`w-full border rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  fieldErrors.title ? 'border-red-400 bg-red-50/20' : 'border-gray-300'
                }`}
                placeholder={isFormReady ? "e.g., Executive Engineering Governance & Architecture Resiliency Roadmap" : "Select plan type and recipient above to enable"}
                value={planTitle}
                onChange={(e) => {
                  setPlanTitle(e.target.value);
                  if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: '' }));
                }}
              />
              {fieldErrors.title && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.title}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Instructions & Expected Deliverables
                </label>
                <span className="text-[11px] text-gray-400">
                  {planDescription.length}/5000
                </span>
              </div>
              <textarea
                rows={5}
                disabled={!isFormReady}
                className={`w-full border rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  fieldErrors.description ? 'border-red-400 bg-red-50/20' : 'border-gray-300'
                }`}
                placeholder={isFormReady ? "Clearly outline the targets, milestones, and deliverables the recipient must complete..." : "Select plan type and recipient above to enable"}
                value={planDescription}
                onChange={(e) => {
                  setPlanDescription(e.target.value);
                  if (fieldErrors.description) setFieldErrors(prev => ({ ...prev, description: '' }));
                }}
              />
              {fieldErrors.description && (
                <p className="text-xs text-red-600 mt-1 font-medium">{fieldErrors.description}</p>
              )}
            </div>

            {planType === 'PIP' && (
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-3.5 space-y-1">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <label className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Evidence Submission Deadline
                  </label>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Automatic deadline: Evidence is allowed throughout August 30, 2027 in Asia/Colombo; rejection begins August 31, 2027 at 00:00:00. The authoritative deadline is computed server-side and recorded upon assignment.
                </p>
              </div>
            )}
          </div>

          {/* Submission Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              type="button"
              className="px-5 shadow-sm border-gray-200"
              onClick={() => {
                setPlanTitle('');
                setPlanDescription('');
                setPlanRecipientId('');
                setPlanError('');
                setPlanSuccess('');
                setFieldErrors({});
              }}
            >
              Clear Form
            </Button>
            <Button
              variant="primary"
              type="submit"
              className="px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!isFormReady || planSubmitting}
            >
              {planSubmitting ? 'Assigning Plan...' : `Assign ${planType || 'Plan'}`}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
