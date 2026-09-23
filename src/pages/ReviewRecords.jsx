import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import InfoAlert from '../components/ui/InfoAlert';
import Button from '../components/ui/Button';
import api from '../api';

export default function ReviewRecords() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReview, setSelectedReview] = useState(null);

  useEffect(() => {
    let active = true;
    api.get('/reviews/subordinates')
      .then(res => {
        if (active) setReviews(res.data);
      })
      .catch(err => {
        if (active) {
          console.error(err);
          setError('Failed to fetch reviews');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const parseContent = (content) => {
    if (!content) return {};
    if (typeof content === 'string') {
      try { return JSON.parse(content); } catch { return {}; }
    }
    return content;
  };

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-bold text-amber-600 tracking-wider uppercase mb-1">MANAGER VIEW ONLY</p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 leading-tight">Self & peer review records</h1>
        </div>
      </div>

      <InfoAlert title="Confidential manager access" variant="green">
        Reviews, including author names, are visible only to the Team Manager, Department Manager, and Operational Manager.
      </InfoAlert>

      <Card 
        title="Review completion and content" 
        subtitle="Employees cannot see peer review records."
      >
        {loading ? (
          <p className="text-gray-500 p-4">Loading reviews...</p>
        ) : error ? (
          <p className="text-red-500 p-4">{error}</p>
        ) : reviews.length === 0 ? (
          <div className="text-center p-8">
            <p className="text-gray-500 text-lg">No recent feedback available</p>
          </div>
        ) : (
          <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reviewee</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reviewer</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Quarter</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Submitted At</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{review.reviewee?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.reviewer?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.Task?.type === 'self_review' ? 'Self Review' : (review.Task?.type === 'upward_review' ? 'Upward Feedback' : 'Peer Review')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{review.Task?.quarter} {review.Task?.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(review.submitted_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Button variant="outline" className="text-xs px-3 py-1" onClick={() => setSelectedReview(review)}>View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Overlay for Viewing Review */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto pt-10 pb-10">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-1 text-gray-900">Review Details</h2>
            <p className="text-sm text-gray-500 mb-6 border-b border-gray-100 pb-4">
              {selectedReview.Task?.type === 'self_review' ? 'Self Review' : (selectedReview.Task?.type === 'upward_review' ? 'Upward Feedback' : 'Peer Review')} for <span className="font-semibold text-gray-700">{selectedReview.reviewee?.name}</span> (Written by: <span className="font-semibold text-gray-700">{selectedReview.reviewer?.name}</span>)
            </p>
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Technical Skills & Knowledge</h3>
                <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-md border border-gray-100 whitespace-pre-wrap">
                  {parseContent(selectedReview.content).techSkills || 'N/A'}
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Communication Rating</h3>
                  <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-md border border-gray-100 font-medium text-amber-700">
                    {parseContent(selectedReview.content).commRating || 'N/A'}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Communication Notes</h3>
                <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-md border border-gray-100 whitespace-pre-wrap">
                  {parseContent(selectedReview.content).commNotes || 'N/A'}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Areas for Growth (PIP/PDP suggestions)</h3>
                <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-md border border-gray-100 whitespace-pre-wrap">
                  {parseContent(selectedReview.content).growthAreas || 'N/A'}
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <Button variant="primary" onClick={() => setSelectedReview(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
