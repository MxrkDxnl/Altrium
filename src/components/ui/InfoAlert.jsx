import React from 'react';

export default function InfoAlert({ title, children, variant = 'green' }) {
  const bgColors = {
    green: 'bg-[#F0F8F1]',
    yellow: 'bg-[#FFF9E6]',
  };

  return (
    <div className={`${bgColors[variant]} rounded-lg p-6 mb-6 shadow-sm border border-gray-100`}>
      {title && <p className="font-bold text-gray-900 mb-1.5 text-sm">{title}</p>}
      <div className="text-gray-700 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}
