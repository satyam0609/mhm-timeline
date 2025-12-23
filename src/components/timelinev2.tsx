"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as d3 from "d3";
import { useResizeObserver } from "@/lib/hooks/useResizeObserver";
import { COLORS } from "@/constants/color";
import LeftIcon from "@/assets/svg/leftIcon";
import RightIcon from "@/assets/svg/rightIcon";
import CalendarIcon from "@/assets/svg/calendarIcon";
import { RotateCw } from "lucide-react";
import throttle from "lodash.throttle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "./ui/checkbox";
import { Skeleton } from "./ui/skeleton";
import Image from "next/image";
import { useRNBridge } from "@/lib/context/bridgeContext";

type IntervalConfig = {
  key: string;
  interval: d3.CountableTimeInterval | d3.TimeInterval;
  format: (date: Date) => string;
  minutes: number;
};

const intervals: IntervalConfig[] = [
  {
    key: "5m",
    interval: d3.timeMinute.every(5)!,
    format: d3.timeFormat("%I:%M %p"),
    minutes: 5,
  },
  {
    key: "15m",
    interval: d3.timeMinute.every(15)!,
    format: d3.timeFormat("%I:%M %p"),
    minutes: 15,
  },
  {
    key: "30m",
    interval: d3.timeMinute.every(30)!,
    format: d3.timeFormat("%I:%M %p"),
    minutes: 30,
  },
  {
    key: "1h",
    interval: d3.timeHour.every(1)!,
    format: d3.timeFormat("%I:%M %p"),
    minutes: 60,
  },
  //   {
  //     key: "2h",
  //     interval: d3.timeHour.every(2)!,
  //     format: d3.timeFormat("%I:%M %p"),
  //     minutes: 120,
  //   },
  {
    key: "3h",
    interval: d3.timeHour.every(3)!,
    format: d3.timeFormat("%I:%M %p"),
    minutes: 180,
  },
  {
    key: "6h",
    interval: d3.timeHour.every(6)!,
    format: d3.timeFormat("%m/%d %I %p"),
    minutes: 360,
  },
  {
    key: "12h",
    interval: d3.timeHour.every(12)!,
    format: d3.timeFormat("%m/%d %I %p"),
    minutes: 720,
  },
  {
    key: "1d",
    interval: d3.timeDay.every(1)!,
    format: d3.timeFormat("%m/%d/%Y"),
    minutes: 1440,
  },
  {
    key: "1w",
    interval: d3.timeWeek.every(1)!,
    format: d3.timeFormat("%b %d"),
    minutes: 10080,
  },
  {
    key: "1M",
    interval: d3.timeMonth.every(1)!,
    format: d3.timeFormat("%b %Y"),
    minutes: 43200,
  },
];

interface ZoomRangeConstraint {
  rangeDays: number;
  maxZoomIntervalKey: string;
  minZoomIntervalKey: string;
}

const ZOOM_CONSTRAINTS: ZoomRangeConstraint[] = [
  { rangeDays: 2, maxZoomIntervalKey: "5m", minZoomIntervalKey: "3h" },
  { rangeDays: 7, maxZoomIntervalKey: "1h", minZoomIntervalKey: "12h" },
  { rangeDays: 21, maxZoomIntervalKey: "1h", minZoomIntervalKey: "1d" },
  { rangeDays: 200, maxZoomIntervalKey: "1h", minZoomIntervalKey: "1w" },
  { rangeDays: Infinity, maxZoomIntervalKey: "3h", minZoomIntervalKey: "1M" },
];

// Add this helper function
const getDefaultInitialInterval = (totalDays: number): number => {
  for (const constraint of ZOOM_CONSTRAINTS) {
    if (totalDays <= constraint.rangeDays) {
      // Get the allowed intervals for this constraint
      const maxIdx = intervals.findIndex(
        (i) => i.key === constraint.maxZoomIntervalKey
      );
      const minIdx = intervals.findIndex(
        (i) => i.key === constraint.minZoomIntervalKey
      );

      // Return the middle index of allowed intervals
      const middleIdx = Math.floor((maxIdx + minIdx) / 2);
      return middleIdx;
    }
  }

  // Fallback to last constraint's middle
  const lastConstraint = ZOOM_CONSTRAINTS[ZOOM_CONSTRAINTS.length - 1];
  const maxIdx = intervals.findIndex(
    (i) => i.key === lastConstraint.maxZoomIntervalKey
  );
  const minIdx = intervals.findIndex(
    (i) => i.key === lastConstraint.minZoomIntervalKey
  );
  return Math.floor((maxIdx + minIdx) / 2);
};

interface timelineConfigProp {
  initialInterval?: number;
  scrollTo?: "end" | "middle" | "start";
  needTwoLineLabel?: boolean;
  intervalVariant?: "adjust" | "all" | "even";
  animateInitialRender?: boolean;
  minTickGap?: number;
}

interface ZoomableTimelineProps {
  timelineConfig?: timelineConfigProp;
  onZoom?: (data: any) => void;
  onGapChange?: (gap: number) => void;
  OnEndGapChange?: ({ left, right }: { left: number; right: number }) => void;
  onVisibleRangeChange?: (range: { start: Date; end: Date }) => void;
  onCalendarClick?: () => void;
  onReloadClick?: () => void;
  startDate: Date;
  endDate: Date;
  data?: any[];
  loading?: boolean;
  spectrogram?: string;
  isNormalSubMode?: boolean;
  onModeChange?: (mode: boolean) => void;
  loadingSpectrogram?: boolean;
}

