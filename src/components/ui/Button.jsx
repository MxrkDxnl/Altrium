import React from 'react';

export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const baseStyles = "px-4 py-2 rounded-md font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: "bg-amber-500 text-black font-semibold hover:bg-amber-400 focus:ring-amber-500 shadow-xs cursor-pointer",
    outline: "border border-gray-300 text-gray-800 bg-white hover:bg-gray-50 focus:ring-gray-500 cursor-pointer",
    text: "text-gray-700 hover:text-black bg-transparent cursor-pointer"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
