import React from 'react';
import Card from '../components/ui/Card';
import InfoAlert from '../components/ui/InfoAlert';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';

export default function HRReports() {
  const mockData = [
    { manager: 'C. Herath', dept: 'Technology', period: 'Q2 • FY 2026', status: 'Submitted', date: '20 Aug 2026' },
    { manager: 'S. Wijesinha', dept: 'Product', period: 'Q2 • FY 2026', status: 'Pending', date: '-' },
    { manager: 'K. Perera', dept: 'Operations', period: 'Q2 • FY 2026', status: 'Not submitted', date: '-' },
  ];

  return (
    <div className="w-full space-y-6 pb-12">
      <div>
        <p className="text-xs font-bold text-amber-600 tracking-wider uppercase mb-1">HR MANAGER • Q2 FY 2026</p>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-semibold text-gray-900">Department reports</h1>
          <span className="bg-gray-100 text-gray-700 py-1.5 px-3 rounded-md text-sm font-medium border border-gray-200">
            Active Cycle: Q2 • FY 2026
          </span>
        </div>
      </div>

      <InfoAlert title="Reports only" variant="green">
        HR can view reports submitted by Department Managers. HR cannot access live employee status tables, raw reviews, author names, evidence files, or notes.
      </InfoAlert>

      <Card title="Report submission status" subtitle="One row per Department Manager">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Department Manager</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Submitted</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.manager}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.dept}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.period}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={row.status} /></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Button variant="outline" className="text-xs px-3 py-1 bg-white hover:bg-gray-50 border-gray-200">
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
