"use client";
import { COLORS } from "@/constants/color";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import * as d3 from "d3";
import { useState } from "react";
const formatTime = d3.timeFormat("%I:%M %p"); // e.g., 02:00 AM
const formatDate = d3.timeFormat("%m/%d");

// const data = [
//   { time: "00:00", temperature: 18, humidity: 65 },
//   { time: "01:00", temperature: 18, humidity: 65 },
//   { time: "02:00", temperature: 17, humidity: 68 },
//   { time: "04:00", temperature: 16, humidity: 72 },
//   { time: "06:00", temperature: 19, humidity: 65 },
//   { time: "08:00", temperature: 22, humidity: 58 },
//   { time: "10:00", temperature: 26, humidity: 50 },
//   { time: "12:00", temperature: 28, humidity: 45 },
//   { time: "14:00", temperature: 29, humidity: 43 },
//   { time: "16:00", temperature: 30, humidity: 42 },
//   { time: "18:00", temperature: 27, humidity: 48 },
//   { time: "20:00", temperature: 24, humidity: 55 },
//   { time: "22:00", temperature: 21, humidity: 60 },
//   { time: "24:00", temperature: 20, humidity: 62 },
// ];

const data = [
  { time: "2025-07-01T00:00:00Z", temperature: 18, humidity: 65 },
  { time: "2025-07-01T01:00:00Z", temperature: 18, humidity: 65 },
  { time: "2025-07-01T02:00:00Z", temperature: 17, humidity: 68 },
  { time: "2025-07-01T04:00:00Z", temperature: 16, humidity: 72 },
  { time: "2025-07-01T06:00:00Z", temperature: 19, humidity: 65 },
  { time: "2025-07-01T08:00:00Z", temperature: 22, humidity: 58 },
  { time: "2025-07-01T10:00:00Z", temperature: 26, humidity: 50 },
  { time: "2025-07-01T12:00:00Z", temperature: 28, humidity: 45 },
  { time: "2025-07-01T14:00:00Z", temperature: 29, humidity: 43 },
  { time: "2025-07-01T16:00:00Z", temperature: 30, humidity: 42 },
  { time: "2025-07-01T18:00:00Z", temperature: 27, humidity: 48 },
  { time: "2025-07-01T20:00:00Z", temperature: 24, humidity: 55 },
  { time: "2025-07-01T22:00:00Z", temperature: 21, humidity: 60 },
  { time: "2025-07-02T00:00:00Z", temperature: 20, humidity: 62 },
].map((d) => ({
  ...d,
  timestamp: new Date(d.time).getTime(), // Convert to numeric timestamp for XAxis
}));

// const CustomTick = ({
//   x,
//   y,
//   payload,
//   dataLength,
//   showStart,
//   showEnd,
//   isFirstLabelShowing,
// }: any) => {
//   const date = new Date(payload.value);
//   const timeLabel = d3.timeFormat("%I:%M %p")(date); // e.g. "02:00 AM"
//   const dateLabel = d3.timeFormat("%m/%d")(date); // e.g. "07/01"
//   // console.log(dataLength, showStart, isFirstLabelShowing, "------linechart");

//   // Show label only for even indexes and first/last tick
//   let showLabel = false;

//   const isFirst = payload.index === 0;
//   const isLast = payload.index === dataLength - 1;

//   // Hide first tick if start is inserted → false
//   if (isFirst && !showStart) {
//     showLabel = false;
//   }
//   // Hide last tick if end is inserted → false
//   else if (isLast && !showEnd) {
//     showLabel = false;
//   }
//   // Hide first tick if it's not supposed to be visible even though showStart is true
//   else if (isFirst && showStart && !isFirstLabelShowing) {
//     showLabel = false;
//   }
//   // Otherwise, decide based on even/odd index pattern
//   else {
//     // Determine offset: if first label is inserted, shift the parity by 1
//     const offset = !showStart ? 1 : 0;
//     // console.log(offset, isFirstLabelShowing, "---------offset");

//     if (isFirstLabelShowing) {
//       showLabel = (payload.index + offset) % 2 === 0;
//     } else {
//       showLabel = (payload.index + offset) % 2 !== 0;
//     }
//   }

