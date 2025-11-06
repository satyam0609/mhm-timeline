import { COLORS } from "@/constants/color";
import React from "react";

interface SVGProps {
  width?: number;
  height?: number;
  color?: string;
}

const LeftIcon: React.FC<SVGProps> = ({
  width = 5,
  height = 15,
  color = COLORS.midnightBlue,
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 5 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 7.5L5 0V15L0 7.5Z" fill={color} />
    </svg>
  );
};

export default LeftIcon;
