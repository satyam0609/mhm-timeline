"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  { rangeDays: 7, maxZoomIntervalKey: "5m", minZoomIntervalKey: "6h" },
  { rangeDays: 21, maxZoomIntervalKey: "30m", minZoomIntervalKey: "1d" },
  { rangeDays: 200, maxZoomIntervalKey: "1h", minZoomIntervalKey: "1w" },
  { rangeDays: Infinity, maxZoomIntervalKey: "3h", minZoomIntervalKey: "1M" },
];

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
  startDate?: Date;
  endDate?: Date;
  data?: any[];
  loading?: boolean;
}

const ZoomableTimelineV1 = ({
  timelineConfig = {},
  onZoom = () => {},
  onGapChange = () => {},
  OnEndGapChange = () => {},
  onVisibleRangeChange = () => {},
  onCalendarClick = () => {},
  onReloadClick = () => {},
  data = [],
  startDate = new Date(),
  endDate = new Date(),
  loading = true,
}: ZoomableTimelineProps) => {
  const {
    initialInterval = 4,
    scrollTo = "start",
    needTwoLineLabel = true,
    intervalVariant = "adjust",
    animateInitialRender = true,
    minTickGap = 80,
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
  });
  const [isZooming, setIsZooming] = useState(false);
  const [isSubModeOn, setIsSubModeOn] = useState(false);

  const [pivotPosition, setPivotPosition] = useState(0);
  const [pivotDate, setPivotDate] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPivot, setDragStartPivot] = useState(0);
  const [selectedZoomInterval, setSelectedZoomInterval] = useState<string>(
    intervals[initialInterval].key
  );

  const xScaleRef = useRef<any>(null);
  const pivotPositionRef = useRef<number>(0);
  const precisePivotRef = useRef<number>(0);
  const zoomBehaviorRef = useRef<any>(null);
  const svgSelectionRef = useRef<any>(null);

  //trottle functions
  const throttledOnZoom = useRef(throttle(onZoom, 200)).current;
  const throttledOnVisibleRangeChange = useRef(
    throttle(onVisibleRangeChange, 200)
  ).current;

  //use this height to accomodate upto where the zoom should work
  const height = 120;

  //use this margin top to set the position of ticks and label
  const marginTop = 30;
  const marginLeft = 22;
  const marginRight = 22;
  const timelineHeight = 48;
  //   const { data, sendToReactNative } = useReactNativeBridge();
  // const { startDate, endDate } = data ;

  // ===============to store the gap between the tick===============
  const tickGapRef = useRef<number>(0);
  const [tickGap, setTickGap] = useState<number>(0); // gap between ticks in px
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date }>({
    start: startDate,
    end: endDate,
  });

  useEffect(() => {
    setColorBlocks(data);
  }, [data]);

  const getHeaderDate = useCallback(() => {
    return `${d3.timeFormat("%B %d, %Y")(startDate!)} - ${d3.timeFormat(
      "%B %d, %Y"
    )(endDate!)}`;
  }, [startDate, endDate]);

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

  const MIN_PX_PER_TICK = (width - marginLeft - marginRight) / 12;

  const getTotalDays = () => {
    if (loading) return 0; // <-- FIX: prevent undefined access
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

  const calculateZoomExtent = () => {
    const constraint = getActiveConstraint();
    const allowedIntervals = getAllowedIntervals(constraint);

    const finestInterval = allowedIntervals[0];

    const fullSpanMs = endDate.getTime() - startDate.getTime();
    const fullWidthPx = width - marginLeft - marginRight;
    const basePxPerMs = fullWidthPx / fullSpanMs;
    const basePxPerMin = basePxPerMs * 60 * 1000;

    const maxZoomPxPerMin = MIN_PX_PER_TICK / finestInterval.minutes;
    const maxZoom = maxZoomPxPerMin / basePxPerMin;

    const minZoom = 1.0;

    return { minZoom, maxZoom, constraint, basePxPerMin };
  };

  const handleIntervalChange = (intervalKey: string) => {
    console.log("changing interval", intervalKey);
    if (
      !zoomBehaviorRef.current ||
      !svgSelectionRef.current ||
      !xScaleRef.current
    )
      return;

    console.log("its running");

    const fullSpanMs = endDate.getTime() - startDate.getTime();
    const fullWidthPx = width - marginLeft - marginRight;
    const basePxPerMs = fullWidthPx / fullSpanMs;
    const basePxPerMin = basePxPerMs * 60 * 1000;

    const targetInterval = intervals.find((i) => i.key === intervalKey);
    if (!targetInterval) return;

    const { minZoom, maxZoom } = calculateZoomExtent();

    // Calculate target zoom based on MIN_PX_PER_TICK to ensure proper spacing
    const targetPxPerMin = MIN_PX_PER_TICK / targetInterval.minutes;
    let targetZoom = targetPxPerMin / basePxPerMin;

    // Clamp zoom to valid range
    targetZoom = Math.max(minZoom, Math.min(maxZoom, targetZoom));

    const pivotSvgX = pivotPositionRef.current + marginLeft;

    setSelectedInterval(intervalKey);

    svgSelectionRef.current
      .transition()
      .duration(500)
      .call(zoomBehaviorRef.current.scaleTo, targetZoom, [pivotSvgX, 0]);
  };

  useEffect(() => {
    console.log("this run----", loading, !svgRef.current, width, fallbackWidth);

    if (!svgRef.current || width === 0) return;
    console.log("this run----2", loading);
    const fullSpanMs = endDate.getTime() - startDate.getTime();
    const fullWidthPx = width - marginLeft - marginRight;
    const basePxPerMs = fullWidthPx / fullSpanMs;
    const basePxPerMin = basePxPerMs * 60 * 1000;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const x = d3
      .scaleTime()
      //   .scaleUtc()
      .domain([startDate, endDate])
      .range([marginLeft, width - marginRight]);

    const activeConstraint = getActiveConstraint();
    const { minZoom, maxZoom } = calculateZoomExtent();

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
        setIsZooming(true);
      })
      .extent([
        [marginLeft, 0],
        [width - marginRight, height],
      ])
      .translateExtent([
        [marginLeft, -Infinity],
        [width - marginRight, Infinity],
      ])
      .on("zoom", zoomed)
      .on("end", (event: any) => {
        console.log("running");
        setIsZooming(false);
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
      });

    zoomRef.current = zoom;
    zoomBehaviorRef.current = zoom;
    svgSelectionRef.current = svg;

    const gx = svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${marginTop})`)
      .call(xAxis, x);

    gx.select(".domain").remove();

    function zoomed(event: any) {
      const xz = event.transform.rescaleX(x);
      xScaleRef.current = xz;
      gx.call(xAxis, xz);
      gx.select(".domain").remove();

      const currentZoom = event.transform.k;
      const currentPxPerMin = basePxPerMin * currentZoom;
      // --- compute visible range ---
      const [visibleStart, visibleEnd] = xz.domain();
      setVisibleRange({ start: visibleStart, end: visibleEnd });

      // --- compute gap between each tick label ---
      const tickValues = xz.ticks(
        getInterval(currentPxPerMin, activeConstraint).interval
      );
      const firstTickX = xz(tickValues[0]);
      const lastTickX = xz(tickValues[tickValues.length - 1]);
      const leftGap = firstTickX - marginLeft;
      const rightGap = width - marginRight - lastTickX;
      OnEndGapChange({ left: leftGap, right: rightGap });
      // console.log("Left gap:", leftGap, "Right gap:", rightGap);
      if (tickValues.length >= 2) {
        const gapPx = Math.abs(xz(tickValues[1]) - xz(tickValues[0]));
        tickGapRef.current = gapPx;
        setTickGap(gapPx);
        onGapChange(gapPx);
      }

      const currentInterval = getInterval(currentPxPerMin, activeConstraint);
      const allowedIntervals = getAllowedIntervals(activeConstraint);
      const isIntervalAllowed = allowedIntervals.some(
        (i) => i.key === currentInterval.key
      );

      if (isIntervalAllowed) {
        setSelectedInterval(currentInterval.key);
      }
      const currentIdx = intervals.findIndex(
        (i) => i.key === currentInterval!.key
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
        const neededZoom = neededPxPerMin / basePxPerMin;
        zoomInText = `${zoomInInterval.key} (at ~${neededZoom.toFixed(1)}x)`;
      }

      if (zoomOutInterval) {
        const neededPxPerMin = MIN_PX_PER_TICK / zoomOutInterval.minutes;
        const neededZoom = neededPxPerMin / basePxPerMin;
        zoomOutText = `${zoomOutInterval.key} (at ~${neededZoom.toFixed(1)}x)`;
      }

      setZoomInfo({
        current: currentInterval.key,
        currentPxPerMin: +currentPxPerMin.toFixed(4),
        zoomLevel: currentZoom.toFixed(2),
        zoomIn: zoomInText,
        zoomOut: zoomOutText,
      });

      updateTimeline(xz);
      updatePivotDateFromScale(pivotPositionRef.current);
    }

    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .attr("pointer-events", "all");

    const initialIntervalConfig = intervals[initialInterval as number];
    const targetPxPerMin = MIN_PX_PER_TICK / initialIntervalConfig.minutes;
    let initialZoomLevel = targetPxPerMin / basePxPerMin;

    initialZoomLevel = Math.max(minZoom, Math.min(maxZoom, initialZoomLevel));

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

      if (animateInitialRender) {
        svg
          .transition()
          .duration(800)
          .ease(d3.easeCubicOut)
          .call(zoom.scaleTo as any, initialZoomLevel, zoomTarget)
          .on("end", finalizeInitialZoom);
      } else {
        svg.call(zoom.scaleTo as any, initialZoomLevel, zoomTarget);
        finalizeInitialZoom();
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
    };

    // Trigger initial zoom after a short delay (ensures layout settled)
    requestAnimationFrame(applyInitialZoom);

    function updateTimeline(scale: any) {
      if (!timelineRef.current) return;

      timelineRef.current.innerHTML = "";

      colorBlocks.forEach((block) => {
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
          //   div.style.borderRight = "1px solid white";
          div.style.boxSizing = "border-box";
          timelineRef.current!.appendChild(div);
        }
      });
    }

    updateTimeline(x);
  }, [colorBlocks, width, startDate, endDate, loading]);

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
    pivotPositionRef.current = newPosition;
    precisePivotRef.current = newPosition;
    updatePivotDateFromScale(newPosition);
  };

  const handlePivotEnd = () => {
    setIsDragging(false);
  };

  const formatPivotDate = (date: Date) => {
    // return d3.timeFormat("%m/%d/%Y, %I:%M:%S %p")(date);
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
      .call((zoomRef.current as any).translateBy as any, dx, 0);
  };

  const activeConstraint = getActiveConstraint();
  const allowedIntervals = getAllowedIntervals(activeConstraint);

  return (
    <div className="flex flex-col items-center overflow-hidden">
      <div className="mb-4 p-4 bg-gray-100 rounded-lg shadow-sm text-sm font-mono w-full hidden">
        <div className="grid grid-cols-3 gap-4">
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
        </div>
        <div className="mt-3 pt-3 border-t border-gray-300">
          <div className="text-purple-600 font-semibold">
            Pivot Position: {precisePivotRef.current.toFixed(4)}px
          </div>
          <div className="text-purple-600 font-semibold">Gap: {tickGap}px</div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-300">
          <div className="text-purple-600 font-semibold">
            Start: {d3.timeFormat("%m/%d/%Y, %I:%M:%S %p")(visibleRange.start)}
          </div>
          <div className="text-purple-600 font-semibold">
            End: {d3.timeFormat("%m/%d/%Y, %I:%M:%S %p")(visibleRange.end)}
          </div>
        </div>
      </div>
      <div className="w-full relative px-11.5 mb-5">
        <div className="py-2.5 w-full border-t border-[#8D8A9D] bg-lavenderMistLight px-3 flex justify-between items-center">
          <div className="text-sm text-black-primary">{getHeaderDate()}</div>
          <div className="flex gap-4">
            <div className="flex gap-2 items-center">
              <Checkbox
                className="h-3 w-3"
                id={"sub-mode"}
                checked={isSubModeOn}
                onCheckedChange={(val) => setIsSubModeOn(!!val)}
              />
              <label htmlFor="sub-mode" className="text-sm text-black-primary">
                Normal Sub-Mode
              </label>
            </div>
            <Select
              value={selectedInterval}
              onValueChange={(val) => {
                handleIntervalChange(val);
              }}
            >
              <SelectTrigger className="!w-[100px] bg-white">
                <SelectValue placeholder="Zoom" />
              </SelectTrigger>

              <SelectContent align="end" className="!w-[100px]">
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
      <div className="relative w-full flex items-center px-6">
        <div className="w-full" ref={initialWidthRef}></div>
      </div>
      {loading ? (
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
            onClick={() => scrollTimeline("left", 100)}
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
              className={`absolute top-12 bg-amber-300 h-4`}
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
              className={`h-32 w-full relative]`}
              style={{ paddingLeft: marginLeft, paddingRight: marginRight }}
            >
              <div className="bg-yellow-200 h-full w-full"></div>
            </div>
          </div>
          <button
            className="h-12 w-6 border border-midnightBlue rounded-r-md bg-white hover:bg-neutral-400 absolute top-12 right-4 flex justify-center items-center"
            onClick={() => scrollTimeline("right", 100)}
          >
            <RightIcon />
          </button>
        </div>
      )}
    </div>
  );
};

export default ZoomableTimelineV1;