//   return (
//     <g transform={`translate(${x},${y})`}>
//       {showLabel && (
//         <text textAnchor="middle" fill={COLORS.black} fontSize={12}>
//           <tspan x={0} dy="1.2em">
//             {timeLabel}
//           </tspan>
//           <tspan x={0} dy="1.2em">
//             {dateLabel}
//           </tspan>
//         </text>
//       )}
//     </g>
//   );
// };

// const CustomTick = ({
//   x,
//   y,
//   payload,
//   visibleLabelTicks,
// }: {
//   x: number;
//   y: number;
//   payload: { value: number };
//   visibleLabelTicks?: string[];
// }) => {
//   const date = new Date(payload.value);
//   const timestamp = date.getTime();
//   // Convert the visible label strings to timestamps once
//   const visibleTimestamps = visibleLabelTicks?.map((d) =>
//     new Date(d).getTime()
//   );

//   // Check if this tick is visible (allow a small tolerance, e.g. ±1 minute)
//   const isVisible = visibleTimestamps?.some(
//     (t) => Math.abs(t - timestamp) < 60_000
//   );

//   if (!isVisible) return null;
//   const timeLabel = d3.timeFormat("%I:%M %p")(date);
//   const dateLabel = d3.timeFormat("%m/%d")(date);

//   return (
//     <g transform={`translate(${x},${y})`}>
//       {/* <line
//         x1={0}
//         y1={0}
//         x2={0}
//         y2={8} // increase tick height
//         stroke={COLORS.black}
//         strokeWidth={1.5} // tick stroke thickness
//       /> */}
//       <text textAnchor="middle" fill={COLORS.black} fontSize={12}>
//         <tspan x={0} dy="0.2em">
//           {timeLabel}
//         </tspan>
//         <tspan x={0} dy="1.2em">
//           {dateLabel}
//         </tspan>
//       </text>
//     </g>
//   );
// };

const CustomTick = ({
  x,
  y,
  payload,
  visibleLabelTicks,
}: {
  x: number;
  y: number;
  payload: { value: number };
  visibleLabelTicks?: string[];
}) => {
  const date = new Date(payload.value);
  const timestamp = date.getTime();

  const visibleTimestamps = visibleLabelTicks?.map((d) =>
    new Date(d).getTime()
  );

  const isVisible = visibleTimestamps?.includes(timestamp);

  if (!isVisible) return null;

  const timeLabel = d3.timeFormat("%I:%M %p")(date);
  const dateLabel = d3.timeFormat("%m/%d")(date);

  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill={COLORS.black} fontSize={12}>
        <tspan x={0} dy="0.2em">
          {timeLabel}
        </tspan>
        <tspan x={0} dy="1.2em">
          {dateLabel}
        </tspan>
      </text>
    </g>
  );
};

