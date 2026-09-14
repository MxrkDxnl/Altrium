import { useState, useEffect, useRef } from 'react';
import Card from '../components/ui/Card';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import api from '../api';
import ReviewForm from './ReviewForm';
import PlanDetailsModal from '../components/plans/PlanDetailsModal';

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const triggerBtnRef = useRef(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setSelectedTask(null);
    setLoading(true);
    setError('');
    setRefreshKey(k => k + 1);
  };

  const handleRetry = () => {
    setLoading(true);
    setError('');
    setRefreshKey(k => k + 1);
  };

  useEffect(() => {
    let active = true;

    api.get('/tasks/my-tasks')
      .then(res => {
        if (!active) return;

        let taskList = null;
        if (Array.isArray(res.data)) {
          taskList = res.data;
        } else if (res.data && typeof res.data === 'object' && Array.isArray(res.data.tasks)) {
          taskList = res.data.tasks;
        }

        if (taskList === null) {
          console.error('Invalid task response payload from server:', res.data);
          setError('Invalid task response format received from server. Please retry.');
          setTasks([]);
          return;
        }

        setTasks(taskList);
        setError('');
      })
      .catch(err => {
        if (!active) return;
        console.error('Error fetching tasks in MyTasks:', err);
        setError(err.response?.data?.message || 'Failed to load your assigned tasks. Please try again.');
        setTasks([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [refreshKey]);

  const isTaskExpired = (quarter, year) => {
    if (!quarter || !year) return false;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 to 11

    const numYear = typeof year === 'number' ? year : parseInt(year, 10);
    if (isNaN(numYear)) return false;

    if (currentYear > numYear) return true;
    if (currentYear < numYear) return false;

    if (quarter === 'Q1' && currentMonth > 3) return true;
    if (quarter === 'Q2' && currentMonth > 7) return true;
    if (quarter === 'Q3' && currentMonth > 11) return true;
    
    return false;
  };

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  return (
    <div className="w-full space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 leading-tight">My Tasks</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">Complete your assigned reviews and review your performance & development plans below.</p>
      </div>

      <Card title="Active Assignments">
        {loading ? (
          <div className="py-8 text-center">
            <p className="text-gray-500 text-sm">Loading your tasks...</p>
          </div>
        ) : error ? (
          <div className="py-6 px-4 bg-red-50 border border-red-200 rounded-lg text-center my-2">
            <p className="text-red-700 font-medium text-sm">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-3 inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-semibold rounded text-red-800 bg-white hover:bg-red-50 cursor-pointer shadow-xs transition-colors"
            >
              Retry
            </button>
          </div>
        ) : safeTasks.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="text-base font-medium text-gray-700">No pending tasks</p>
            <p className="text-xs text-gray-500 mt-1">You are all caught up! Any new assigned reviews or development plans will appear here.</p>
          </div>
        ) : (
          <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Subject / Assignment</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Quarter</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {safeTasks.map((task) => {
                  const expired = isTaskExpired(task.quarter, task.year);
                  const isPlanTask = task.type === 'pip' || task.type === 'pdp';

                  let groupSubjectIds = task.group_subject_ids;
                  if (typeof groupSubjectIds === 'string') {
                    try { groupSubjectIds = JSON.parse(groupSubjectIds); } catch { groupSubjectIds = []; }
                  }
                  const hasGroupSubjectIds = Array.isArray(groupSubjectIds) && groupSubjectIds.length > 0;
                  const isGrouped = task.type === 'downward_review' || hasGroupSubjectIds;

                  const displayStatus = isPlanTask && task.plan?.status === 'evidence_submitted'
                    ? 'Evidence Submitted'
                    : isPlanTask && task.plan?.status === 'completed'
                    ? 'Completed'
                    : task.status === 'completed'
                    ? 'Completed'
                    : task.draft_content
                    ? 'Draft Saved'
                    : 'Pending';

                  const planTargetId = task.plan_id || task.plan?.id;

                  return (
                    <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {task.type === 'self_review' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                            Self Review
                          </span>
                        ) : isGrouped ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">
                            Downward Group Review
                          </span>
                        ) : task.type === 'upward_review' || task.feedback_type === 'upward' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-800">
                            Upward Feedback
                          </span>
                        ) : task.type === 'peer_review' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-xs font-semibold bg-gray-100 text-gray-800">
                            Peer Review
                          </span>
                        ) : task.type === 'pip' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                            PIP Plan
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                            PDP Plan
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 min-w-[200px] break-words">
                        {task.plan ? (
                          <div>
                            <span className="font-semibold text-gray-900 block">{task.plan.title}</span>
                            {task.plan.manager && (
                              <span className="text-xs text-gray-500">Assigned by {task.plan.manager.name}</span>
                            )}
                          </div>
                        ) : isPlanTask ? (
                          <div>
                            <span className="font-semibold text-gray-900 block">{task.message || (task.type === 'pip' ? 'Performance Improvement Plan' : 'Personal Development Plan')}</span>
                            {task.reviewee && task.reviewee.name && (
                              <span className="text-xs text-gray-500">Recipient: {task.reviewee.name}</span>
                            )}
                          </div>
                        ) : isGrouped ? (
                          <div>
                            <span className="font-semibold text-gray-900 block">
                              Direct Reports ({Array.isArray(task.groupSubjects) ? task.groupSubjects.length : (Array.isArray(groupSubjectIds) ? groupSubjectIds.length : 0)} employees)
                            </span>
                            <span className="text-xs text-gray-500">
                              {Array.isArray(task.groupSubjects) && task.groupSubjects.length > 0
                                ? task.groupSubjects.filter(Boolean).map(s => s?.name || 'Direct Report').slice(0, 3).join(', ') + (task.groupSubjects.length > 3 ? ` +${task.groupSubjects.length - 3} more` : '')
                                : 'Team direct reports'}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-semibold text-gray-900 block">
                              {task.reviewee?.name || 'Review Assignment'}
                            </span>
                            {task.message && (
                              <span className="text-xs text-gray-500 block break-words">{task.message}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.quarter ? `${task.quarter} ${task.year || ''}` : (task.year ? `${task.year}` : 'Active')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {expired ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Expired
                          </span>
                        ) : (
                          <StatusBadge status={displayStatus} />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {isPlanTask ? (
                          planTargetId ? (
                            <Button
                              variant="outline"
                              className="text-xs px-4 py-1.5 font-semibold text-amber-800 border-amber-300 hover:bg-amber-50 shadow-xs"
                              onClick={(e) => {
                                triggerBtnRef.current = e.currentTarget;
                                setSelectedPlanId(planTargetId);
                              }}
                            >
                              View Plan
                            </Button>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs text-gray-500 bg-gray-100 border border-gray-200">
                              Plan details unavailable
                            </span>
                          )
                        ) : (
                          <Button 
                            variant="primary" 
                            className="text-xs px-4 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => setSelectedTask(task)}
                            disabled={expired || task.status === 'completed'}
                          >
                            {task.status === 'completed'
                              ? 'Completed'
                              : expired
                              ? 'Expired'
                              : task.draft_content
                              ? 'Continue Draft'
                              : 'Start Form'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Review Form Modal Overlay */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto pt-10 pb-10">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <ReviewForm 
              task={selectedTask} 
              onClose={() => setSelectedTask(null)} 
              onSuccess={handleSuccess} 
            />
          </div>
        </div>
      )}

      {/* Plan Details Modal */}
      {selectedPlanId && (
        <PlanDetailsModal
          planId={selectedPlanId}
          onClose={() => {
            setSelectedPlanId(null);
            if (triggerBtnRef.current) {
              triggerBtnRef.current.focus();
            }
          }}
          onEvidenceSubmitted={() => setRefreshKey(k => k + 1)}
        />
      )}
    </div>
  );
}