const ZoomableTimelineV2 = ({
  timelineConfig = {},
  onZoom = () => {},
  onGapChange = () => {},
  OnEndGapChange = () => {},
  onVisibleRangeChange = () => {},
  onCalendarClick = () => {},
  onReloadClick = () => {},
  isNormalSubMode,
  onModeChange = () => {},
  data = [],
  startDate,
  endDate,
  //    startDate = new Date("2025-09-01T23:00:00.000Z"),
  //   endDate = new Date("2026-09-29T05:59:00.000Z"),
  loading = true,
  spectrogram,
  loadingSpectrogram,
}: ZoomableTimelineProps) => {
  // const { data: nativeData, sendToReactNative } = useReactNativeBridge({});
  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const totalMs = endDate.getTime() - startDate.getTime();

    return totalMs / (1000 * 60 * 60 * 24);
  }, [startDate, endDate]);

  // Get default initial interval based on range
  const defaultInitialInterval = useMemo(() => {
    const defaultInterval = getDefaultInitialInterval(totalDays);

    return defaultInterval;
  }, [totalDays]);
  const {
    initialInterval = defaultInitialInterval,
    scrollTo = "start",
    needTwoLineLabel = true,
    intervalVariant = "adjust",
    animateInitialRender = true,
    minTickGap = 90,
  } = timelineConfig;
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<any>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialWidthRef = useRef<HTMLDivElement>(null);
  const { width: primaryWidth } = useResizeObserver(containerRef);
  const { width: fallbackWidth } = useResizeObserver(initialWidthRef);
  const width = primaryWidth !== 0 ? primaryWidth : fallbackWidth;
  const [colorBlocks, setColorBlocks] = useState<any[]>([]);
  const [selectedInterval, setSelectedInterval] = useState("");
  const [zoomInfo, setZoomInfo] = useState({
    current: "",
    currentPxPerMin: 0,
    zoomLevel: "0",
    zoomIn: "",
    zoomOut: "",
    visibleDays: 0,
    totalDays: 0,
    constraint: "",
    minZoom: 1,
    maxZoom: 1,
    isAtMinZoom: false,
    isAtMaxZoom: false,
  });
  const [pivotPosition, setPivotPosition] = useState(0);
  const [pivotDate, setPivotDate] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPivot, setDragStartPivot] = useState(0);
  const [internalLoading, setInternalLoading] = useState(true);

  // === STEP 2: Add useEffect to sync loading (after your other useEffects) ===
  useEffect(() => {
    if (!loading) {
      setInternalLoading(false);
    }
  }, [loading]);

  const xScaleRef = useRef<any>(null);
  const pivotPositionRef = useRef<number>(0);
  const precisePivotRef = useRef<number>(0);
  const zoomBehaviorRef = useRef<any>(null);
  const svgSelectionRef = useRef<any>(null);
  const lastUserZoomRef = useRef<number>(1);
  const lastSelectedIntervalRef = useRef<string>("");
  const gxRef = useRef<any>(null);
  const hasCompletedInitialLoadRef = useRef(false);
  const hasInitialZoomAppliedRef = useRef(false);
  const isProgrammaticZoomRef = useRef(false);
  const isZoomingRef = useRef<"in" | "out">("in");
  const targetKey = useRef<string | null>(null);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        setInternalLoading(false); // <-- Only after 300-500ms
      }, 300); // delay ensures transitions can start cleanly
    } else {
      setInternalLoading(true);
      hasCompletedInitialLoadRef.current = false; // <-- reset animation trigger
    }
  }, [loading]);

  useEffect(() => {
    pivotPositionRef.current = pivotPosition;
    precisePivotRef.current = pivotPosition;
  }, [pivotPosition]);

  const throttledOnZoom = useRef(throttle(onZoom, 200)).current;
  const throttledOnVisibleRangeChange = useRef(
    throttle(onVisibleRangeChange, 200)
  ).current;

  //use this height to accomodate upto where the zoom should work
  const height = 120;

  //use this margin top to set the position of ticks and label
  const marginTop = 36;
  const marginLeft = 22;
  const marginRight = 22;
  const timelineHeight = 48;

  const tickGapRef = useRef<number>(0);
  const [tickGap, setTickGap] = useState<number>(0); // gap between ticks in px
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date }>({
    start: startDate!,
    end: endDate!,
  });

  const basePxPerMinRef = useRef(0);

  // 2. Update the ref whenever dependencies change
  useEffect(() => {
    if (width === 0 || !startDate || !endDate) return;

    const fullSpanMs = endDate.getTime() - startDate.getTime();
    const fullWidthPx = width - marginLeft - marginRight;
    const basePxPerMs = fullWidthPx / fullSpanMs;

    // Store in ref so 'zoomed' can access the latest value anytime
    basePxPerMinRef.current = basePxPerMs * 60 * 1000;

    sendToReactNative("data", basePxPerMinRef.current, "------base px per min");
  }, [width, startDate, endDate]);

  const getHeaderDate = useCallback(() => {
    if (internalLoading) return "Loading...";
    return `${d3.timeFormat("%B %d, %Y")(startDate!)} - ${d3.timeFormat(
      "%B %d, %Y"
    )(endDate!)}`;
  }, [startDate, endDate, internalLoading]);

  const onScrollorZoomEnd = (range: any, zoomData: any) => {
    console.log(
      zoomData.currentInterval,
      range,
      zoomData.visibleTicks,
      "----current interval level"
    );
    throttledOnVisibleRangeChange(range);
    throttledOnZoom(zoomData);
  };

  useEffect(() => {
    // setColorBlocks(generateColorBlocks());
    setColorBlocks(data);
  }, [data]);

  // FIXED: Use constant MIN_PX_PER_TICK instead of dynamic calculation
  const MIN_PX_PER_TICK = 60;

  const getTotalDays = () => {
    if (internalLoading) return 0; // <-- FIX: prevent undefined access
    if (!startDate || !endDate) return 0; // safety fallback

    const totalMs = endDate.getTime() - startDate.getTime();
    return totalMs / (1000 * 60 * 60 * 24);
  };

  const getActiveConstraint = (): ZoomRangeConstraint => {
    const totalDays = getTotalDays();

    for (const constraint of ZOOM_CONSTRAINTS) {
      if (totalDays <= constraint.rangeDays) {
        return constraint;
      }
    }
    return ZOOM_CONSTRAINTS[ZOOM_CONSTRAINTS.length - 1];
  };

  const getAllowedIntervals = (
    constraint: ZoomRangeConstraint
  ): IntervalConfig[] => {
    const maxIdx = intervals.findIndex(
      (i) => i.key === constraint.maxZoomIntervalKey
    );
    const minIdx = intervals.findIndex(
      (i) => i.key === constraint.minZoomIntervalKey
    );
    return intervals.slice(maxIdx, minIdx + 1);
  };

  const getInterval = (
    pxPerMin: number,
    constraint: ZoomRangeConstraint
  ): IntervalConfig => {
    const allowedIntervals = getAllowedIntervals(constraint);

    for (const interval of allowedIntervals) {
      const requiredPxPerMin = MIN_PX_PER_TICK / interval.minutes;
      if (pxPerMin >= requiredPxPerMin) {
        return interval;
      }
    }

    return allowedIntervals[allowedIntervals.length - 1];
  };

  const mapZoomToConstraint = (
    userZoom: number,
    minConstraintZoom: number,
    maxConstraintZoom: number
  ) => {
    return d3
      .scaleLinear()
      .domain([1, maxConstraintZoom]) // userZoom range
      .range([minConstraintZoom, maxConstraintZoom]) // constraintZoom range
      .clamp(true)(userZoom);
  };

  const mapConstraintToZoom = (
    constraintZoom: number,
    minConstraintZoom: number,
    maxConstraintZoom: number
  ) => {
    return d3
      .scaleLinear()
      .domain([minConstraintZoom, maxConstraintZoom]) // constraint zoom
      .range([1, maxConstraintZoom]) // user zoom
      .clamp(true)(constraintZoom);
  };

  // const calculateZoomExtent = () => {
  //   const constraint = getActiveConstraint();
  //   const allowedIntervals = getAllowedIntervals(constraint);

  //   const finestInterval = allowedIntervals[0];
  //   const notFinestInterval = allowedIntervals[allowedIntervals.length - 1];

  //   const fullSpanMs = endDate.getTime() - startDate.getTime();
  //   const fullWidthPx = width - marginLeft - marginRight;
  //   const basePxPerMs = fullWidthPx / fullSpanMs;
  //   const basePxPerMin = basePxPerMs * 60 * 1000;

  //   const maxZoomPxPerMin = MIN_PX_PER_TICK / finestInterval.minutes;
  //   const maxConstraintZoom = maxZoomPxPerMin / basePxPerMin + 1;

  //   const minZoomPxPerMin = MIN_PX_PER_TICK / notFinestInterval.minutes;
  //   const minConstraintZoom = minZoomPxPerMin / basePxPerMin;

  //   // Map constraint zoom to user zoom (1 to maxConstraintZoom)
  //   const userMaxZoom = maxConstraintZoom;
  //   const userMinZoom = 1;

  //   return {
  //     userMinZoom,
  //     userMaxZoom,
  //     minConstraintZoom,
  //     maxConstraintZoom,
  //     constraint,
  //     basePxPerMin,
  //   };
  // };

  const calculateZoomExtent = () => {
    const constraint = getActiveConstraint();
    const allowedIntervals = getAllowedIntervals(constraint);

    // Finest = minimum minutes (highest px/min)
    const finestInterval = allowedIntervals[0];

    // Coarsest = maximum minutes (lowest px/min)
    const coarsestInterval = allowedIntervals[allowedIntervals.length - 1];

    // px/min needed for each interval
    const pxPerMinFinest = MIN_PX_PER_TICK / finestInterval.minutes;
    const pxPerMinCoarsest = MIN_PX_PER_TICK / coarsestInterval.minutes;

    // Raw constraint zoom values
    const rawMax = pxPerMinFinest / basePxPerMinRef.current;
    const rawMin = pxPerMinCoarsest / basePxPerMinRef.current;

    // Normalize so min = 1
    const minConstraintZoom = 1;
    const maxConstraintZoom = rawMax / rawMin;

    // User zoom exactly mirrors constraint zoom
    const userMinZoom = 1;
    const userMaxZoom = maxConstraintZoom;

    return {
      userMinZoom,
      userMaxZoom,
      minConstraintZoom,
      maxConstraintZoom,
      constraint,
    };
  };

  // const handleIntervalChange = (intervalKey: string) => {
  //   if (
  //     !zoomBehaviorRef.current ||
  //     !svgSelectionRef.current ||
  //     !xScaleRef.current
  //   )
  //     return;

  //   const targetInterval = intervals.find((i) => i.key === intervalKey);
  //   if (!targetInterval) return;

  //   const { userMinZoom, userMaxZoom, minConstraintZoom, maxConstraintZoom } =
  //     calculateZoomExtent();

  //   // Calculate constraint zoom needed
  //   const targetPxPerMin = MIN_PX_PER_TICK / targetInterval.minutes;
  //   let targetConstraintZoom = targetPxPerMin / basePxPerMinRef.current;
  //   targetConstraintZoom = targetConstraintZoom * 1.05;
  //   targetConstraintZoom = Math.max(
  //     minConstraintZoom,
  //     Math.min(maxConstraintZoom, targetConstraintZoom)
  //   );

  //   // Map to user zoom
  //   let targetUserZoom = mapConstraintToZoom(
  //     targetConstraintZoom,
  //     minConstraintZoom,
  //     maxConstraintZoom
  //   );

  //   targetUserZoom = Math.min(
  //     userMaxZoom,
  //     Math.max(userMinZoom, targetUserZoom)
  //   );

  //   // --- FINAL PRECISION FIX ---
  //   // Round the final calculated user zoom to a high number of decimals (e.g., 8)
  //   const PRECISION_FACTOR = 100000000;
  //   targetUserZoom =
  //     Math.round(targetUserZoom * PRECISION_FACTOR) / PRECISION_FACTOR;
  //   // ---------------------------

  //   const pivotSvgX = pivotPositionRef.current + marginLeft;

  //   setSelectedInterval(intervalKey);

  //   // LOCK the zoomed listener
  //   isProgrammaticZoomRef.current = true;

  //   svgSelectionRef.current
  //     .transition()
  //     .duration(500)
  //     .call(zoomBehaviorRef.current.scaleTo, targetUserZoom, [pivotSvgX, 0])
  //     .on("end", () => {
  //       isProgrammaticZoomRef.current = false;
  //     });
  // };

  const { sendToReactNative } = useRNBridge();

  // const handleIntervalChange = (intervalKey: string) => {
  //   if (
  //     !zoomBehaviorRef.current ||
  //     !svgSelectionRef.current ||
  //     !xScaleRef.current
  //   )
  //     return;

  //   const targetInterval = intervals.find((i) => i.key === intervalKey);
  //   if (!targetInterval) return;

  //   const { userMinZoom, userMaxZoom, minConstraintZoom, maxConstraintZoom } =
  //     calculateZoomExtent();

  //   const allowedIntervals = getAllowedIntervals(activeConstraint);
  //   const targetIdx = allowedIntervals.findIndex((i) => i.key === intervalKey);

  //   // Calculate the exact px/min needed for this interval
  //   const targetPxPerMin = MIN_PX_PER_TICK / targetInterval.minutes;

  //   // Convert to constraint zoom
  //   let targetConstraintZoom = targetPxPerMin / basePxPerMinRef.current;

  //   // Dynamic buffer: larger buffer for higher zoom levels
  //   // This compensates for accumulated floating-point errors
  //   const zoomRatio = targetConstraintZoom / minConstraintZoom;
  //   const dynamicBuffer = 1.02 + (zoomRatio > 5 ? 0.02 : 0.01);

  //   targetConstraintZoom = targetConstraintZoom * dynamicBuffer;

  //   // Clamp to constraint bounds
  //   targetConstraintZoom = Math.max(
  //     minConstraintZoom,
  //     Math.min(maxConstraintZoom, targetConstraintZoom)
  //   );

  //   // Map to user zoom
  //   let targetUserZoom = mapConstraintToZoom(
  //     targetConstraintZoom,
  //     minConstraintZoom,
  //     maxConstraintZoom
  //   );

  //   // Clamp to user zoom bounds
  //   targetUserZoom = Math.max(
  //     userMinZoom,
  //     Math.min(userMaxZoom, targetUserZoom)
  //   );

  //   const pivotSvgX = pivotPositionRef.current + marginLeft;

  //   // Update selected interval immediately
  //   setSelectedInterval(intervalKey);
  //   lastSelectedIntervalRef.current = intervalKey;

  //   // LOCK the zoomed listener
  //   isProgrammaticZoomRef.current = true;

  //   svgSelectionRef.current
  //     .transition()
  //     .duration(500)
  //     .call(zoomBehaviorRef.current.scaleTo, targetUserZoom, [pivotSvgX, 0])
  //     .on("end", () => {
  //       isProgrammaticZoomRef.current = false;

  //       // Verify we reached the target interval
  //       const transform = d3.zoomTransform(svgSelectionRef.current.node());
  //       const xz = transform.rescaleX(xScaleRef.current);
  //       const visibleDomain = xz.domain();
  //       const spanMs = visibleDomain[1].getTime() - visibleDomain[0].getTime();
  //       const pixelWidth = width - marginLeft - marginRight;
  //       const finalPxPerMin = pixelWidth / (spanMs / (1000 * 60));
  //       const finalInterval = getInterval(finalPxPerMin, activeConstraint);

  //       if (finalInterval.key !== intervalKey) {
  //         sendToReactNative(
  //           "data",
  //           `Target interval ${intervalKey} not reached. Got ${
  //             finalInterval.key
  //           }
  //           Target px/min: ${targetPxPerMin.toFixed(
  //             2
  //           )}, Final px/min: ${finalPxPerMin.toFixed(2)},,
  //           Width: ${width}, Buffer used: ${dynamicBuffer.toFixed(3)}`,
  //           null
  //         );
  //       }
  //     });
  // };

  const handleIntervalChange = (intervalKey: string) => {
    if (
      !zoomBehaviorRef.current ||
      !svgSelectionRef.current ||
      !xScaleRef.current
    )
      return;

    const targetInterval = intervals.find((i) => i.key === intervalKey);
    if (!targetInterval) return;

    const { userMinZoom, userMaxZoom, minConstraintZoom, maxConstraintZoom } =
      calculateZoomExtent();

    // Calculate the exact px/min needed for this interval
    const targetPxPerMin = MIN_PX_PER_TICK / targetInterval.minutes;

    // Convert to constraint zoom
    let targetConstraintZoom = targetPxPerMin / basePxPerMinRef.current;

    // === DYNAMIC BUFFER FIX ===
    // The buffer needs to increase as we zoom out (coarser intervals)
    // because numerical precision errors compound at lower zoom levels

    // const minAllowedPxPerMin = MIN_PX_PER_TICK / 1440; // 1 day = coarsest typical
    const minAllowedPxPerMin = MIN_PX_PER_TICK / 1180; // 1 day = coarsest typical
    // const zoomRatio = targetConstraintZoom / minConstraintZoom;
    const proximityRatio = targetPxPerMin / minAllowedPxPerMin;

    let dynamicBuffer;

    if (proximityRatio < 1.05) {
      // Target is within 5% of the absolute coarsest limit (e.g., 12h)
      // Needs the largest buffer due to compounding floating-point errors.
      dynamicBuffer = 1.15;
    } else if (proximityRatio < 1.5) {
      // Slightly finer, but still coarse (e.g., 6h interval)
      dynamicBuffer = 1.1;
    } else if (proximityRatio < 5) {
      // Moderate zoom-in
      dynamicBuffer = 1.06;
    } else {
      // Finest intervals (high zoom-in)
      dynamicBuffer = 1.03;
    }

    // For coarse zooms (< 1.5x), use larger buffer
    // For fine zooms (> 5x), use smaller buffer
    // let dynamicBuffer;
    // if (zoomRatio < 1.2) {
    //   dynamicBuffer = 1.15; // Coarsest intervals need 15% buffer
    // } else if (zoomRatio < 2) {
    //   dynamicBuffer = 1.1;
    // } else if (zoomRatio < 5) {
    //   dynamicBuffer = 1.06;
    // } else {
    //   dynamicBuffer = 1.03; // Finest intervals need less buffer
    // }

    targetConstraintZoom = targetConstraintZoom * dynamicBuffer;

    // Clamp to constraint bounds
    targetConstraintZoom = Math.max(
      minConstraintZoom,
      Math.min(maxConstraintZoom, targetConstraintZoom)
    );

    // Map to user zoom
    let targetUserZoom = mapConstraintToZoom(
      targetConstraintZoom,
      minConstraintZoom,
      maxConstraintZoom
    );

    // Clamp to user zoom bounds
    targetUserZoom = Math.max(
      userMinZoom,
      Math.min(userMaxZoom, targetUserZoom)
    );

    const pivotSvgX = pivotPositionRef.current + marginLeft;

    // Update selected interval immediately
    setSelectedInterval(intervalKey);
    lastSelectedIntervalRef.current = intervalKey;

    // LOCK the zoomed listener
    isProgrammaticZoomRef.current = true;

    svgSelectionRef.current
      .transition()
      .duration(500)
      .call(zoomBehaviorRef.current.scaleTo, targetUserZoom, [pivotSvgX, 0])
      .on("end", () => {
        isProgrammaticZoomRef.current = false;

        // Verify we reached the target interval
        const transform = d3.zoomTransform(svgSelectionRef.current.node());
        const xz = transform.rescaleX(xScaleRef.current);
        const visibleDomain = xz.domain();
        const spanMs = visibleDomain[1].getTime() - visibleDomain[0].getTime();
        const pixelWidth = width - marginLeft - marginRight;
        const finalPxPerMin = pixelWidth / (spanMs / (1000 * 60));
        const finalInterval = getInterval(finalPxPerMin, activeConstraint);

        if (finalInterval.key !== intervalKey) {
          sendToReactNative(
            "data",
            `Target interval ${intervalKey} not reached. Got ${
              finalInterval.key
            }
            Target px/min: ${targetPxPerMin.toFixed(
              2
            )}, Final px/min: ${finalPxPerMin.toFixed(2)},,
            Width: ${width}, Buffer used: ${dynamicBuffer.toFixed(3)}`,
            null
          );
        }

        // If we didn't reach target, try again with a larger buffer
        if (finalInterval.key !== intervalKey) {
          const retryBuffer = dynamicBuffer * 1.08; // Add 8% more to retry
          let retryConstraintZoom =
            (targetPxPerMin / basePxPerMinRef.current) * retryBuffer;
          retryConstraintZoom = Math.max(
            minConstraintZoom,
            Math.min(maxConstraintZoom, retryConstraintZoom)
          );

          let retryUserZoom = mapConstraintToZoom(
            retryConstraintZoom,
            minConstraintZoom,
            maxConstraintZoom
          );
          retryUserZoom = Math.max(
            userMinZoom,
            Math.min(userMaxZoom, retryUserZoom)
          );

          isProgrammaticZoomRef.current = true;
          svgSelectionRef.current
            .transition()
            .duration(300)
            .call(zoomBehaviorRef.current.scaleTo, retryUserZoom, [
              pivotSvgX,
              0,
            ])
            .on("end", () => {
              isProgrammaticZoomRef.current = false;
            });
        }
      });
  };

  // const handleIntervalChange = (intervalKey: string) => {
  //   if (
  //     !zoomBehaviorRef.current ||
  //     !svgSelectionRef.current ||
  //     !xScaleRef.current
  //   )
  //     return;

  //   targetKey.current = intervalKey;
  //   const currentInterval = intervals.find(
  //     (i) => i.key === lastSelectedIntervalRef.current
  //   );
  //   const targetInterval = intervals.find((i) => i.key === intervalKey);
  //   if (currentInterval?.minutes! > targetInterval?.minutes!) {
  //     isZoomingRef.current = "in";
  //   } else {
  //     isZoomingRef.current = "out";
  //   }

  //   if (!targetInterval) return;

  //   // ALWAYS use the same basePxPerMin used everywhere else
  //   // const basePxPerMin = basePxPerMinRef.current;

  //   const { userMinZoom, userMaxZoom, minConstraintZoom, maxConstraintZoom } =
  //     calculateZoomExtent();

  //   // Compute required px/min for this interval
  //   const targetPxPerMin = MIN_PX_PER_TICK / targetInterval.minutes;

  //   // Convert px/min → constraintZoom
  //   let targetConstraintZoom = targetPxPerMin / basePxPerMinRef.current;

  //   // Clamp to valid range
  //   targetConstraintZoom = Math.min(
  //     maxConstraintZoom,
  //     Math.max(minConstraintZoom, targetConstraintZoom)
  //   );

  //   // Convert constraintZoom → userZoom using D3 mapping
  //   let targetUserZoom = mapConstraintToZoom(
  //     targetConstraintZoom,
  //     minConstraintZoom,
  //     maxConstraintZoom
  //   );

  //   // Clamp to user zoom range
  //   targetUserZoom = Math.min(
  //     userMaxZoom,
  //     Math.max(userMinZoom, targetUserZoom)
  //   );

  //   const EPSILON = 0.01; // Tolerance threshold

  //   if (Math.abs(targetUserZoom - userMinZoom) < EPSILON) {
  //     targetUserZoom = userMinZoom;
  //   } else if (Math.abs(targetUserZoom - userMaxZoom) < EPSILON) {
  //     targetUserZoom = userMaxZoom;
  //   } else {
  //     // For intermediate values, round to 6 decimal places to kill trailing 0.000000001 noise
  //     targetUserZoom = Math.round(targetUserZoom * 1000000) / 1000000;
  //   }

  //   console.log(targetUserZoom, "-----------zoom");

  //   const pivotSvgX = pivotPositionRef.current + marginLeft;

  //   setSelectedInterval(intervalKey);

  //   // Prevent zoomed() from reacting
  //   isProgrammaticZoomRef.current = true;

  //   svgSelectionRef.current
  //     .transition()
  //     .duration(450)
  //     .call(zoomBehaviorRef.current.scaleTo, targetUserZoom, [pivotSvgX, 0])
  //     .on("end", () => {
  //       isProgrammaticZoomRef.current = false;
  //     });
  // };

  const runD3TimelineRender = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const x = d3
      .scaleUtc()
      .domain([startDate, endDate])
      .range([marginLeft, width - marginRight]);

    const activeConstraint = getActiveConstraint();
    const {
      userMinZoom: minZoom,
      userMaxZoom: maxZoom,
      maxConstraintZoom,
      minConstraintZoom,
    } = calculateZoomExtent();

    const xAxis = (g: any, x: any) => {
      const domain = x.domain();
      const range = x.range();
      const spanMs = domain[1] - domain[0];
      const pixelWidth = range[1] - range[0];
      const pxPerMin = pixelWidth / (spanMs / (1000 * 60));
      const currentInterval = getInterval(pxPerMin, activeConstraint);
      const tickValues = x.ticks(currentInterval.interval);

      const axis = d3
        .axisBottom(x)
        .tickValues(tickValues)
        .tickSizeOuter(0)
        .tickFormat(currentInterval.format as any);

      g.call(axis);

      g.selectAll("line")
        .attr("stroke", COLORS.black)
        .attr("stroke-width", 1.5)
        .attr("y2", 10);

      // Remove default text elements
      g.selectAll("text").remove();

      const fullRangeTicks = currentInterval.interval.range(startDate, endDate);

      // Add custom two-line text for intervals that need it
      g.selectAll(".tick").each(function (this: any, d: any, i: number) {
        const tick = d3.select(this);
        const existingText = tick.select("text.tick-label");

        // Find the global index of this tick in the full range
        const tickDate = new Date(d);
        const globalIndex = fullRangeTicks.findIndex(
          (t) => t.getTime() === tickDate.getTime()
        );

        const shouldShow = (() => {
          switch (intervalVariant) {
            case "all":
              return true;
            case "even":
              return globalIndex % 2 === 0;
            case "adjust":
              return tickGapRef.current < minTickGap
                ? globalIndex % 2 === 0
                : true;
            default:
              return true;
          }
        })();

        if (!shouldShow) return;

        const text = tick
          .append("text")
          .attr("y", -10)
          .style("text-anchor", "middle")
          .style("font-size", "12px")
          .style("fill", COLORS.black);

        // Check if we need two lines (for 6h, 12h, 1d intervals)
        if (needTwoLineLabel) {
          const date = new Date(d);
          const datePart = d3.timeFormat("%m/%d")(date);
          const timePart = d3.timeFormat("%I:%M %p")(date);

          text
            .append("tspan")
            .attr("x", 0)
            .attr("dy", "-0.5em") //add space between the tick an label
            .text(datePart);

          text
            .append("tspan")
            .attr("x", 0)
            .attr("dy", "1.1em") // Move to next line
            .text(timePart);
        } else {
          // Single line for other intervals
          text.text(currentInterval.format(new Date(d)) as string);
        }
      });
    };

    const zoom = d3
      .zoom()
      .scaleExtent([minZoom, maxZoom])
      .on("start", () => {
        // setIsZooming(true);
      })
      .extent([
        [marginLeft, 0],
        [width - marginRight, height],
      ])
      .translateExtent([
        [marginLeft, 0],
        [width - marginRight, 0],
      ])
      .on("zoom", zoomed)
      .on("end", (event: any) => {
        console.log("running");
        // setIsZooming(false);
        const xz = event.transform.rescaleX(x);
        const [visibleStart, visibleEnd] = xz.domain();
        const visibleSpanMs = visibleEnd.getTime() - visibleStart.getTime();
        const visibleWidthPx = width - marginLeft - marginRight;
        const currentPxPerMin = visibleWidthPx / (visibleSpanMs / (1000 * 60));
        const currentInterval = getInterval(currentPxPerMin, activeConstraint);

        // --- compute visible range ---
        // const [visibleStart, visibleEnd] = xz.domain();
        const range = { start: visibleStart, end: visibleEnd };
        // Generate all ticks in the full range
        const fullRangeTicks = currentInterval.interval.range(
          startDate,
          endDate
        );

        // Get visible ticks
        const visibleTicks = xz.ticks(currentInterval.interval);
        let visibleLabelTicks = [...visibleTicks];
        console.log("running 1", tickGapRef.current);
        switch (timelineConfig.intervalVariant) {
          case "all":
            // Show all visible ticks
            break;

          case "even":
            visibleLabelTicks = visibleTicks.filter((t: any, i: number) => {
              const tickDate = new Date(t);
              const globalIndex = fullRangeTicks.findIndex(
                (t) => t.getTime() === tickDate.getTime()
              );
              return globalIndex % 2 === 0;
            });
            break;

          case "adjust":
            visibleLabelTicks = visibleTicks.filter((t: any, i: number) => {
              const tickDate = new Date(t);
              const globalIndex = fullRangeTicks.findIndex(
                (t) => t.getTime() === tickDate.getTime()
              );
              return tickGapRef.current < 80 ? globalIndex % 2 === 0 : true;
            });
        }
        console.log("running3");
        console.log("visible labels", visibleLabelTicks);

        setVisibleRange(range);
        onScrollorZoomEnd(range, {
          currentInterval: currentInterval.key,
          visibleTicks: visibleLabelTicks,
        });
        setZoomInfo((prev) => ({
          ...prev,
          current: currentInterval.key,
          currentPxPerMin: +currentPxPerMin.toFixed(4),
          totalDays: getTotalDays(),
          constraint: `${activeConstraint.maxZoomIntervalKey} - ${activeConstraint.minZoomIntervalKey}`,
          minZoom: minConstraintZoom,
          maxZoom: maxConstraintZoom,
        }));
      });

    zoomRef.current = zoom;
    zoomBehaviorRef.current = zoom;
    svgSelectionRef.current = svg;

    const gx = svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${marginTop})`)
      .call(xAxis, x);

    gxRef.current = gx;

    gx.select(".domain").remove();

    function zoomed(event: any) {
      const userZoom = event.transform.k;

      // Map user zoom to constraint zoom for calculations
      const constraintZoom = mapZoomToConstraint(
        userZoom,
        minConstraintZoom,
        maxConstraintZoom
      );
      const xz = event.transform.rescaleX(x);
      xScaleRef.current = xz;

      gx.call(xAxis, xz);
      gx.select(".domain").remove();

      const visibleDomain = xz.domain();
      const visibleMs = visibleDomain[1].getTime() - visibleDomain[0].getTime();
      const visibleDays = visibleMs / (1000 * 60 * 60 * 24);
      const currentPxPerMin = basePxPerMinRef.current * constraintZoom;
      const currentInterval = getInterval(currentPxPerMin, activeConstraint);
      const allowedIntervals = getAllowedIntervals(activeConstraint);
      const isIntervalAllowed = allowedIntervals.some(
        (i) => i.key === currentInterval.key
      );

      // sendToReactNative(
      //   "data",
      //   {
      //     diff: Math.abs(userZoom - lastUserZoomRef.current),
      //     userZoom,
      //     isIntervalAllowed,
      //     currentInterval,
      //     currentPxPerMin,
      //   },
      //   "---------zoomed--------"
      // );

      if (
        !isScrollingRef.current &&
        !isProgrammaticZoomRef.current &&
        currentInterval.key !== lastSelectedIntervalRef.current &&
        isIntervalAllowed
      ) {
        setSelectedInterval(currentInterval.key);
        lastSelectedIntervalRef.current = currentInterval.key;
        lastUserZoomRef.current = userZoom;
      }

      const currentIdx = allowedIntervals.findIndex(
        (i) => i.key === currentInterval.key
      );

      const zoomInInterval =
        currentIdx > 0 ? allowedIntervals[currentIdx - 1] : null;
      const zoomOutInterval =
        currentIdx < allowedIntervals.length - 1
          ? allowedIntervals[currentIdx + 1]
          : null;

      let zoomInText = "Max zoom (constraint limit)";
      let zoomOutText = "Min zoom (constraint limit)";

      if (zoomInInterval) {
        const neededPxPerMin = MIN_PX_PER_TICK / zoomInInterval.minutes;
        const neededZoom = neededPxPerMin / basePxPerMinRef.current;
        zoomInText = `${zoomInInterval.key} (at ~${neededZoom.toFixed(1)}x)`;
      }

      if (zoomOutInterval) {
        const neededPxPerMin = MIN_PX_PER_TICK / zoomOutInterval.minutes;
        const neededZoom = neededPxPerMin / basePxPerMinRef.current;
        zoomOutText = `${zoomOutInterval.key} (at ~${neededZoom.toFixed(1)}x)`;
      }

      const isAtMinZoom = Math.abs(userZoom - minZoom) < 0.01;
      const isAtMaxZoom = Math.abs(userZoom - maxZoom) < 0.01;
      const [visibleStart, visibleEnd] = xz.domain();
      setVisibleRange({ start: visibleStart, end: visibleEnd });

      // --- compute gap between each tick label ---
      const tickValues = xz.ticks(currentInterval.interval);
      const firstTickX = xz(tickValues[0]);
      const lastTickX = xz(tickValues[tickValues.length - 1]);
      const leftGap = firstTickX - marginLeft;
      const rightGap = width - marginRight - lastTickX;
      OnEndGapChange({ left: leftGap, right: rightGap });

      if (tickValues.length >= 2) {
        const gapPx = Math.abs(xz(tickValues[1]) - xz(tickValues[0]));
        tickGapRef.current = gapPx;
        setTickGap(gapPx);
        onGapChange(gapPx);
      }

      setZoomInfo({
        current: currentInterval.key,
        currentPxPerMin: +currentPxPerMin.toFixed(4),
        zoomLevel: constraintZoom.toFixed(2),
        zoomIn: zoomInText,
        zoomOut: zoomOutText,
        visibleDays: visibleDays,
        totalDays: getTotalDays(),
        constraint: `${activeConstraint.maxZoomIntervalKey} - ${activeConstraint.minZoomIntervalKey}`,
        minZoom: minConstraintZoom,
        maxZoom: maxConstraintZoom,
        isAtMinZoom,
        isAtMaxZoom,
      });

      updateTimeline(xz);
      updatePivotDateFromScale(pivotPositionRef.current);
    }

    // function zoomed(event: any) {
    //   const userZoom = event.transform.k;

    //   // Map user zoom to constraint zoom for calculations
    //   const constraintZoom = mapZoomToConstraint(
    //     userZoom,
    //     minConstraintZoom,
    //     maxConstraintZoom
    //   );
    //   const xz = event.transform.rescaleX(x);
    //   xScaleRef.current = xz;

    //   // Use gxRef instead of local gx variable
    //   gxRef.current.call(xAxis, xz);
    //   gxRef.current.select(".domain").remove();

    //   const visibleDomain = xz.domain();
    //   const visibleMs = visibleDomain[1].getTime() - visibleDomain[0].getTime();
    //   const visibleDays = visibleMs / (1000 * 60 * 60 * 24);
    //   const currentPxPerMin = basePxPerMin * constraintZoom;
    //   const currentInterval = getInterval(currentPxPerMin, activeConstraint);
    //   const allowedIntervals = getAllowedIntervals(activeConstraint);
    //   const isIntervalAllowed = allowedIntervals.some(
    //     (i) => i.key === currentInterval.key
    //   );

    //   console.log(
    //     Math.abs(userZoom - lastUserZoomRef.current),
    //     isIntervalAllowed,
    //     "---------zoomed"
    //   );

    //   // Only update selectedInterval if not scrolling AND interval changed
    //   if (
    //     !isScrollingRef.current &&
    //     currentInterval.key !== lastSelectedIntervalRef.current &&
    //     isIntervalAllowed
    //   ) {
    //     setSelectedInterval(currentInterval.key);
    //     lastSelectedIntervalRef.current = currentInterval.key;
    //     lastUserZoomRef.current = userZoom;
    //   }

    //   const currentIdx = allowedIntervals.findIndex(
    //     (i) => i.key === currentInterval.key
    //   );

    //   const zoomInInterval =
    //     currentIdx > 0 ? allowedIntervals[currentIdx - 1] : null;
    //   const zoomOutInterval =
    //     currentIdx < allowedIntervals.length - 1
    //       ? allowedIntervals[currentIdx + 1]
    //       : null;

    //   let zoomInText = "Max zoom (constraint limit)";
    //   let zoomOutText = "Min zoom (constraint limit)";

    //   if (zoomInInterval) {
    //     const neededPxPerMin = MIN_PX_PER_TICK / zoomInInterval.minutes;
    //     const neededZoom = neededPxPerMin / basePxPerMin;
    //     zoomInText = `${zoomInInterval.key} (at ~${neededZoom.toFixed(1)}x)`;
    //   }

    //   if (zoomOutInterval) {
    //     const neededPxPerMin = MIN_PX_PER_TICK / zoomOutInterval.minutes;
    //     const neededZoom = neededPxPerMin / basePxPerMin;
    //     zoomOutText = `${zoomOutInterval.key} (at ~${neededZoom.toFixed(1)}x)`;
    //   }

    //   const isAtMinZoom = Math.abs(userZoom - minZoom) < 0.01;
    //   const isAtMaxZoom = Math.abs(userZoom - maxZoom) < 0.01;
    //   const [visibleStart, visibleEnd] = xz.domain();
    //   setVisibleRange({ start: visibleStart, end: visibleEnd });

    //   // --- compute gap between each tick label ---
    //   const tickValues = xz.ticks(currentInterval.interval);
    //   const firstTickX = xz(tickValues[0]);
    //   const lastTickX = xz(tickValues[tickValues.length - 1]);
    //   const leftGap = firstTickX - marginLeft;
    //   const rightGap = width - marginRight - lastTickX;
    //   OnEndGapChange({ left: leftGap, right: rightGap });

    //   if (tickValues.length >= 2) {
    //     const gapPx = Math.abs(xz(tickValues[1]) - xz(tickValues[0]));
    //     tickGapRef.current = gapPx;
    //     setTickGap(gapPx);
    //     onGapChange(gapPx);
    //   }

    //   setZoomInfo({
    //     current: currentInterval.key,
    //     currentPxPerMin: +currentPxPerMin.toFixed(4),
    //     zoomLevel: constraintZoom.toFixed(2),
    //     zoomIn: zoomInText,
    //     zoomOut: zoomOutText,
    //     visibleDays: visibleDays,
    //     totalDays: getTotalDays(),
    //     constraint: `${activeConstraint.maxZoomIntervalKey} - ${activeConstraint.minZoomIntervalKey}`,
    //     minZoom: minConstraintZoom,
    //     maxZoom: maxConstraintZoom,
    //     isAtMinZoom,
    //     isAtMaxZoom,
    //   });

    //   updateTimeline(xz);
    //   updatePivotDateFromScale(pivotPositionRef.current);
    // }

    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .attr("pointer-events", "all");

    const initialIntervalConfig = intervals[initialInterval];
    const targetPxPerMin = MIN_PX_PER_TICK / initialIntervalConfig.minutes;
    let initialZoomLevel = targetPxPerMin / basePxPerMinRef.current;

    initialZoomLevel = Math.max(minZoom, Math.min(maxZoom, initialZoomLevel));
    console.log(
      initialInterval,
      initialZoomLevel,
      "--------------------------initial zoom level"
    );

    let centerDate: Date;
    switch (scrollTo) {
      case "start":
        centerDate = startDate;
        break;
      case "middle":
        centerDate = new Date((startDate.getTime() + endDate.getTime()) / 2);
        break;
      case "end":
        centerDate = endDate;
        break;
      default:
        centerDate = new Date((startDate.getTime() + endDate.getTime()) / 2);
    }

    xScaleRef.current = x;
    const initialPivotX = (width - marginLeft - marginRight) / 2;
    setPivotPosition(initialPivotX);
    pivotPositionRef.current = initialPivotX;
    precisePivotRef.current = initialPivotX;
    svg.call(zoom as any);

    const applyInitialZoom = () => {
      const zoomTarget = [x(centerDate) - marginLeft, 0];

      const shouldAnimate =
        animateInitialRender && !hasCompletedInitialLoadRef.current;

      if (shouldAnimate) {
        console.log("this block run");
        svg
          .transition()
          .duration(800)
          .ease(d3.easeCubicOut)
          .call(zoom.scaleTo as any, initialZoomLevel, zoomTarget)
          .on("end", () => {
            finalizeInitialZoom();
            hasCompletedInitialLoadRef.current = true;
          });
      } else {
        svg
          .call(zoom.scaleTo as any, initialZoomLevel, zoomTarget)
          .on("end", () => {
            finalizeInitialZoom();
            hasCompletedInitialLoadRef.current = true;
          });
        finalizeInitialZoom();
        hasCompletedInitialLoadRef.current = true;
      }
    };

    const finalizeInitialZoom = () => {
      const currentScale = d3.zoomTransform(svg.node()!).rescaleX(x);
      xScaleRef.current = currentScale;
      updatePivotDateFromScale(pivotPositionRef.current);

      const visibleDomain = currentScale.domain();
      const spanMs = visibleDomain[1].getTime() - visibleDomain[0].getTime();
      const pixelWidth = width - marginLeft - marginRight;
      const pxPerMin = pixelWidth / (spanMs / (1000 * 60));
      const currentInterval = getInterval(pxPerMin, activeConstraint);
      const allowedIntervals = getAllowedIntervals(activeConstraint);
      const isIntervalAllowed = allowedIntervals.some(
        (i) => i.key === currentInterval.key
      );
      if (isIntervalAllowed) {
        setSelectedInterval(currentInterval.key);
      }
      setZoomInfo((prev) => ({ ...prev, current: currentInterval.key }));
    };

    // const finalizeInitialZoom = () => {
    //   const svgNode = svgSelectionRef.current.node();
    //   if (!svgNode) return;

    //   const transform = d3.zoomTransform(svgNode);
    //   const xz = transform.rescaleX(x);

    //   // Update scale reference
    //   xScaleRef.current = xz;

    //   // Update pivot
    //   updatePivotDateFromScale(pivotPositionRef.current);

    //   // --- Compute visible range ---
    //   const [visibleStart, visibleEnd] = xz.domain();
    //   const range = { start: visibleStart, end: visibleEnd };

    //   // --- Compute px/min ---
    //   const spanMs = visibleEnd.getTime() - visibleStart.getTime();
    //   const pixelWidth = width - marginLeft - marginRight;
    //   const pxPerMin = pixelWidth / (spanMs / (1000 * 60));

    //   const activeConstraint = getActiveConstraint();
    //   const currentInterval = getInterval(pxPerMin, activeConstraint);

    //   // Allowed intervals
    //   const allowedIntervals = getAllowedIntervals(activeConstraint);
    //   const isIntervalAllowed = allowedIntervals.some(
    //     (i) => i.key === currentInterval.key
    //   );

    //   if (isIntervalAllowed) {
    //     setSelectedInterval(currentInterval.key);
    //   }

    //   // Prepare visible ticks
    //   const visibleTicks = xz.ticks(currentInterval.interval);
    //   let visibleLabelTicks = [...visibleTicks];

    //   // Apply same label filter logic used during zoomed()
    //   const fullRangeTicks = currentInterval.interval.range(startDate, endDate);
    //   switch (timelineConfig.intervalVariant) {
    //     case "even":
    //       visibleLabelTicks = visibleTicks.filter((t: any) => {
    //         const tickDate = new Date(t);
    //         const globalIndex = fullRangeTicks.findIndex(
    //           (tt) => tt.getTime() === tickDate.getTime()
    //         );
    //         return globalIndex % 2 === 0;
    //       });
    //       break;

    //     case "adjust":
    //       visibleLabelTicks = visibleTicks.filter((t: any) => {
    //         const tickDate = new Date(t);
    //         const globalIndex = fullRangeTicks.findIndex(
    //           (tt) => tt.getTime() === tickDate.getTime()
    //         );
    //         return tickGapRef.current < 80 ? globalIndex % 2 === 0 : true;
    //       });
    //       break;

    //     default:
    //       break;
    //   }

    //   // --- Update zoom info ---
    //   setZoomInfo((prev) => ({
    //     ...prev,
    //     current: currentInterval.key,
    //   }));

    //   // --- FINAL: Call onScrollorZoomEnd (Your pan/scroll end function) ---
    //   onScrollorZoomEnd(range, {
    //     currentInterval: currentInterval.key,
    //     visibleTicks: visibleLabelTicks,
    //   });
    // };

    // requestAnimationFrame(applyInitialZoom);
    // if (!hasInitialZoomAppliedRef.current) {
    //   applyInitialZoom();
    //   hasInitialZoomAppliedRef.current = true;
    // }
    applyInitialZoom();

    updateTimeline(x);
  };
  function updateTimeline(scale: any) {
    if (!timelineRef.current) return;

    timelineRef.current.innerHTML = "";

    const visibleDomain = scale.domain();
    const bufferMs =
      (visibleDomain[1].getTime() - visibleDomain[0].getTime()) * 0.2;
    const minVisible = new Date(visibleDomain[0].getTime() - bufferMs);
    const maxVisible = new Date(visibleDomain[1].getTime() + bufferMs);

    colorBlocks.forEach((block) => {
      if (block.end < minVisible || block.start > maxVisible) {
        return;
      }

      const startPos = scale(block.start);
      const endPos = scale(block.end);
      const leftPos = startPos - marginLeft;
      const blockWidth = endPos - startPos;

      if (endPos >= marginLeft && startPos <= width - marginRight) {
        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.left = `${leftPos}px`;
        div.style.width = `${blockWidth}px`;
        div.style.height = "100%";
        div.style.backgroundColor = block.color;

        div.style.boxSizing = "border-box";
        timelineRef.current!.appendChild(div);
      }
    });
  }

  useEffect(() => {
    sendToReactNative(
      "data",
      { data: "Updating the timeline mode", mode: isNormalSubMode },
      null
    );
    updateTimeline(xScaleRef.current);
  }, [isNormalSubMode, data]);

  useEffect(() => {
    if (internalLoading) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!svgRef.current || colorBlocks.length === 0 || width === 0) return;

        runD3TimelineRender();
      });
    });
  }, [startDate, endDate, width, internalLoading]);

  useEffect(() => {
    hasInitialZoomAppliedRef.current = false;
  }, [startDate, endDate]);

  function updatePivotDateFromScale(position: number) {
    if (xScaleRef.current) {
      const svgX = position + marginLeft;
      const date = xScaleRef.current.invert(svgX);
      setPivotDate(date);
    }
  }

  const handlePivotStart = (clientX: number) => {
    setIsDragging(true);
    setDragStartX(clientX);
    setDragStartPivot(precisePivotRef.current);
  };

  const handlePivotMove = (clientX: number) => {
    if (!isDragging || !containerRef.current) return;

    const deltaX = clientX - dragStartX;
    const maxX = width - marginLeft - marginRight;
    const newPosition = Math.max(0, Math.min(dragStartPivot + deltaX, maxX));

    setPivotPosition(newPosition);
    precisePivotRef.current = newPosition;
    updatePivotDateFromScale(newPosition);
  };

  const handlePivotEnd = () => {
    setIsDragging(false);
  };

  const formatPivotDate = (date: Date) => {
    return d3.timeFormat("%m/%d/%Y, %I:%M %p")(date);
  };

  const scrollTimeline = (direction: "left" | "right", px: number) => {
    // Safety: we need the svg element, the current zoom behavior, and the zoom transform to exist.
    if (!svgRef.current || !zoomRef.current) return;

    // Use d3 to select the svg node (we will call the zoom's translateBy via d3.call)
    const svg = d3.select(svgRef.current);

    // dx is positive to move content right (visible window shifts left),
    // and negative to move content left (visible window shifts right).
    // When user clicks "left" arrow we want to move the visible window earlier in time,
    // so we translate by (+px). For "right" arrow we translate by (-px).
    const dx = direction === "left" ? px : -px;
    isScrollingRef.current = true;
    // Use the built-in translateBy operation on the zoom behavior.
    // This will:
    //  - compute a new transform (current transform + dx)
    //  - apply scale (no change in k)
    //  - respect translateExtent and scaleExtent automatically
    //  - update internal zoom state so subsequent zoom events remain consistent
    svg
      .transition() // animate the pan so it feels smooth
      .duration(300)
      // call the zoom behavior's translateBy (note: zoomRef.current is the zoom behavior)
      .call((zoomRef.current as any).translateBy as any, dx, 0)
      .on("end", () => {
        //         // After scroll completes, allow interval updates again
        isScrollingRef.current = false;
      });
  };

  const isScrollingRef = useRef<boolean>(false);

  const activeConstraint = getActiveConstraint();
  const allowedIntervals = getAllowedIntervals(activeConstraint);

  return (
    <div className="flex flex-col items-center overflow-hidden">
      {!internalLoading && (
        <div className="mb-4 p-4 bg-white rounded-lg shadow-md text-sm font-mono w-full border border-gray-200 hidden">
          <div className="grid grid-cols-4 gap-4 mb-3">
            <div>
              <div className="text-blue-600 font-bold text-lg mb-1">
                {zoomInfo.current}
              </div>
              <div className="text-gray-600 text-xs">
                Zoom: {zoomInfo.zoomLevel}x | {zoomInfo.currentPxPerMin} px/min
              </div>
            </div>
            <div className="text-green-600">
              <div className="font-semibold">⬅ Zoom In to:</div>
              <div className="text-xs">{zoomInfo.zoomIn}</div>
            </div>
            <div className="text-orange-600">
              <div className="font-semibold">Zoom Out to: ➡</div>
              <div className="text-xs">{zoomInfo.zoomOut}</div>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-xs">
                Select Zoom Level:
              </label>
              <select
                value={selectedInterval}
                onChange={(e) => handleIntervalChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer"
              >
                {allowedIntervals.map((interval) => (
                  <option key={interval.key} value={interval.key}>
                    {interval.key}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-200 grid grid-cols-2 gap-4">
            <div className="text-purple-600">
              <div className="font-semibold">Timeline Span:</div>
              <div className="text-xs">
                Total: {zoomInfo.totalDays.toFixed(1)} days | Visible:{" "}
                {zoomInfo.visibleDays.toFixed(1)} days
              </div>
            </div>
            <div className="text-indigo-600">
              <div className="font-semibold">Active Constraint:</div>
              <div className="text-xs">
                {zoomInfo.constraint} (for ≤{getTotalDays().toFixed(0)} day
                timeline)
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="w-full relative px-11.5 mb-5">
        <div className="py-2.5 w-full border-t border-[#8D8A9D] bg-lavenderMistLight px-3 flex justify-between items-center ">
          <div className="text-sm text-black-primary">{getHeaderDate()}</div>
          <div className="flex gap-4 items-center">
            {zoomInfo.isAtMaxZoom && (
              <p className="text-darkViolet text-xs font-bold mr-2">
                Max Zoom Reached
              </p>
            )}
            {zoomInfo.isAtMinZoom && (
              <p className="text-darkViolet text-xs font-bold mr-2">
                Min Zoom Reached
              </p>
            )}
            <div className="flex gap-2 items-center">
              <Checkbox
                className="h-3 w-3"
                id={"sub-mode"}
                checked={isNormalSubMode}
                onCheckedChange={(val) => {
                  onModeChange(!!val);
                }}
              />
              <label htmlFor="sub-mode" className="text-xs text-black-primary">
                Normal Sub-Mode
              </label>
            </div>
            <div className="relative">
              <Select
                disabled={loading}
                value={selectedInterval}
                onValueChange={(val) => {
                  handleIntervalChange(val);
                }}
              >
                <SelectTrigger className="w-24! h-10! bg-white">
                  <SelectValue placeholder="Zoom" />
                </SelectTrigger>

                <SelectContent
                  align="end"
                  // className=""
                  // side="bottom"
                  // sideOffset={4}
                  // avoidCollisions={false}
                  //  align="end"
                  side="bottom"
                  sideOffset={4}
                  avoidCollisions={false}
                  position="popper"
                  className="z-999 absolute -top-2 right-0"
                >
                  {allowedIntervals.map((interval) => (
                    <SelectItem key={interval.key} value={interval.key}>
                      {interval.key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
      <div className="relative w-full flex items-center px-6">
        <div className="w-full" ref={initialWidthRef}></div>
      </div>
      {internalLoading ? (
        <>
          <div className="px-11.5 relative w-full">
            <Skeleton
              className={`w-full rounded-none mb-2`}
              style={{ height: height }}
            />

            <Skeleton
              className={`w-full rounded-none`}
              style={{ height: height }}
            />
          </div>
        </>
      ) : (
        <div className="relative w-full flex items-center px-6">
          <button
            className="h-12 w-6 border border-midnightBlue rounded-l-md bg-white hover:bg-neutral-400 absolute top-12 left-4 z-9999 flex justify-center items-center"
            onClick={() => scrollTimeline("left", 120)}
          >
            <LeftIcon />
          </button>
          <div
            className="bg-white w-full relative"
            ref={containerRef}
            // onMouseMove={handleMouseMove}
            // onMouseUp={handleMouseUp}
            // onMouseLeave={handleMouseUp}
            onMouseMove={(e) => handlePivotMove(e.clientX)}
            onTouchMove={(e) => handlePivotMove(e.touches[0].clientX)}
            onMouseLeave={(e) => handlePivotEnd()}
            style={{ cursor: isDragging ? "grabbing" : "default" }}
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${width} ${height}`}
              width={width}
              height={height}
              style={{
                maxWidth: "100%",
                height: "auto",
                display: "block",
              }}
            />

            <div
              className={`absolute top-12 bg-[#7c79b2] h-4`}
              style={{
                width: `${width - marginLeft - marginRight}px`,
                height: `${timelineHeight}px`,
                marginLeft: `${marginLeft}px`,
                //   marginTop: "10px",

                overflow: "hidden",
                pointerEvents: "none",
              }}
              ref={timelineRef}
            />

            <div
              className="absolute"
              style={{
                left: `${marginLeft + pivotPosition}px`,
                top: "0",
                bottom: "0",
                width: "1px",
                backgroundColor: "transparent",
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
              <div className="absolute top-3 bottom-0 w-full bg-ashBrown h-[90%]" />

              <div
                className="absolute"
                style={{
                  top: "-1px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "0",
                  height: "0",
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: `8px solid ${COLORS.ashBrown}`,
                }}
              />

              <div
                className="absolute"
                style={{
                  bottom: "-1px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "0",
                  height: "0",
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderBottom: `8px solid ${COLORS.ashBrown}`,
                }}
              />
            </div>

            <div
              className="absolute bg-lavenderMist border border-violet-500 rounded-full shadow-lg px-3 py-0.5"
              style={{
                left: `${marginLeft + pivotPosition}px`,
                top: "-35px",
                transform: "translateX(-50%)",
                pointerEvents: "auto",
                zIndex: 99999,
                userSelect: "none",
                cursor: isDragging ? "grabbing" : "grab",
              }}
              // onMouseDown={handlePivotMouseDown}
              onMouseDown={(e) => handlePivotStart(e.clientX)}
              onTouchStart={(e) => handlePivotStart(e.touches[0].clientX)}
            >
              <div className="text-[10px] text-gray-700 whitespace-nowrap flex items-center gap-2 z-[9999]">
                <span className="text-violet-500">
                  {formatPivotDate(pivotDate)}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("calendar clicked");
                    onCalendarClick();
                  }}
                  className=""
                >
                  <CalendarIcon />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    console.log("calendar clicked");
                    onReloadClick();
                  }}
                  className="p-1"
                >
                  <RotateCw size={16} className="rotate-90" />
                </button>
              </div>
            </div>
            {/* place for image*/}
            <div
              className={`h-32 w-full relative`}
              style={{ paddingLeft: marginLeft, paddingRight: marginRight }}
            >
              {/* <div className="bg-yellow-200 h-full w-full"></div> */}
              {loadingSpectrogram ? (
                <Skeleton className="h-full w-full rounded-none" />
              ) : (
                ""
              )}
              {spectrogram && (
                <img
                  src={spectrogram}
                  alt="spectrogram image"
                  className="w-full h-full"
                />
              )}
            </div>
          </div>
          <button
            className="h-12 w-6 border border-midnightBlue rounded-r-md bg-white hover:bg-neutral-400 absolute top-12 right-4 flex justify-center items-center"
            onClick={() => scrollTimeline("right", 120)}
          >
            <RightIcon />
          </button>
        </div>
      )}

      {!loading && (
        <div className="mt-4 w-full space-y-3 hidden">
          <div className="text-sm text-gray-600 text-center mb-3">
            Scroll to zoom, drag to pan, or use the dropdown to select a zoom
            level. Drag the tooltip to move the pivot line.
            <br />
            <span className="text-xs text-gray-500">
              Zoom constraints are fixed based on total timeline span (
              {getTotalDays().toFixed(1)} days)
            </span>
          </div>

          {/* Min Zoom Reached Indicator */}
          {zoomInfo.isAtMinZoom && (
            <div className="mx-auto max-w-md flex items-center gap-3 px-4 py-3 bg-red-100 border-2 border-red-500 rounded-lg shadow-lg">
              <span className="text-3xl">📍</span>
              <div>
                <p className="text-sm font-bold text-red-800">
                  Minimum Zoom Reached
                </p>
                <p className="text-xs text-red-700">
                  Viewing entire timeline at {zoomInfo.minZoom.toFixed(2)}x zoom
                </p>
              </div>
            </div>
          )}

          {/* Max Zoom Reached Indicator */}
          {zoomInfo.isAtMaxZoom && (
            <div className="mx-auto max-w-md flex items-center gap-3 px-4 py-3 bg-green-100 border-2 border-green-500 rounded-lg shadow-lg">
              <span className="text-3xl">🔍</span>
              <div>
                <p className="text-sm font-bold text-green-800">
                  Maximum Zoom Reached
                </p>
                <p className="text-xs text-green-700">
                  At finest detail level at {zoomInfo.maxZoom.toFixed(2)}x zoom
                </p>
              </div>
            </div>
          )}

          {/* Zoom Range Display */}
          <div className="flex items-center justify-center gap-4 px-4">
            <span className="text-xs text-gray-600 font-semibold">
              Zoom Level:
            </span>
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border-2 border-gray-300">
              <span className="text-xs font-mono bg-red-100 px-3 py-1 rounded text-red-700 font-bold">
                Min: {zoomInfo.minZoom.toFixed(2)}x
              </span>
              <span className="text-xs text-gray-400 font-bold">|</span>
              <span className="text-xs font-mono bg-blue-100 px-3 py-1 rounded text-blue-700 font-bold">
                Current: {zoomInfo.zoomLevel}x
              </span>
              <span className="text-xs text-gray-400 font-bold">|</span>
              <span className="text-xs font-mono bg-green-100 px-3 py-1 rounded text-green-700 font-bold">
                Max: {zoomInfo.maxZoom.toFixed(2)}x
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoomableTimelineV2;
