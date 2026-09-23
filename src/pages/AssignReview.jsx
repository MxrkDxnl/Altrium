import { useState, useEffect, useCallback } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import api from '../api';
import { useAuth } from '../context/useAuth';

export default function AssignReview() {
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'employee';
  const isCompanyManager = role === 'operational_manager' || role === 'company_manager';
  const isHRManager = role === 'hr_manager';
  const isDepartmentManager = role === 'department_manager';
  const isTeamManager = role === 'team_manager';

  const getRecipientLabel = (plural = false) => {
    if (isCompanyManager) return plural ? 'Department Heads' : 'Department Head';
    if (isHRManager) return plural ? 'HR Employees' : 'HR Employee';
    if (isDepartmentManager) return plural ? 'Team Managers' : 'Team Manager';
    return plural ? 'Employees' : 'Employee';
  };

  const formatUserOptionLabel = (emp) => {
    if (!emp) return '';
    if (emp.role === 'team_manager') {
      return emp.team ? `${emp.name} — ${emp.team}` : emp.name;
    }
    if (isCompanyManager && (emp.role === 'department_manager' || emp.role === 'hr_manager')) {
      return emp.department ? `${emp.name} (${emp.department})` : emp.name;
    }
    return emp.name;
  };

  const getAutoQuarter = () => {
    const month = new Date().getMonth(); // 0 to 11
    if (month >= 0 && month <= 3) return 'Q1';
    if (month >= 4 && month <= 7) return 'Q2';
    return 'Q3';
  };

  const quarter = getAutoQuarter();
  const currentYear = new Date().getFullYear();

  // Top level selection
  const [reviewType, setReviewType] = useState('self_review'); // 'self_review' | 'peer_review'
  const [peerType, setPeerType] = useState('same_level'); // 'same_level' | 'manager_to_reports' | 'reports_to_manager'

  // Self review states
  const [selfRecipients, setSelfRecipients] = useState([]);
  const [selectedSelfId, setSelectedSelfId] = useState('');

  // Peer Type 1: Same Level
  const [sameLevelSubjects, setSameLevelSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [subjectDetails, setSubjectDetails] = useState(null);
  const [reviewer1Id, setReviewer1Id] = useState('');
  const [reviewer2Id, setReviewer2Id] = useState('');

  // Peer Type 2 & 3: Downward / Upward
  const [availableTeams, setAvailableTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [groupDetails, setGroupDetails] = useState(null);

  // Common states
  const [optionalMessage, setOptionalMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Available peer types based on role
  const getPeerTypeOptions = () => {
    if (isTeamManager) {
      return [
        { value: 'same_level', label: 'Within Team Members' }
      ];
    }
    if (isHRManager) {
      return [
        { value: 'same_level', label: 'Within Employees' }
      ];
    }
    if (isDepartmentManager) {
      return [
        { value: 'same_level', label: 'Within Team Managers' },
        { value: 'manager_to_reports', label: 'Team Manager Reviews Employees' },
        { value: 'reports_to_manager', label: 'Employees Review Their Team Manager' }
      ];
    }
    if (isCompanyManager) {
      return [
        { value: 'same_level', label: 'Within Department Managers' },
        { value: 'manager_to_reports', label: 'Department Manager Reviews Direct Reports' },
        { value: 'reports_to_manager', label: 'Direct Reports Review Their Department Manager' }
      ];
    }
    return [{ value: 'same_level', label: 'Peer Review' }];
  };

  const peerTypeOptions = getPeerTypeOptions();
  const isSinglePeerType = peerTypeOptions.length === 1;
  const effectivePeerType = isSinglePeerType ? peerTypeOptions[0].value : peerType;

  // 1. Fetch Self Review Recipients
  const fetchSelfRecipients = useCallback(async () => {
    try {
      const res = await api.get(`/users/eligible?quarter_batch=${quarter}&review_type=self_review&year=${currentYear}`);
      setSelfRecipients(res.data || []);
    } catch (err) {
      console.error('Failed to fetch self review recipients', err);
    }
  }, [quarter, currentYear]);

  // 2. Fetch Same-Level Subjects
  const fetchSameLevelSubjects = useCallback(async () => {
    try {
      const res = await api.get(`/users/eligible?quarter_batch=${quarter}&review_type=peer_review&peer_type=same_level&year=${currentYear}`);
      setSameLevelSubjects(res.data || []);
    } catch (err) {
      console.error('Failed to fetch same level subjects', err);
    }
  }, [quarter, currentYear]);

  // 3. Fetch Teams list for IT/Finance Dept Mgr
  const fetchTeams = useCallback(async (currentPeerType) => {
    if (!isDepartmentManager) return;
    try {
      const res = await api.get(`/users/eligible?quarter_batch=${quarter}&review_type=peer_review&peer_type=${currentPeerType}&year=${currentYear}`);
      setAvailableTeams(res.data?.teams || []);
    } catch (err) {
      console.error('Failed to fetch teams', err);
    }
  }, [isDepartmentManager, quarter, currentYear]);

  // Initial load or tab switch
  useEffect(() => {
    let active = true;
    const loadInitialData = async () => {
      if (reviewType === 'self_review') {
        try {
          const res = await api.get(`/users/eligible?quarter_batch=${quarter}&review_type=self_review&year=${currentYear}`);
          if (active) setSelfRecipients(res.data || []);
        } catch (err) {
          console.error('Failed to fetch self review recipients', err);
        }
      } else if (reviewType === 'peer_review') {
        if (effectivePeerType === 'same_level') {
          try {
            const res = await api.get(`/users/eligible?quarter_batch=${quarter}&review_type=peer_review&peer_type=same_level&year=${currentYear}`);
            if (active) setSameLevelSubjects(res.data || []);
          } catch (err) {
            console.error('Failed to fetch same level subjects', err);
          }
        } else if (isDepartmentManager) {
          try {
            const res = await api.get(`/users/eligible?quarter_batch=${quarter}&review_type=peer_review&peer_type=${effectivePeerType}&year=${currentYear}`);
            if (active) setAvailableTeams(res.data?.teams || []);
          } catch (err) {
            console.error('Failed to fetch teams', err);
          }
        }
      }
    };
    loadInitialData();
    return () => { active = false; };
  }, [reviewType, effectivePeerType, isDepartmentManager, quarter, currentYear]);

  // When Subject is selected in Same-Level
  useEffect(() => {
    if (!selectedSubjectId || reviewType !== 'peer_review' || effectivePeerType !== 'same_level') {
      return;
    }

    let active = true;
    api.get(`/users/eligible?quarter_batch=${quarter}&review_type=peer_review&peer_type=same_level&subject_id=${selectedSubjectId}&year=${currentYear}`)
      .then(res => {
        if (active) {
          setSubjectDetails(res.data);
          // If Company Manager or HR Manager, auto-select the other 2 peers
          const peersList = res.data.peers || res.data.eligiblePeers || [];
          if ((isCompanyManager || isHRManager) && peersList.length === 2) {
            setReviewer1Id(peersList[0].id.toString());
            setReviewer2Id(peersList[1].id.toString());
          }
        }
      })
      .catch(err => {
        console.error('Failed to load subject allocation details', err);
      });
    return () => { active = false; };
  }, [selectedSubjectId, reviewType, effectivePeerType, isCompanyManager, isHRManager, quarter, currentYear]);

  // When Team or Department is selected in Peer Type 2 or 3
  useEffect(() => {
    if (reviewType !== 'peer_review' || effectivePeerType === 'same_level') {
      return;
    }

    if (isDepartmentManager && !selectedTeam) {
      return;
    }

    if (isCompanyManager && !selectedDepartment) {
      return;
    }

    let active = true;
    const queryParams = new URLSearchParams({
      quarter_batch: quarter,
      review_type: 'peer_review',
      peer_type: effectivePeerType,
      year: currentYear.toString()
    });

    if (isDepartmentManager && selectedTeam) {
      queryParams.append('team', selectedTeam);
    }
    if (isCompanyManager && selectedDepartment) {
      queryParams.append('department', selectedDepartment);
    }

    api.get(`/users/eligible?${queryParams.toString()}`)
      .then(res => {
        if (active) {
          setGroupDetails(res.data);
        }
      })
      .catch(err => {
        console.error('Failed to load group allocation details', err);
      });
    return () => { active = false; };
  }, [reviewType, effectivePeerType, selectedTeam, selectedDepartment, isDepartmentManager, isCompanyManager, quarter, currentYear]);

  // =========================================================================
  // SUBMISSION HANDLERS
  // =========================================================================

  const handleSelfReviewSubmit = async () => {
    if (!selectedSelfId) {
      setError(`Please select a ${getRecipientLabel().toLowerCase()}`);
      return;
    }

    setLoading(true);
    try {
      await api.post('/tasks/assign-self', {
        employeeIds: [selectedSelfId],
        message: optionalMessage,
        quarter,
        year: currentYear
      });
      const empName = selfRecipients.find(e => e.id.toString() === selectedSelfId)?.name || 'recipient';
      setSuccess(`Self-review assigned successfully to ${empName}.`);
      setSelectedSelfId('');
      setOptionalMessage('');
      await fetchSelfRecipients();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign self-review');
    } finally {
      setLoading(false);
    }
  };

  const handlePeerReviewSubmit = async () => {
    // 1. Peer Type 1: Same Level
    if (effectivePeerType === 'same_level') {
      if (!selectedSubjectId) {
        setError(`Please select the ${getRecipientLabel().toLowerCase()} being reviewed`);
        return;
      }

      if (isCompanyManager || isHRManager) {
        const peersList = subjectDetails?.peers || subjectDetails?.eligiblePeers || [];
        if (peersList.length < 2) {
          setError('Could not identify the required 2 peer reviewers.');
          return;
        }

        setLoading(true);
        try {
          await api.post('/tasks/assign-peer', {
            peerType: 'same_level',
            subjectId: selectedSubjectId,
            reviewer1Id: peersList[0].id,
            reviewer2Id: peersList[1].id,
            expectedReviewerIds: [peersList[0].id, peersList[1].id],
            message: optionalMessage,
            quarter,
            year: currentYear
          });
          setSuccess('Same-level peer reviews assigned successfully.');
          setSelectedSubjectId('');
          setSubjectDetails(null);
          setOptionalMessage('');
          await fetchSameLevelSubjects();
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to assign peer reviews');
          if (err.response?.data?.code === 'ROSTER_MISMATCH') {
            await fetchSameLevelSubjects();
          }
        } finally {
          setLoading(false);
        }
        return;
      }

      // TM or Dept Mgr selecting Reviewer 1 & 2
      if (!reviewer1Id) {
        setError('Please select first reviewer');
        return;
      }
      if (!reviewer2Id) {
        setError('Please select second reviewer');
        return;
      }
      if (reviewer1Id === reviewer2Id) {
        setError('Reviewer 1 and Reviewer 2 must be different people');
        return;
      }
      if (reviewer1Id === selectedSubjectId || reviewer2Id === selectedSubjectId) {
        setError('The person being reviewed cannot be selected as a reviewer');
        return;
      }

      setLoading(true);
      try {
        await api.post('/tasks/assign-peer', {
          peerType: 'same_level',
          subjectId: selectedSubjectId,
          reviewer1Id,
          reviewer2Id,
          expectedReviewerIds: [parseInt(reviewer1Id, 10), parseInt(reviewer2Id, 10)],
          message: optionalMessage,
          quarter,
          year: currentYear
        });
        setSuccess('Peer reviews assigned successfully.');
        setSelectedSubjectId('');
        setReviewer1Id('');
        setReviewer2Id('');
        setSubjectDetails(null);
        setOptionalMessage('');
        await fetchSameLevelSubjects();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to assign peer reviews');
        if (err.response?.data?.code === 'ROSTER_MISMATCH') {
          await fetchSameLevelSubjects();
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // 2. Peer Type 2: Manager Reviews Direct Reports (Grouped Downward)
    if (effectivePeerType === 'manager_to_reports') {
      if (isDepartmentManager && !selectedTeam) {
        setError('Please select a team to assign downward reviews');
        return;
      }
      if (isCompanyManager && !selectedDepartment) {
        setError('Please select a department to assign downward reviews');
        return;
      }

      const expectedSubjectIds = (groupDetails?.subjects || groupDetails?.directReports || []).map(s => s.id);

      setLoading(true);
      try {
        await api.post('/tasks/assign-peer', {
          peerType: 'manager_to_reports',
          team: isDepartmentManager ? selectedTeam : undefined,
          department: isCompanyManager ? selectedDepartment : undefined,
          expectedSubjectIds: expectedSubjectIds.length > 0 ? expectedSubjectIds : undefined,
          message: optionalMessage,
          quarter,
          year: currentYear
        });
        setSuccess('Downward review assigned successfully as a grouped task to the manager.');
        setSelectedTeam('');
        setSelectedDepartment('');
        setGroupDetails(null);
        setOptionalMessage('');
        if (isDepartmentManager) fetchTeams('manager_to_reports');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to assign downward review');
        if (err.response?.data?.code === 'ROSTER_MISMATCH') {
          // Re-fetch group details
          if (isDepartmentManager) fetchTeams('manager_to_reports');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // 3. Peer Type 3: Direct Reports Review Manager (Upward)
    if (effectivePeerType === 'reports_to_manager') {
      if (isDepartmentManager && !selectedTeam) {
        setError('Please select a team to assign upward reviews');
        return;
      }
      if (isCompanyManager && !selectedDepartment) {
        setError('Please select a department to assign upward reviews');
        return;
      }

      const expectedReviewerIds = (groupDetails?.reviewers || groupDetails?.directReports || []).map(r => r.id);

      setLoading(true);
      try {
        await api.post('/tasks/assign-peer', {
          peerType: 'reports_to_manager',
          team: isDepartmentManager ? selectedTeam : undefined,
          department: isCompanyManager ? selectedDepartment : undefined,
          expectedReviewerIds: expectedReviewerIds.length > 0 ? expectedReviewerIds : undefined,
          message: optionalMessage,
          quarter,
          year: currentYear
        });
        setSuccess('Upward reviews assigned successfully to direct reports.');
        setSelectedTeam('');
        setSelectedDepartment('');
        setGroupDetails(null);
        setOptionalMessage('');
        if (isDepartmentManager) fetchTeams('reports_to_manager');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to assign upward reviews');
        if (err.response?.data?.code === 'ROSTER_MISMATCH') {
          if (isDepartmentManager) fetchTeams('reports_to_manager');
        }
      } finally {
        setLoading(false);
      }
      return;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (reviewType === 'self_review') {
      handleSelfReviewSubmit();
    } else {
      handlePeerReviewSubmit();
    }
  };

  const handleReset = () => {
    setSelectedSelfId('');
    setSelectedSubjectId('');
    setReviewer1Id('');
    setReviewer2Id('');
    setSelectedTeam('');
    setSelectedDepartment('');
    setSubjectDetails(null);
    setGroupDetails(null);
    setOptionalMessage('');
    setError('');
    setSuccess('');
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <div>
        <p className="text-xs font-bold text-amber-600 tracking-wider uppercase mb-1">NEW ASSIGNMENT</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 leading-tight">Assign Reviews</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
          {isCompanyManager
            ? 'Assign self-reviews, same-level peer reviews, downward grouped reviews, and upward direct-report evaluations for department leadership.'
            : isHRManager
            ? 'Assign self-reviews and same-level peer reviews for HR employees.'
            : isDepartmentManager
            ? 'Assign self-reviews, same-level peer reviews, downward grouped reviews, and upward evaluations in your department.'
            : 'Assign self-reviews and peer reviews for employees in your team.'}
        </p>
      </div>

      <div className="w-full">
        <Card className="w-full">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-md text-sm border border-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md text-sm border border-green-200">
                {success}
              </div>
            )}

            {/* Row 1: Review Type & Active Cycle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Review Type</label>
                <select 
                  className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
                  value={reviewType}
                  onChange={(e) => {
                    setReviewType(e.target.value);
                    handleReset();
                  }}
                >
                  <option value="self_review">Self Review</option>
                  <option value="peer_review">Peer Review</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Active Cycle</label>
                <div className="w-full border border-gray-200 bg-gray-50 rounded-md py-2 px-3 text-sm text-gray-700 flex items-center justify-between">
                  <span className="font-semibold text-amber-900">
                    {quarter === 'Q1' ? 'Quarter 1 (Jan - Apr)' : quarter === 'Q2' ? 'Quarter 2 (May - Aug)' : 'Quarter 3 (Sep - Dec)'} {currentYear}
                  </span>
                  <span className="text-xs bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded">Asia/Colombo</span>
                </div>
              </div>
            </div>

            {/* ============================================================= */}
            {/* FORM 1: SELF REVIEW */}
            {/* ============================================================= */}
            {reviewType === 'self_review' && (
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select {getRecipientLabel()} ({selfRecipients.filter(emp => !emp.isAssigned).length} unassigned of {selfRecipients.length})
                  </label>
                  <select 
                    className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
                    value={selectedSelfId}
                    onChange={(e) => {
                      setSelectedSelfId(e.target.value);
                      setError('');
                    }}
                  >
                    <option value="">Select {getRecipientLabel().toLowerCase()}...</option>
                    {selfRecipients.map(emp => (
                      <option
                        key={emp.id}
                        value={emp.id}
                        disabled={emp.isAssigned}
                        className={emp.isAssigned ? 'text-gray-400 bg-gray-50' : ''}
                      >
                        {formatUserOptionLabel(emp)}{emp.isAssigned ? ' (Already assigned)' : ''}
                      </option>
                    ))}
                  </select>
                  {selfRecipients.length > 0 && selfRecipients.filter(emp => !emp.isAssigned).length === 0 && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2.5 mt-2">
                      All eligible {getRecipientLabel(true).toLowerCase()} already have a self-review assigned for this cycle ({quarter} {currentYear}).
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* FORM 2: PEER REVIEW */}
            {/* ============================================================= */}
            {reviewType === 'peer_review' && (
              <div className="space-y-6 pt-2 border-t border-gray-100">
                {/* Second Dropdown: Select Peer Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Peer Type</label>
                  <select 
                    className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500 bg-white font-medium text-gray-800 disabled:bg-gray-100 disabled:text-gray-700 disabled:cursor-not-allowed"
                    value={effectivePeerType}
                    disabled={isSinglePeerType}
                    onChange={(e) => {
                      setPeerType(e.target.value);
                      handleReset();
                    }}
                  >
                    {peerTypeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* ----------------------------------------------------------- */}
                {/* PEER TYPE 1: SAME LEVEL */}
                {/* ----------------------------------------------------------- */}
                {effectivePeerType === 'same_level' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        1. {getRecipientLabel()} to be reviewed
                      </label>
                      <select 
                        className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
                        value={selectedSubjectId}
                        onChange={(e) => {
                          setSelectedSubjectId(e.target.value);
                          setError('');
                        }}
                      >
                        <option value="">Select the {getRecipientLabel().toLowerCase()} being reviewed...</option>
                        {sameLevelSubjects.map(emp => {
                          const isFullyAssigned = emp.isAssigned || (emp.peerReviewCount >= 2);
                          const isPartial = emp.peerReviewCount === 1;
                          let labelSuffix = '';
                          if (isFullyAssigned) labelSuffix = ' (Already assigned)';
                          else if (isPartial) labelSuffix = ' (1 of 2 reviewers assigned)';

                          return (
                            <option
                              key={emp.id}
                              value={emp.id}
                              disabled={isFullyAssigned}
                              className={isFullyAssigned ? 'text-gray-400 bg-gray-50' : ''}
                            >
                              {formatUserOptionLabel(emp)}{labelSuffix}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Reviewers Selection for Same Level */}
                    {selectedSubjectId && (
                      isCompanyManager || isHRManager ? (
                        /* Automatic 2 Peers Resolution for Company Manager & HR Manager */
                        <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-lg space-y-2">
                          <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                            Automatic Peer Reviewers (2 Distinct Peers)
                          </p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {(subjectDetails?.peers || subjectDetails?.eligiblePeers || []).map(peer => (
                              <span key={peer.id} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                                {peer.name} {peer.department ? `(${peer.department})` : ''}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500">
                            Selecting this subject automatically assigns the other two peers as reviewers.
                          </p>
                        </div>
                      ) : (
                        /* Manual 2 Reviewers Selection for Team Manager & Dept Manager */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              2. Reviewer 1 <span className="text-red-500">*</span>
                            </label>
                            <select 
                              className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
                              value={reviewer1Id}
                              onChange={(e) => {
                                const newR1 = e.target.value;
                                setReviewer1Id(newR1);
                                setError('');
                                if (reviewer2Id === newR1) setReviewer2Id('');
                              }}
                            >
                              <option value="">Select first reviewer...</option>
                              {(subjectDetails?.eligiblePeers || sameLevelSubjects.filter(e => e.id.toString() !== selectedSubjectId)).map(emp => (
                                <option key={emp.id} value={emp.id}>{formatUserOptionLabel(emp)}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              3. Reviewer 2 <span className="text-red-500">*</span>
                            </label>
                            <select 
                              className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                              value={reviewer2Id}
                              disabled={!reviewer1Id}
                              onChange={(e) => {
                                setReviewer2Id(e.target.value);
                                setError('');
                              }}
                            >
                              <option value="">Select second reviewer...</option>
                              {(subjectDetails?.eligiblePeers || sameLevelSubjects.filter(e => e.id.toString() !== selectedSubjectId))
                                .filter(emp => emp.id.toString() !== reviewer1Id)
                                .map(emp => (
                                  <option key={emp.id} value={emp.id}>{formatUserOptionLabel(emp)}</option>
                                ))}
                            </select>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* ----------------------------------------------------------- */}
                {/* PEER TYPE 2: MANAGER REVIEWS DIRECT REPORTS (Grouped Downward) */}
                {/* ----------------------------------------------------------- */}
                {effectivePeerType === 'manager_to_reports' && (
                  <div className="space-y-4">
                    {isDepartmentManager && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Team</label>
                        <select 
                          className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
                          value={selectedTeam}
                          onChange={(e) => {
                            setSelectedTeam(e.target.value);
                            setError('');
                          }}
                        >
                          <option value="">Select a team in your department...</option>
                          {availableTeams.map(item => (
                            <option key={item.team} value={item.team}>
                              {item.team} (TM: {item.teamManager?.name})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {isCompanyManager && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Department</label>
                        <select 
                          className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
                          value={selectedDepartment}
                          onChange={(e) => {
                            setSelectedDepartment(e.target.value);
                            setError('');
                          }}
                        >
                          <option value="">Select department...</option>
                          <option value="IT">IT Department (Dinesh Jayawardena)</option>
                          <option value="Finance">Finance Department (Chamari Perera)</option>
                          <option value="HR">Human Resources (Amaya Senanayake)</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* ----------------------------------------------------------- */}
                {/* PEER TYPE 3: DIRECT REPORTS REVIEW MANAGER (Upward) */}
                {/* ----------------------------------------------------------- */}
                {effectivePeerType === 'reports_to_manager' && (
                  <div className="space-y-4">
                    {isDepartmentManager && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Team</label>
                        <select 
                          className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
                          value={selectedTeam}
                          onChange={(e) => {
                            setSelectedTeam(e.target.value);
                            setError('');
                          }}
                        >
                          <option value="">Select a team in your department...</option>
                          {availableTeams.map(item => (
                            <option key={item.team} value={item.team}>
                              {item.team} (TM: {item.teamManager?.name})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {isCompanyManager && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Department</label>
                        <select 
                          className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
                          value={selectedDepartment}
                          onChange={(e) => {
                            setSelectedDepartment(e.target.value);
                            setError('');
                          }}
                        >
                          <option value="">Select department...</option>
                          <option value="IT">IT Department (Dinesh Jayawardena)</option>
                          <option value="Finance">Finance Department (Chamari Perera)</option>
                          <option value="HR">Human Resources (Amaya Senanayake)</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Optional Message Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Optional Message {reviewType === 'peer_review' ? '(for the appointed reviewer(s))' : '(for the appointed employee)'}
              </label>
              <textarea 
                rows={2} 
                className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500" 
                placeholder="Type an optional message..."
                value={optionalMessage}
                onChange={(e) => setOptionalMessage(e.target.value)}
              />
            </div>

            {/* ============================================================= */}
            {/* INTERACTIVE ASSIGNMENT PREVIEW CARD */}
            {/* ============================================================= */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Assignment Preview</span>
                <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  {quarter} {currentYear}
                </span>
              </div>

              {reviewType === 'self_review' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs">Review Direction</span>
                    <span className="font-medium text-gray-900">Self Review</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Recipient</span>
                    <span className="font-medium text-gray-900">
                      {selectedSelfId
                        ? selfRecipients.find(e => e.id.toString() === selectedSelfId)?.name || 'Selected recipient'
                        : 'None selected'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Existing Status</span>
                    <span className="font-medium">
                      {selectedSelfId && selfRecipients.find(e => e.id.toString() === selectedSelfId)?.isAssigned ? (
                        <span className="text-red-600">Already Assigned</span>
                      ) : (
                        <span className="text-green-600">Eligible</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">New Tasks to Create</span>
                    <span className="font-semibold text-amber-700">{selectedSelfId ? '1 task' : '0 tasks'}</span>
                  </div>
                </div>
              ) : effectivePeerType === 'same_level' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs">Review Direction</span>
                    <span className="font-medium text-gray-900">Same-Level Peer Review (2 Reviewers → 1 Subject)</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Person Being Reviewed (Subject)</span>
                    <span className="font-medium text-gray-900">
                      {selectedSubjectId
                        ? sameLevelSubjects.find(e => e.id.toString() === selectedSubjectId)?.name || 'Selected subject'
                        : 'None selected'}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-500 block text-xs">Appointed Reviewers</span>
                    <span className="font-medium text-gray-900">
                      {isCompanyManager || isHRManager ? (
                        (subjectDetails?.peers || subjectDetails?.eligiblePeers || []).length === 2
                          ? (subjectDetails.peers || subjectDetails.eligiblePeers).map(p => p.name).join(', ')
                          : 'Will resolve 2 peers'
                      ) : (
                        [
                          sameLevelSubjects.find(e => e.id.toString() === reviewer1Id)?.name,
                          sameLevelSubjects.find(e => e.id.toString() === reviewer2Id)?.name
                        ].filter(Boolean).join(', ') || 'None selected'
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Existing Status</span>
                    <span className="font-medium">
                      {subjectDetails?.isAssigned ? (
                        <span className="text-red-600">Already fully assigned</span>
                      ) : (
                        <span className="text-green-600">Eligible</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">New Tasks to Create</span>
                    <span className="font-semibold text-amber-700">
                      {selectedSubjectId && ((isCompanyManager || isHRManager) || (reviewer1Id && reviewer2Id)) ? '2 tasks' : '0 tasks'}
                    </span>
                  </div>
                </div>
              ) : effectivePeerType === 'manager_to_reports' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs">Review Direction</span>
                    <span className="font-medium text-gray-900">Manager Reviews Direct Reports (1 Grouped Task)</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Assigned Manager (Reviewer)</span>
                    <span className="font-medium text-gray-900">{groupDetails?.reviewer?.name || 'Select team/department'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-500 block text-xs">Direct Reports Being Reviewed ({groupDetails?.subjects?.length || 0} employees)</span>
                    <span className="font-medium text-gray-700 text-xs">
                      {groupDetails?.subjects?.map(s => s.name).join(', ') || 'None resolved'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Existing Status</span>
                    <span className="font-medium">
                      {groupDetails?.isAssigned ? (
                        <span className="text-red-600">Already Assigned ({groupDetails.existingTaskStatus || 'Active'})</span>
                      ) : (
                        <span className="text-green-600">Eligible</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">New Tasks to Create</span>
                    <span className="font-semibold text-amber-700">{groupDetails && !groupDetails.isAssigned ? '1 grouped task' : '0 tasks'}</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 block text-xs">Review Direction</span>
                    <span className="font-medium text-gray-900">Direct Reports Review Manager (Many-to-One Upward)</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Person Being Reviewed (Manager)</span>
                    <span className="font-medium text-gray-900">{groupDetails?.subject?.name || 'Select team/department'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-500 block text-xs">
                      Reviewers ({groupDetails?.reviewers?.filter(r => !r.isAssigned).length || 0} unassigned of {groupDetails?.totalCount || 0})
                    </span>
                    <span className="font-medium text-gray-700 text-xs">
                      {groupDetails?.reviewers?.map(r => `${r.name}${r.isAssigned ? ' (assigned)' : ''}`).join(', ') || 'None resolved'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">Existing Status</span>
                    <span className="font-medium">
                      {groupDetails?.isFullyAssigned ? (
                        <span className="text-red-600">All direct reports assigned</span>
                      ) : groupDetails?.assignedCount > 0 ? (
                        <span className="text-amber-600">Partially assigned ({groupDetails.assignedCount} of {groupDetails.totalCount})</span>
                      ) : (
                        <span className="text-green-600">Eligible</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-xs">New Tasks to Create</span>
                    <span className="font-semibold text-amber-700">
                      {groupDetails ? `${groupDetails.reviewers?.filter(r => !r.isAssigned).length || 0} tasks` : '0 tasks'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
              <Button 
                variant="outline" 
                type="button" 
                className="px-5 shadow-sm border-gray-200" 
                onClick={handleReset}
              >
                Reset
              </Button>
              <Button 
                variant="primary" 
                type="submit" 
                className="px-6 py-2.5" 
                disabled={loading}
              >
                {loading ? 'Assigning...' : reviewType === 'self_review' ? 'Assign Self Review' : 'Assign Review'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