export default function DualAxisChart({
  thermoColor,
  data,
  showTemperature = true,
  showHumidity = true,
  visibleLabelTicks = [],
  selectedThermo,
}: {
  thermoColor: any;
  data: any[];
  showTemperature?: boolean;
  showHumidity?: boolean;
  visibleLabelTicks?: any;
  selectedThermo: any;
}) {
  // console.log(data, "----------chartdata");
  return (
    <div className="w-full bg-white rounded-2xl -ml-4">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={data}
          margin={{ top: 0, right: -30, left: 0, bottom: 20 }}
        >
          <defs>
            <linearGradient id="chartBg" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={COLORS.lavenderMist_50_opacity}
                stopOpacity={1}
              />
              <stop
                offset="100%"
                stopColor={COLORS.lavenderMist_50_opacity}
                stopOpacity={1}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="#d1d5db"
            fill="url(#chartBg)"
            vertical={false}
          />

          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value, index) => {
              // return index % 2 === 0 ? formatTime(new Date(value)) : "";
              return "";
            }}
            stroke={COLORS.black}
            tick={(props) => (
              <CustomTick
                {...props}
                dataLength={data.length}
                totalTicks={data.length}
                visibleLabelTicks={visibleLabelTicks}
              />
            )}
            // tick={{ fontSize: 12 }}
            tickMargin={10}
            axisLine={false}
            tickLine={{
              stroke: COLORS.black, // color
              strokeWidth: 1.5, // tick thickness
            }}
            tickSize={10}
          />

          <YAxis
            yAxisId="right"
            orientation="right"
            stroke={COLORS.darkViolet}
            tick={{ fontSize: 10 }}
            tickCount={6}
            tickFormatter={(value) => `${value}°C`}
            domain={[
              (dataMin) => Math.floor(Math.max(dataMin - 2, 0)),
              (dataMax) => Math.ceil(dataMax + 2),
            ]}
          />

          <YAxis
            yAxisId="left"
            stroke={COLORS.darkgreen}
            tick={{ fontSize: 10 }}
            tickCount={6}
            tickFormatter={(value) => `${value}%`}
            domain={[
              (dataMin) => Math.floor(Math.max(dataMin - 5, 0)),
              (dataMax) => Math.ceil(dataMax + 5),
            ]}
          />

          {/* <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "2px solid #e5e7eb",
              borderRadius: "8px",
              padding: "12px",
            }}
            formatter={(value, name) => {
              if (name === "Temperature (°C)") return `${value}°C`;
              if (name === "Humidity (%)") return `${value}%`;
              return value;
            }}
            labelFormatter={(label) => {
              const date = new Date(label);
              return `${formatTime(date)} ${d3.timeFormat("%m/%d/%y")(date)}`;
            }}
          /> */}

          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "2px solid #e5e7eb",
              borderRadius: "8px",
              padding: "12px",
            }}
            formatter={(value, name) => {
              // hide temperature if flag is false
              if (name === "Temperature (°C)" && !showTemperature) return null;
              // hide humidity if flag is false
              if (name === "Humidity (%)" && !showHumidity) return null;

              if (name === "Temperature (°C)") return [`${value}°C`, name];
              if (name === "Humidity (%)") return [`${value}%`, name];
              return [value, name];
            }}
            labelFormatter={(label) => {
              const date = new Date(label);
              return `${formatTime(date)} ${d3.timeFormat("%m/%d/%y")(date)}`;
            }}
            filterNull={true}
          />

          <Line
            yAxisId="right"
            type="monotone"
            dataKey="temperature"
            stroke={COLORS.lightBlue}
            strokeWidth={2}
            activeDot={{ r: 5 }}
            name="Temperature (°C)"
            connectNulls
            isAnimationActive={false}
            strokeOpacity={showTemperature ? 1 : 0}
            dot={showTemperature ? { fill: COLORS.lightBlue, r: 4 } : false}
          />

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="humidity"
            stroke={COLORS.lightGreen}
            strokeWidth={2}
            activeDot={{ r: 5 }}
            name="Humidity (%)"
            connectNulls
            isAnimationActive={false}
            strokeOpacity={showHumidity ? 1 : 0}
            dot={showHumidity ? { fill: COLORS.lightGreen, r: 4 } : false}
          />

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="0x60"
            stroke={COLORS.green}
            strokeWidth={2}
            activeDot={{ r: 5 }}
            name="0x60"
            connectNulls
            isAnimationActive={false}
            strokeOpacity={selectedThermo["0x60"] ? 1 : 0}
            dot={
              selectedThermo["0x60"]
                ? { fill: thermoColor["0x60"], r: 4 }
                : false
            }
          />

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="0x63"
            stroke={COLORS.darkyellow}
            strokeWidth={2}
            activeDot={{ r: 5 }}
            name="0x63"
            connectNulls
            isAnimationActive={false}
            strokeOpacity={selectedThermo["0x63"] ? 1 : 0}
            dot={
              selectedThermo["0x63"]
                ? { fill: thermoColor["0x63"], r: 4 }
                : false
            }
          />

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="0x67"
            stroke={COLORS.dodgerBlue}
            strokeWidth={2}
            activeDot={{ r: 5 }}
            name="0x67"
            connectNulls
            isAnimationActive={false}
            strokeOpacity={selectedThermo["0x67"] ? 1 : 0}
            dot={
              selectedThermo["0x67"]
                ? { fill: thermoColor["0x67"], r: 4 }
                : false
            }
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
