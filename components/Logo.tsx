import React from 'react';

// This SVG is a clean, stylized apple logo designed to be modern and legally distinct.
export const Logo: React.FC<{ className?: string }> = ({ className }) => (
    <svg 
        role="img" 
        aria-label="Fit AI Logo" 
        className={className} 
        viewBox="0 0 24 24" 
        xmlns="http://www.w3.org/2000/svg" 
        fill="currentColor"
    >
      <path d="M19.6,12.5c-0.1-2.2-1-4.2-2.7-5.6c-1.6-1.3-3.7-1.8-5.6-1.3c-0.2,0-0.4,0-0.5,0c-0.2,0-0.3,0-0.5,0 c-1.9-0.5-4,0-5.6,1.3C3.4,8.3,2.5,10.3,2.4,12.5c-0.1,2.5,0.7,5,2.4,6.8c1.5,1.6,3.6,2.5,5.8,2.6h0.1c0.1,0,0.2,0,0.3,0 c1.5,0,2.6-1,3.4-1s1.9,1,3.4,1c0.1,0,0.2,0,0.3,0h0.1c2.2-0.1,4.3-1,5.8-2.6C18.9,17.5,19.7,15,19.6,12.5z M15.4,5.4 c0.8-0.9,1.2-2,1.1-3.1c-1,0.1-2.1,0.8-2.8,1.6c-0.8,0.9-1.2,2-1.1,3.1C13.6,7.1,14.7,6.3,15.4,5.4z"/>
    </svg>
);