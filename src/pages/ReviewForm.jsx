import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import InfoAlert from '../components/ui/InfoAlert';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../api';

export default function ReviewForm({ task: propTask, onClose, onSuccess }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const initialTask = propTask || location.state?.task;
  const taskId = propTask ? propTask.id : id;

  const [task, setTask] = useState(initialTask || null);
  const [loadingTask, setLoadingTask] = useState(!initialTask);

  // For single-subject review
  const [techSkills, setTechSkills] = useState('');
  const [commRating, setCommRating] = useState('Select a rating');
  const [commNotes, setCommNotes] = useState('');
  const [growthAreas, setGrowthAreas] = useState('');

  // For grouped downward review
  // Structure: { [subjectId]: { techSkills: '', commRating: 'Select a rating', commNotes: '', growthAreas: '' } }
  const [groupedForms, setGroupedForms] = useState({});
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);

  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draftSavedMessage, setDraftSavedMessage] = useState('');
  const [error, setError] = useState('');
  const [submissionKey] = useState(() => `rev_sub_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`);

  // Fetch full task data (including subjects and draft_content)
  useEffect(() => {
    if (!taskId) return;
    let active = true;

    const fetchData = async () => {
      try {
        const res = await api.get(`/tasks/${taskId}`);
        if (!active) return;
        const fetchedTask = res.data.task;
        setTask(fetchedTask);

        const isGroup = fetchedTask.type === 'downward_review' || 
          (fetchedTask.group_subject_ids && fetchedTask.group_subject_ids.length > 0) ||
          (fetchedTask.subjects && fetchedTask.subjects.length > 0);

        if (isGroup) {
          const subjects = fetchedTask.subjects || fetchedTask.groupSubjects || [];
          const initialGroup = {};
          const savedDraft = fetchedTask.draft_content || {};

          subjects.forEach(sub => {
            const subDraft = savedDraft[sub.id] || savedDraft[sub.id.toString()] || {};
            initialGroup[sub.id] = {
              techSkills: subDraft.techSkills || '',
              productivity: subDraft.productivity || 'Select a rating',
              commRating: subDraft.commRating || 'Select a rating',
              commNotes: subDraft.commNotes || '',
              growthAreas: subDraft.growthAreas || ''
            };
          });
          setGroupedForms(initialGroup);
        } else {
          const singleDraft = fetchedTask.draft_content || {};
          if (singleDraft.techSkills) setTechSkills(singleDraft.techSkills);
          if (singleDraft.commRating) setCommRating(singleDraft.commRating);
          if (singleDraft.commNotes) setCommNotes(singleDraft.commNotes);
          if (singleDraft.growthAreas) setGrowthAreas(singleDraft.growthAreas);
        }
      } catch (err) {
        if (active) {
          console.error('Failed to load task details', err);
          setError('Failed to load task details');
        }
      } finally {
        if (active) {
          setLoadingTask(false);
        }
      }
    };

    fetchData();
    return () => { active = false; };
  }, [taskId]);

  const isGrouped = task && (
    task.type === 'downward_review' || 
    (task.group_subject_ids && task.group_subject_ids.length > 0) ||
    (task.subjects && task.subjects.length > 0) ||
    (task.groupSubjects && task.groupSubjects.length > 0)
  );

  const subjectsList = task?.subjects || task?.groupSubjects || [];

  // Helper to test if a subject form is valid/complete
  const isSubjectComplete = (subId) => {
    const formData = groupedForms[subId];
    if (!formData) return false;
    return !!(
      formData.techSkills && 
      formData.techSkills.trim().length > 0 && 
      formData.commRating && 
      formData.commRating !== 'Select a rating'
    );
  };

  // Helper to test if a subject form has partial draft data
  const isSubjectStarted = (subId) => {
    const formData = groupedForms[subId];
    if (!formData) return false;
    return !!(
      (formData.techSkills && formData.techSkills.trim().length > 0) ||
      (formData.commRating && formData.commRating !== 'Select a rating') ||
      (formData.commNotes && formData.commNotes.trim().length > 0) ||
      (formData.growthAreas && formData.growthAreas.trim().length > 0)
    );
  };

  const completedCount = subjectsList.filter(s => isSubjectComplete(s.id)).length;
  const totalSubjects = subjectsList.length;

  // Handle input change for active grouped subject
  const handleGroupInputChange = (subjectId, field, value) => {
    setGroupedForms(prev => ({
      ...prev,
      [subjectId]: {
        ...(prev[subjectId] || {
          techSkills: '',
          commRating: 'Select a rating',
          commNotes: '',
          growthAreas: ''
        }),
        [field]: value
      }
    }));
    setDraftSavedMessage('');
    setError('');
  };

  // =========================================================================
  // SAVE DRAFT
  // =========================================================================
  const handleSaveDraft = async () => {
    setError('');
    setDraftSavedMessage('');
    setSavingDraft(true);

    try {
      let draftPayload;
      if (isGrouped) {
        draftPayload = groupedForms;
      } else {
        draftPayload = {
          techSkills,
          commRating,
          commNotes,
          growthAreas
        };
      }

      await api.post('/reviews/draft', {
        taskId,
        draftContent: draftPayload
      });

      setDraftSavedMessage(`Draft saved securely at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  // =========================================================================
  // FINAL SUBMIT
  // =========================================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDraftSavedMessage('');

    if (isGrouped) {
      // Validate every single subject in the group
      const incompleteSubjects = subjectsList.filter(s => !isSubjectComplete(s.id));
      if (incompleteSubjects.length > 0) {
        setError(`Please complete all required fields (Technical Skills & Communication Rating) for all direct reports before final submission. Incomplete: ${incompleteSubjects.map(s => s.name).join(', ')}`);
        // Switch to the first incomplete subject
        const firstIncompleteIndex = subjectsList.findIndex(s => !isSubjectComplete(s.id));
        if (firstIncompleteIndex >= 0) {
          setActiveSubjectIndex(firstIncompleteIndex);
        }
        return;
      }

      setSubmitting(true);
      try {
        await api.post('/reviews/submit', {
          taskId,
          groupContent: groupedForms,
          submissionKey
        });
        alert('All reviews in the group have been submitted successfully.');
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/my-tasks');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to submit grouped reviews');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Single-Subject Review Submission
    if (!techSkills || !techSkills.trim() || !commRating || commRating === 'Select a rating') {
      setError('Please fill all required fields (Technical Skills and Communication Rating).');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/reviews/submit', {
        taskId,
        content: {
          techSkills,
          commRating,
          commNotes,
          growthAreas
        },
        submissionKey
      });
      alert('Review submitted successfully.');
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/my-tasks');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  if (loadingTask) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-gray-500">
        <p>Loading review form...</p>
      </div>
    );
  }

  const activeSubject = isGrouped ? subjectsList[activeSubjectIndex] : null;
  const activeSubjectData = activeSubject ? (groupedForms[activeSubject.id] || {
    techSkills: '',
    commRating: 'Select a rating',
    commNotes: '',
    growthAreas: ''
  }) : null;

  const techSkillsId = isGrouped && activeSubject ? `techSkills_${activeSubject.id}` : 'techSkills';
  const commRatingId = isGrouped && activeSubject ? `commRating_${activeSubject.id}` : 'commRating';
  const commNotesId = isGrouped && activeSubject ? `commNotes_${activeSubject.id}` : 'commNotes';
  const growthAreasId = isGrouped && activeSubject ? `growthAreas_${activeSubject.id}` : 'growthAreas';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button 
          type="button"
          onClick={handleClose} 
          className="text-amber-800 font-bold text-sm hover:underline flex items-center mb-3 cursor-pointer"
        >
          ← Back to Tasks
        </button>

        {task && (
          <p className="text-xs font-bold text-amber-800 tracking-wider uppercase mb-1">
            {task.quarter} • {task.year} • {
              task.type === 'self_review'
                ? 'Self Review'
                : task.type === 'downward_review' || isGrouped
                ? 'Downward Group Review'
                : task.type === 'upward_review' || task.feedback_type === 'upward'
                ? 'Upward Feedback'
                : 'Peer Review'
            }
            {!isGrouped && task.reviewee?.name && ` for ${task.reviewee.name}`}
          </p>
        )}

        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 leading-tight">
          {isGrouped ? 'Direct Reports Review Form (Grouped)' : 'Complete Review Form'}
        </h1>
        {isGrouped && (
          <p className="text-sm text-gray-600 mt-1">
            Evaluate your direct reports individually within this unified review task. Drafts save securely across refreshes and logout.
          </p>
        )}
      </div>

      <InfoAlert title="Confidentiality & Privacy Note" variant="yellow">
        {isGrouped 
          ? 'Responses are stored per direct report upon submission. Drafts are private to you until final submission.'
          : 'Please provide honest and constructive feedback. Your input will only be visible to the authorized manager.'}
      </InfoAlert>

      {/* Progress Card for Grouped Reviews */}
      {isGrouped && totalSubjects > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Review Progress</span>
            <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
              {completedCount} of {totalSubjects} sections completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-amber-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / totalSubjects) * 100}%` }}
            ></div>
          </div>

          {/* Subject Navigation Tabs / Pills */}
          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
            {subjectsList.map((sub, idx) => {
              const complete = isSubjectComplete(sub.id);
              const started = isSubjectStarted(sub.id);
              const isActive = idx === activeSubjectIndex;

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    setActiveSubjectIndex(idx);
                    setError('');
                  }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    isActive
                      ? 'bg-amber-500 text-black shadow-xs ring-2 ring-amber-400'
                      : complete
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                      : started
                      ? 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {complete ? (
                    <span className="text-emerald-600">✓</span>
                  ) : started ? (
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                  )}
                  <span>{sub.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Card>
        <form className="space-y-8" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-md text-sm border border-red-200">
              {error}
            </div>
          )}

          {draftSavedMessage && (
            <div className="bg-blue-50 text-blue-700 px-4 py-2.5 rounded-md text-sm border border-blue-200 flex items-center justify-between">
              <span>{draftSavedMessage}</span>
              <span className="text-xs font-medium text-blue-600">Saved to server</span>
            </div>
          )}

          {/* Active Subject Banner for Grouped Mode */}
          {isGrouped && activeSubject && (
            <div className="bg-gray-50 border-l-4 border-amber-500 p-4 rounded-r-md flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Evaluating Direct Report</span>
                <h2 className="text-lg font-bold text-gray-900">{activeSubject.name}</h2>
                <p className="text-xs text-gray-500">{activeSubject.team || activeSubject.department} • {activeSubject.email}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  isSubjectComplete(activeSubject.id)
                    ? 'bg-emerald-100 text-emerald-800'
                    : isSubjectStarted(activeSubject.id)
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {isSubjectComplete(activeSubject.id) ? 'Section Complete' : isSubjectStarted(activeSubject.id) ? 'In Progress' : 'Not Started'}
                </span>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* CORE COMPETENCIES SECTION */}
          {/* ============================================================= */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2 mb-4">
              1. Core Competencies
            </h2>
            
            <div className="space-y-6">
              <div>
                <label htmlFor={techSkillsId} className="block text-sm font-medium text-gray-700 mb-1">
                  Technical Skills & Knowledge <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">Describe the application of technical skills in daily tasks and project execution.</p>
                <textarea 
                  id={techSkillsId}
                  name={techSkillsId}
                  rows={4} 
                  className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500" 
                  placeholder="Provide specific examples and observations..."
                  value={isGrouped ? (activeSubjectData?.techSkills || '') : techSkills}
                  onChange={(e) => {
                    if (isGrouped && activeSubject) {
                      handleGroupInputChange(activeSubject.id, 'techSkills', e.target.value);
                    } else {
                      setTechSkills(e.target.value);
                      setDraftSavedMessage('');
                    }
                  }}
                />
              </div>

              <div>
                <label htmlFor={commRatingId} className="block text-sm font-medium text-gray-700 mb-1">
                  Communication & Teamwork <span className="text-red-500">*</span>
                </label>
                <select 
                  id={commRatingId}
                  name={commRatingId}
                  className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500 mb-2 bg-white"
                  value={isGrouped ? (activeSubjectData?.commRating || 'Select a rating') : commRating}
                  onChange={(e) => {
                    if (isGrouped && activeSubject) {
                      handleGroupInputChange(activeSubject.id, 'commRating', e.target.value);
                    } else {
                      setCommRating(e.target.value);
                      setDraftSavedMessage('');
                    }
                  }}
                >
                  <option>Select a rating</option>
                  <option>Exceeds Expectations</option>
                  <option>Meets Expectations</option>
                  <option>Needs Improvement</option>
                </select>

                <label htmlFor={commNotesId} className="block text-xs font-medium text-gray-700 mt-2 mb-1">
                  Additional Communication Comments <span className="text-gray-600 font-normal">(optional)</span>
                </label>
                <textarea 
                  id={commNotesId}
                  name={commNotesId}
                  rows={2} 
                  className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500" 
                  placeholder="Additional communication comments (optional)..."
                  value={isGrouped ? (activeSubjectData?.commNotes || '') : commNotes}
                  onChange={(e) => {
                    if (isGrouped && activeSubject) {
                      handleGroupInputChange(activeSubject.id, 'commNotes', e.target.value);
                    } else {
                      setCommNotes(e.target.value);
                      setDraftSavedMessage('');
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* ============================================================= */}
          {/* AREAS FOR GROWTH SECTION */}
          {/* ============================================================= */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2 mb-4">
              2. Areas for Growth
            </h2>
            <div>
              <label htmlFor={growthAreasId} className="block text-sm font-medium text-gray-700 mb-1">
                Identify any potential areas where a PIP or PDP might be beneficial.
              </label>
              <textarea 
                id={growthAreasId}
                name={growthAreasId}
                rows={3} 
                className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-amber-500 focus:border-amber-500" 
                placeholder="Optional development notes..."
                value={isGrouped ? (activeSubjectData?.growthAreas || '') : growthAreas}
                onChange={(e) => {
                  if (isGrouped && activeSubject) {
                    handleGroupInputChange(activeSubject.id, 'growthAreas', e.target.value);
                  } else {
                    setGrowthAreas(e.target.value);
                    setDraftSavedMessage('');
                  }
                }}
              />
            </div>
          </div>

          {/* Grouped Next / Previous Subject Helpers */}
          {isGrouped && totalSubjects > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-xs">
              <button
                type="button"
                disabled={activeSubjectIndex === 0}
                onClick={() => setActiveSubjectIndex(i => Math.max(0, i - 1))}
                className="text-gray-600 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed font-medium"
              >
                ← Previous Direct Report ({subjectsList[Math.max(0, activeSubjectIndex - 1)]?.name})
              </button>
              <span className="text-gray-400">
                {activeSubjectIndex + 1} of {totalSubjects}
              </span>
              <button
                type="button"
                disabled={activeSubjectIndex === totalSubjects - 1}
                onClick={() => setActiveSubjectIndex(i => Math.min(totalSubjects - 1, i + 1))}
                className="text-gray-600 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed font-medium"
              >
                Next Direct Report ({subjectsList[Math.min(totalSubjects - 1, activeSubjectIndex + 1)]?.name}) →
              </button>
            </div>
          )}

          {/* ============================================================= */}
          {/* ACTIONS: CANCEL, SAVE DRAFT, SUBMIT ALL */}
          {/* ============================================================= */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-gray-200">
            <Button 
              variant="outline" 
              type="button" 
              onClick={handleClose}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <Button 
                variant="outline" 
                type="button" 
                onClick={handleSaveDraft}
                disabled={savingDraft || submitting}
                className="border-amber-300 text-amber-800 hover:bg-amber-50"
              >
                {savingDraft ? 'Saving...' : 'Save Draft'}
              </Button>

              <Button 
                variant="primary" 
                type="submit" 
                disabled={submitting || savingDraft}
                className="px-6"
              >
                {submitting 
                  ? 'Submitting...' 
                  : isGrouped 
                  ? `Submit All Reviews (${completedCount}/${totalSubjects})` 
                  : 'Submit Review'}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
