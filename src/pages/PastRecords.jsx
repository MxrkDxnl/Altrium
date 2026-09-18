import React from 'react';
import Card from '../components/ui/Card';
import StatusBadge from '../components/ui/StatusBadge';

export default function PastRecords() {
  const mockRecords = [
    { year: 'FY 2025', quarter: 'Q2', type: 'Self Review', title: 'Q2 Self Assessment', status: 'Completed', score: 'Meets Expectations' },
    { year: 'FY 2025', quarter: 'Q2', type: 'Peer Review', title: 'Review by Manager', status: 'Completed', score: 'Exceeds Expectations' },
    { year: 'FY 2024', quarter: 'Q3', type: 'PDP', title: 'Leadership Workshop', status: 'Completed', score: 'N/A' },
  ];

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-900 leading-tight">Past Records Archive</h1>
        <p className="text-gray-600 mt-2">View historical performance data across previous financial years.</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Financial Year</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cycle</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Result</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockRecords.map((record, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{record.year}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.quarter}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{record.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.score}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={record.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
