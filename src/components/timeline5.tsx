"use client";
import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useResizeObserver } from "@/lib/hooks/useResizeObserver";
import { COLORS } from "@/constants/color";
import LeftIcon from "@/assets/svg/leftIcon";
import RightIcon from "@/assets/svg/rightIcon";
import CalendarIcon from "@/assets/svg/calendarIcon";
import { RotateCw } from "lucide-react";
import throttle from "lodash.throttle";

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
    key: "2h",
    interval: d3.timeHour.every(2)!,
    format: d3.timeFormat("%I:%M %p"),
    minutes: 120,
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
  {
    key: "3M",
    interval: d3.timeMonth.every(3)!,
    format: d3.timeFormat("%b %Y"),
    minutes: 129600,
  },
];

interface timelineConfigProp {
  initialInterval?: number;
  scrollTo?: "end" | "middle" | "start";
  needTwoLineLabel?: boolean;
  intervalVariant?: "adjust" | "all" | "even";
  animateInitialRender?: boolean;
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
}

const ZoomableTimelineDebug = ({
  timelineConfig = {
    initialInterval: 4,
    scrollTo: "start",
    needTwoLineLabel: true,
    intervalVariant: "even",
    animateInitialRender: true,
  },
  onZoom = () => {},
  onGapChange = () => {},
  OnEndGapChange = () => {},
  onVisibleRangeChange = () => {},
  onCalendarClick = () => {},
  onReloadClick = () => {},
  data = [],
  startDate = new Date(),
  endDate = new Date(),
}: ZoomableTimelineProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<any>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { width } = useResizeObserver(containerRef);
  const [colorBlocks, setColorBlocks] = useState<any[]>([]);
  const [zoomInfo, setZoomInfo] = useState({
    current: "",
    currentPxPerMin: 0,
    zoomLevel: "0",
    zoomIn: "",
    zoomOut: "",
  });
  const [isZooming, setIsZooming] = useState(false);

  const [pivotPosition, setPivotPosition] = useState(0);
  const [pivotDate, setPivotDate] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPivot, setDragStartPivot] = useState(0);

  const xScaleRef = useRef<d3.ScaleTime<number, number> | null>(null);
  const pivotPositionRef = useRef<number>(0);
  const precisePivotRef = useRef<number>(0);

  //trottle functions
  const throttledOnZoom = useRef(throttle(onZoom, 200)).current;
  const throttledOnVisibleRangeChange = useRef(
    throttle(onVisibleRangeChange, 200)
  ).current;

  //use this height to accomodate upto where the zoom should work
  const height = 120;

  //use this margin top to set the position of ticks and label
  const marginTop = 30;
  const marginLeft = 33;
  const marginRight = 33;
  const timelineHeight = 48;

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

  const getInterval = (pxPerMin: number): IntervalConfig => {
    if (pxPerMin > 10) return intervals.find((d) => d.key === "5m")!;
    if (pxPerMin > 3) return intervals.find((d) => d.key === "15m")!;
    if (pxPerMin > 1.5) return intervals.find((d) => d.key === "30m")!;
    if (pxPerMin > 0.75) return intervals.find((d) => d.key === "1h")!;
    if (pxPerMin > 0.37) return intervals.find((d) => d.key === "2h")!;
    if (pxPerMin > 0.25) return intervals.find((d) => d.key === "3h")!;
    if (pxPerMin > 0.12) return intervals.find((d) => d.key === "6h")!;
    if (pxPerMin > 0.06) return intervals.find((d) => d.key === "12h")!;
    if (pxPerMin > 0.03) return intervals.find((d) => d.key === "1d")!;
    if (pxPerMin > 0.0014) return intervals.find((d) => d.key === "1M")!;
    return intervals.find((d) => d.key === "3M")!;
  };

  const onScrollorZoomEnd = (range: any, currentInterval: any) => {
    throttledOnVisibleRangeChange(range);
    throttledOnZoom(currentInterval);
  };

  useEffect(() => {
    if (!svgRef.current || colorBlocks.length === 0 || width === 0) return;

    const fullSpanMs = endDate.getTime() - startDate.getTime();
    const fullWidthPx = width - marginLeft - marginRight;
    const basePxPerMs = fullWidthPx / fullSpanMs;
    const basePxPerMin = basePxPerMs * 60 * 1000;

    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    svg.selectAll("*").remove();

    const x: d3.ScaleTime<number, number> = d3
      .scaleTime()
      .domain([startDate, endDate])
      .range([marginLeft, width - marginRight]);

    const xAxis = (
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      scale: d3.ScaleTime<number, number>
    ) => {
      const domain = scale.domain();
      const range = scale.range();
      const spanMs = domain[1].getTime() - domain[0].getTime();
      const pixelWidth = range[1] - range[0];

      const pxPerMin = pixelWidth / (spanMs / (1000 * 60));
      const { interval, format } = getInterval(pxPerMin);
      const tickValues = scale.ticks(interval);
      const currentInterval = getInterval(pxPerMin);

      const axis = d3
        .axisBottom(scale)
        .tickValues(tickValues)
        .tickSizeOuter(0)
        .tickFormat(format as any);

      // call axis on the provided group
      g.call(axis as any);

      // Remove default text elements
      g.selectAll("text").remove();

      // full range ticks (typed)
      const fullRangeTicks =
        (interval.range(startDate, endDate) as Date[]) || [];

      // Add custom two-line text for intervals that need it
      (
        g.selectAll<SVGGElement, Date>(".tick") as d3.Selection<
          SVGGElement,
          Date,
          SVGGElement,
          unknown
        >
      ).each(function (this: SVGGElement, d: Date, i: number) {
        const tick = d3.select<SVGGElement, Date>(this);
        // If a previous custom label exists, it will be selected (optional)
        const existingText = tick.select<SVGTextElement>("text.tick-label");

        // Find the global index of this tick in the full range
        const tickDate = new Date(d);
        const globalIndex = fullRangeTicks.findIndex(
          (t) => t.getTime() === tickDate.getTime()
        );

        const shouldShow = (() => {
          switch (timelineConfig.intervalVariant) {
            case "all":
              return true;
            case "even":
              return globalIndex % 2 === 0;
            case "adjust":
              return tickGapRef.current < 80 ? globalIndex % 2 === 0 : true;
            default:
              return true;
          }
        })();

        if (!shouldShow) return;

        const text = tick
          .append("text")
          .attr("y", -10)
          .attr("class", "tick-label")
          .style("text-anchor", "middle")
          .style("font-size", "12px")
          .style("fill", COLORS.black);

        // Check if we need two lines (for 6h, 12h, 1d intervals)
        if (timelineConfig.needTwoLineLabel) {
          const date = new Date(d);
          const datePart = d3.timeFormat("%m/%d")(date);
          const timePart = d3.timeFormat("%I:%M %p")(date);

          text.append("tspan").attr("x", 0).attr("dy", "-0.5em").text(datePart);
          text.append("tspan").attr("x", 0).attr("dy", "1.1em").text(timePart);
        } else {
          text.text(format(new Date(d)) as string);
        }
      });
    };

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 50])
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
        setIsZooming(false);
        const xz = event.transform.rescaleX(x);
        const currentZoom = event.transform.k;
        const currentPxPerMin = basePxPerMin * currentZoom;
        const currentInterval = getInterval(currentPxPerMin);
        // --- compute visible range ---
        const [visibleStart, visibleEnd] = xz.domain();
        const range = { start: visibleStart, end: visibleEnd };
        // Generate all ticks in the full range (typed)
        const fullRangeTicks =
          (currentInterval.interval.range(startDate, endDate) as Date[]) || [];

        // Get visible ticks
        const visibleTicks = xz.ticks(currentInterval.interval) as Date[];

        // Find the first visible tick
        const firstVisibleTick = visibleTicks[0];
        let isFirstTickShowing = true;

        if (firstVisibleTick) {
          // Find its global index in the full range
          const globalIndex = fullRangeTicks.findIndex(
            (t) => t.getTime() === firstVisibleTick.getTime()
          );

          // Check if this tick should be showing based on the variant setting
          isFirstTickShowing = (() => {
            switch (timelineConfig.intervalVariant) {
              case "all":
                return true;
              case "even":
                return globalIndex % 2 === 0;
              case "adjust":
                return tickGapRef.current < 80 ? globalIndex % 2 === 0 : true;
              default:
                return true;
            }
          })();
        }

        setVisibleRange(range);
        onScrollorZoomEnd(range, {
          currentInterval: currentInterval.key,
          firstShow: isFirstTickShowing,
        });
      });

    zoomRef.current = zoom;

    const gx = svg
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${marginTop})`);
    // call xAxis with typed selection
    (gx as d3.Selection<SVGGElement, unknown, null, undefined>).call(
      xAxis as any,
      x
    );

    gx.select(".domain").remove();

    function zoomed(event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
      const xz = event.transform.rescaleX(x);
      xScaleRef.current = xz;
      (gx as d3.Selection<SVGGElement, unknown, null, undefined>).call(
        xAxis as any,
        xz
      );
      gx.select(".domain").remove();

      const currentZoom = event.transform.k;
      const currentPxPerMin = basePxPerMin * currentZoom;
      // --- compute visible range ---
      const [visibleStart, visibleEnd] = xz.domain();
      setVisibleRange({ start: visibleStart, end: visibleEnd });

      // --- compute gap between each tick label ---
      const tickValues = xz.ticks(
        getInterval(currentPxPerMin).interval
      ) as Date[];
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

      const currentInterval = getInterval(currentPxPerMin);
      const currentIdx = intervals.findIndex(
        (i) => i.key === currentInterval!.key
      );

      const zoomInInterval = currentIdx > 0 ? intervals[currentIdx - 1] : null;
      const zoomOutInterval =
        currentIdx < intervals.length - 1 ? intervals[currentIdx + 1] : null;

      let zoomInText = "Max zoom";
      let zoomOutText = "Min zoom";

      if (zoomInInterval) {
        const minPxPerInterval = 75;
        const neededPxPerMin = minPxPerInterval / zoomInInterval.minutes;
        const neededZoom = neededPxPerMin / basePxPerMin;
        zoomInText = `${zoomInInterval.key} (at ~${neededZoom.toFixed(
          1
        )}x zoom)`;
      }

      if (zoomOutInterval) {
        const minPxPerInterval = 80;
        const neededPxPerMin = minPxPerInterval / zoomOutInterval.minutes;
        const neededZoom = neededPxPerMin / basePxPerMin;
        zoomOutText = `${zoomOutInterval.key} (at ~${neededZoom.toFixed(
          1
        )}x zoom)`;
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

    const initialIntervalConfig =
      intervals[timelineConfig.initialInterval as number];
    const targetPxPerInterval = 90;
    const targetPxPerMin = targetPxPerInterval / initialIntervalConfig.minutes;
    const initialZoomLevel = targetPxPerMin / basePxPerMin;

    let centerDate: Date;
    switch (timelineConfig.scrollTo) {
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
    svg.call(zoom as any); // attach zoom behavior

    const applyInitialZoom = () => {
      const zoomTarget = [x(centerDate) - marginLeft, 0];
      if (timelineConfig.animateInitialRender) {
        svg
          .transition()
          .duration(800)
          .ease(d3.easeCubicOut)
          .call((zoom as any).scaleTo, initialZoomLevel, zoomTarget)
          .on("end", finalizeInitialZoom);
      } else {
        (zoom as any).scaleTo(svg as any, initialZoomLevel, zoomTarget);
        finalizeInitialZoom();
      }
    };

    const finalizeInitialZoom = () => {
      if (!svg.node()) return;
      const transform = d3.zoomTransform(svg.node()!);
      const currentScale = transform.rescaleX(x);
      xScaleRef.current = currentScale;
      updatePivotDateFromScale(pivotPositionRef.current);
    };

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
          div.style.boxSizing = "border-box";
          timelineRef.current!.appendChild(div);
        }
      });
    }

    updateTimeline(x);
  }, [colorBlocks, width]);

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
    return d3.timeFormat("%m/%d/%Y, %I:%M %p")(date);
  };

  const scrollTimeline = (direction: "left" | "right", px: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    const dx = direction === "left" ? px : -px;
    svg
      .transition()
      .duration(300)
      .call((zoomRef.current as any).translateBy as any, dx, 0);
  };

  return (
    <div className="flex flex-col items-center overflow-hidden pt-12">
      {/* UI unchanged */}
      <div className="relative w-full flex items-center px-6">
        <button
          className="h-12 w-6 border rounded-l-md bg-white absolute top-12 left-5 z-9999 flex justify-center items-center"
          onClick={() => scrollTimeline("left", 100)}
        >
          <LeftIcon />
        </button>
        <div
          className="bg-white w-full relative"
          ref={containerRef}
          onMouseMove={(e) => handlePivotMove(e.clientX)}
          onTouchMove={(e) => handlePivotMove(e.touches[0].clientX)}
          onMouseLeave={() => handlePivotEnd()}
          style={{ cursor: isDragging ? "grabbing" : "default" }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            style={{ maxWidth: "100%", height: "auto", display: "block" }}
          />
          <div
            className="absolute top-12 bg-amber-200 h-4"
            style={{
              width: `${width - marginLeft - marginRight}px`,
              height: `${timelineHeight}px`,
              marginLeft: `${marginLeft}px`,
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
          </div>
          <div
            className="absolute bg-lavenderMist border-2 border-darkViolet rounded-full shadow-lg px-3 py-1"
            style={{
              left: `${marginLeft + pivotPosition}px`,
              top: "-45px",
              transform: "translateX(-50%)",
              pointerEvents: "auto",
              zIndex: 20,
              userSelect: "none",
              cursor: isDragging ? "grabbing" : "grab",
            }}
            onMouseDown={(e) => handlePivotStart(e.clientX)}
            onTouchStart={(e) => handlePivotStart(e.touches[0].clientX)}
          >
            <div className="text-xs text-gray-700 whitespace-nowrap flex items-center gap-2">
              <span className="text-violet-500">
                {formatPivotDate(pivotDate)}
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onCalendarClick();
                }}
              >
                <CalendarIcon />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onReloadClick();
                }}
                className="p-1"
              >
                <RotateCw size={16} className="rotate-90" />
              </button>
            </div>
          </div>
          <div className="h-32 w-full px-8.5 relative">
            <div className="bg-yellow-200 h-full w-full"></div>
          </div>
        </div>
        <button
          className="h-12 w-6 border rounded-r-md bg-white absolute top-12 right-5 flex justify-center items-center"
          onClick={() => scrollTimeline("right", 100)}
        >
          <RightIcon />
        </button>
      </div>
    </div>
  );
};

export default ZoomableTimelineDebug;
