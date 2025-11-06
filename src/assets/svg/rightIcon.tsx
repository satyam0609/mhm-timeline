import { COLORS } from "@/constants/color";
import React from "react";

interface SVGProps {
  width?: number;
  height?: number;
  color?: string;
}

const RightIcon: React.FC<SVGProps> = ({
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
      <path d="M5 7.5L0 15L0 0L5 7.5Z" fill={color} />
    </svg>
  );
};

export default RightIcon;
