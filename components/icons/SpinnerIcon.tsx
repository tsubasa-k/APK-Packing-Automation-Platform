
import React from 'react';

export const SpinnerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    {...props}
    className={`animate-spin ${props.className}`}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v3m0 12v3m9-9h-3M6 12H3m16.5-6.5L15 9.75M9 14.25 4.5 18.75M19.5 4.5 15 9.75M9 9.75 4.5 5.25"
    />
  </svg>
);
