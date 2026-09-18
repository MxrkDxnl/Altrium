import React from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function MyDevelopment() {
  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <p className="text-xs font-bold text-amber-600 tracking-wider uppercase mb-1">EMPLOYEE → TEAM MANAGER</p>
          <h1 className="text-3xl font-semibold text-gray-900 leading-tight">Plans and evidence</h1>
        </div>
        
        {/* Toggle - Mockup */}
        <div className="flex bg-white rounded-md p-1 border border-gray-200 shadow-sm">
          <button className="px-4 py-2 text-sm font-medium rounded bg-amber-500 text-white shadow">Employee</button>
          <button className="px-4 py-2 text-sm font-medium rounded text-gray-500 hover:bg-gray-50">Team Manager</button>
        </div>
      </div>

      <div className="space-y-6">
        {/* PIP Card */}
        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-amber-500 border-y border-r border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFF9E6] text-amber-800">
                PIP • Required
              </span>
              <div className="text-right">
                <span className="text-xs text-gray-500 uppercase font-semibold">Complete by</span>
                <p className="text-sm font-bold text-gray-900">Q3 • FY 2026</p>
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2">Improve technical documentation</h2>
            <p className="text-gray-600 text-sm mb-6">
              Complete the documentation workshop and submit one updated technical guide.
            </p>

            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
              <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '45%' }}></div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">45% complete • 2-quarter deadline</span>
              <Button variant="outline" className="text-sm font-semibold">Submit evidence</Button>
            </div>
          </div>
        </div>

        {/* PDP Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F0F8F1] text-green-800">
                PDP • Ongoing
              </span>
              <div className="text-right">
                <span className="text-xs text-gray-500 uppercase font-semibold">Timeframe</span>
                <p className="text-sm font-bold text-gray-900">Flexible</p>
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2">Build cloud platform skills</h2>
            <p className="text-gray-600 text-sm mb-6">
              Complete foundational AWS learning and share evidence with your manager.
            </p>

            <div className="flex justify-between items-center mt-8">
              <span className="text-sm text-gray-500">Last update: 12 Aug 2026</span>
              <Button variant="outline" className="text-sm font-semibold">Submit evidence</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
