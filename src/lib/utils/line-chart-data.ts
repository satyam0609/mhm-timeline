import * as d3 from "d3";

/**
 * Convert an interval key like '1h', '3h', '15m', '1d' to a D3 time interval.
 * @param {string} key - e.g. "15m", "1h", "6h", "1d"
 * @returns {d3.TimeInterval}
 */
function getD3Interval(key: string) {
  const match = key.match(/^(\d+)([mhdM])$/);
  if (!match)
    throw new Error("Invalid interval key format. Use like '15m', '1h', '1d'.");

  const [, valueStr, unit] = match;
  const value = +valueStr;

  switch (unit) {
    case "m":
      return d3.timeMinute.every(value);
    case "h":
      return d3.timeHour.every(value);
    case "d":
      return d3.timeDay.every(value);
    case "M":
      return d3.timeMonth.every(value);
    default:
      throw new Error("Unsupported interval unit. Use 'm', 'h', or 'd'.");
  }
}

/**
 * Generate time series data with temperature & humidity based on interval key.
 * Ensures startDate and endDate are included and evenly spaced.
 *
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {string} intervalKey - e.g. '15m', '1h', '6h', '1d'
 * @returns {Array<{ time: string, temperature: number, humidity: number, timestamp: number }>}
 */
export function generateTimeSeriesData(
  startDate: Date,
  endDate: Date,
  intervalKey: string
) {
  const interval = getD3Interval(intervalKey);
  if (!interval) throw new Error(`Unsupported interval key: ${intervalKey}`);

  // Get natural tick points (excluding end)
  const ticks = interval.range(startDate, endDate);

  // Flags to track if start/end were manually inserted
  let startInserted = false;
  let endInserted = false;

  // Check if start is part of the ticks
  if (ticks.length === 0 || ticks[0].getTime() !== startDate.getTime()) {
    ticks.unshift(startDate);
    startInserted = true;
  }

  // Check if end is part of the ticks
  const lastTick = ticks[ticks.length - 1];
  if (lastTick.getTime() !== endDate.getTime()) {
    ticks.push(endDate);
    endInserted = true;
  }

  // Deduplicate just in case (to handle any overlaps)
  const uniqueTimes = Array.from(new Set(ticks.map((t) => t.getTime()))).map(
    (t) => new Date(t)
  );

  // Generate demo data
  const series = uniqueTimes.map((time, i) => {
    const temperature = 18 + Math.sin(i / 2) * 10 + Math.random() * 2;
    const humidity = 65 - Math.sin(i / 3) * 15 + Math.random() * 3;
    return {
      time: time.toISOString(),
      temperature: +Math.round(temperature * 10) / 10,
      humidity: Math.round(humidity),
      timestamp: time.getTime(),
    };
  });

  return {
    data: series,
    startInserted,
    endInserted,
  };
}
