import React from "react";

interface SVGProps {
  width?: number;
  height?: number;
  color?: string;
}

const CalendarIcon: React.FC<SVGProps> = ({
  width = 24,
  height = 24,
  color = "#363030",
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_123_176)">
        <rect width="20" height="20" x="2" y="2" fill="#D3CCFF" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M15.5 8H15V7H14V8H10V7H9V8H8.5C7.945 8 7.5 8.45 7.5 9V16C7.5 16.55 7.945 17 8.5 17H15.5C16.05 17 16.5 16.55 16.5 16V9C16.5 8.45 16.05 8 15.5 8ZM15.5 16H8.5V10.5H15.5V16ZM9.25 12.5C9.25 11.81 9.81 11.25 10.5 11.25C11.19 11.25 11.75 11.81 11.75 12.5C11.75 13.19 11.19 13.75 10.5 13.75C9.81 13.75 9.25 13.19 9.25 12.5Z"
          fill={color}
        />
      </g>
      <defs>
        <clipPath id="clip0_123_176">
          <rect x="2" y="2" width="20" height="20" rx="10" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export default CalendarIcon;
