import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import InfoAlert from '../components/ui/InfoAlert';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import PlanDetailsModal from '../components/plans/PlanDetailsModal';
import { useAuth } from '../context/useAuth';
import api from '../api';

export default function EvidenceSubmissions() {
  const { currentUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  const fetchAssignedPlans = () => {
    return api.get('/plans/assigned')
      .then((res) => {
        setPlans(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to fetch assigned plans:', err);
        setError('Failed to load assigned plan evidence');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAssignedPlans();
  }, []);

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-bold text-amber-600 tracking-wider uppercase mb-1">
            {currentUser?.department ? `${currentUser.department.toUpperCase()} DEPARTMENT` : 'MANAGER VIEW'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 leading-tight">PIP & PDP Evidence Submissions</h1>
        </div>
      </div>

      <InfoAlert title="Strict managerial scope" variant="green">
        Displaying development and improvement plans assigned to your direct subordinates.
      </InfoAlert>

      <Card 
        title="Evidence submission status" 
        subtitle="Submitted means the employee has submitted deliverables for managerial review."
      >
        {loading ? (
          <p className="text-gray-500 p-4 text-sm">Loading assigned plan records...</p>
        ) : error ? (
          <p className="text-red-500 p-4 text-sm">{error}</p>
        ) : plans.length === 0 ? (
          <div className="text-center p-8">
            <p className="text-gray-500 text-sm">No PIP or PDP plans currently assigned to subordinates.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Recipient</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Team / Role</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Evidence Files</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {plans.map((planItem) => {
                  const evCount = planItem.evidences ? planItem.evidences.length : 0;
                  const displayStatus = planItem.status === 'evidence_submitted'
                    ? 'Evidence Submitted'
                    : planItem.status === 'completed'
                    ? 'Completed'
                    : 'Pending';

                  return (
                    <tr key={planItem.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {planItem.recipient?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                        {planItem.recipient?.team || planItem.recipient?.role?.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                            planItem.type === 'PIP'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {planItem.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={displayStatus} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                        {evCount === 0 ? 'No files' : `${evCount} ${evCount === 1 ? 'file' : 'files'}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Button
                          variant="outline"
                          className="text-xs px-3 py-1 font-semibold text-amber-800 border-amber-300 hover:bg-amber-50"
                          onClick={() => setSelectedPlanId(planItem.id)}
                        >
                          View Plan
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedPlanId && (
        <PlanDetailsModal
          planId={selectedPlanId}
          onClose={() => {
            setSelectedPlanId(null);
            fetchAssignedPlans();
          }}
          onEvidenceSubmitted={() => {
            fetchAssignedPlans();
          }}
        />
      )}
    </div>
  );
}
