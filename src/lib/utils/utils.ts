import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import moment from "moment-timezone";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ = "America/Los_Angeles";

// export const convertToPST = (gmtDate: Date) => {
//   // Parse the GMT date and convert it to PST
//   const pstDateTime = moment
//     .tz(gmtDate, "GMT")
//     .tz(TZ)
//     .format("YYYY-MM-DDTHH:mm:ss.SSSZ");
//   console.log(gmtDate, "gmt to pst", pstDateTime);
//   return pstDateTime;
// };

export const convertToPST = (gmtDate: Date) => {
  const pstDateTime = moment
    .tz(gmtDate, "UTC")
    .tz(TZ)
    .format("YYYY-MM-DDTHH:mm:ss.SSS");

  return `${pstDateTime}000Z`;
};
