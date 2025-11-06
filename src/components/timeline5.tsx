"use client";
import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useResizeObserver } from "@/hooks/useResizeObserver";
import { useReactNativeBridge } from "@/hooks/useReactNativeBridge";

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
  initialInterval: number;
  scrollTo: "end" | "middle" | "start";
}

interface ZoomableTimelineProps {
  timelineConfig?: timelineConfigProp;
}

const ZoomableTimeline6 = ({
  timelineConfig = { initialInterval: 7, scrollTo: "start" },
}: ZoomableTimelineProps) => {
  let intervalVariant = "adjust";
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<any>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);
  const [colorBlocks, setColorBlocks] = useState<any[]>([]);
  const [zoomInfo, setZoomInfo] = useState({
    current: "",
    currentPxPerMin: 0,
    zoomLevel: "0",
    zoomIn: "",
    zoomOut: "",
  });
  const [pivotPosition, setPivotPosition] = useState(0);
  const [pivotDate, setPivotDate] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPivot, setDragStartPivot] = useState(0);

  const xScaleRef = useRef<any>(null);
  const pivotPositionRef = useRef<number>(0);
  const precisePivotRef = useRef<number>(0);

  useEffect(() => {
    pivotPositionRef.current = pivotPosition;
    precisePivotRef.current = pivotPosition;
  }, [pivotPosition]);

  const height = 120;
  const marginRight = 30;
  const marginTop = 20;
  const marginLeft = 30;
  const timelineHeight = 28;
  const { data, sendToReactNative } = useReactNativeBridge();
  // const { startDate, endDate } = data ;

  const { startDate, endDate } = {
    startDate: new Date(Date.UTC(2025, 6, 1, 0, 0, 0)),
    endDate: new Date(Date.UTC(2025, 6, 5, 0, 0, 0)),
  };

  const tickGapRef = useRef<number>(0);
  const [tickGap, setTickGap] = useState<number>(0); // gap between ticks in px
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date }>({
    start: startDate,
    end: endDate,
  });

  const generateColorBlocks = () => {
    const blocks = [];
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#FFA07A",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E2",
    ];
    const current = new Date(startDate);

    while (current < endDate) {
      const duration = Math.random() * 3600000 * 4;
      const blockEnd = new Date(
        Math.min(current.getTime() + duration, endDate.getTime())
      );

      blocks.push({
        start: new Date(current),
        end: blockEnd,
        color: colors[Math.floor(Math.random() * colors.length)],
      });

      current.setTime(blockEnd.getTime());
    }

    return blocks;
  };

  useEffect(() => {
    setColorBlocks(generateColorBlocks());
  }, []);

  useEffect(() => {
    sendToReactNative && sendToReactNative("tickGap", tickGap);
    sendToReactNative && sendToReactNative("visibleRange", visibleRange);
  }, [tickGap, visibleRange]);

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

  useEffect(() => {
    if (!svgRef.current || colorBlocks.length === 0 || width === 0) return;

    const fullSpanMs = endDate.getTime() - startDate.getTime();
    const fullWidthPx = width - marginLeft - marginRight;
    const basePxPerMs = fullWidthPx / fullSpanMs;
    const basePxPerMin = basePxPerMs * 60 * 1000;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const x = d3
      // .scaleUtc()
      .scaleTime()
      .domain([startDate, endDate])
      .range([marginLeft, width - marginRight]);

    const xAxis = (g: any, x: any) => {
      const domain = x.domain();
      const range = x.range();
      const spanMs = domain[1] - domain[0];
      const pixelWidth = range[1] - range[0];

      const pxPerMin = pixelWidth / (spanMs / (1000 * 60));
      const { interval, format } = getInterval(pxPerMin);
      const tickValues = x.ticks(interval);
      console.log(tickValues, "---------ticks");
      const currentInterval = getInterval(pxPerMin);

      const axis = d3
        .axisBottom(x)
        .tickValues(tickValues)
        .tickSizeOuter(0)
        .tickFormat(format as any);

      g.call(axis);

      g.selectAll("text")
        .attr("y", -10)
        .style("text-anchor", "middle")
        .style("display", (d: any, i: number) => {
          if ([""].includes(currentInterval!.key)) {
            switch (intervalVariant) {
              case "even":
                return i % 2 === 0 ? "block" : "none";
              case "odd":
                return i % 2 !== 0 ? "block" : "none";
              case "adjust": {
                console.log(tickGap, "--------------ticgap");
                if (tickGapRef.current < 50) {
                  return i % 2 === 0 ? "block" : "none";
                } else {
                  return "block";
                }
              }
              default:
                return "block";
            }
          }
          return "block";
        });
    };

    const zoom = d3
      .zoom()
      .scaleExtent([1, 50])
      .extent([
        [marginLeft, 0],
        [width - marginRight, height],
      ])
      .translateExtent([
        [marginLeft, -Infinity],
        [width - marginRight, Infinity],
      ])
      .on("zoom", zoomed);

    zoomRef.current = zoom;

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
      const tickValues = xz.ticks(getInterval(currentPxPerMin).interval);
      if (tickValues.length >= 2) {
        const gapPx = Math.abs(xz(tickValues[1]) - xz(tickValues[0]));
        tickGapRef.current = gapPx;
        setTickGap(gapPx);
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

    const initialIntervalConfig = intervals[timelineConfig.initialInterval];
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

    svg.call(zoom as any); // attach zoom behavior

    // Immediately set the initial zoom
    // const initialTransform = d3.zoomIdentity
    //   .translate((width - marginLeft - marginRight) / 2 - x(centerDate), 0) // center the pivot
    //   .scale(initialZoomLevel);

    // svg.call(zoom.transform as any, initialTransform);

    //------------------zoom with animation-------------------------//

    svg
      .call(zoom as any)
      .transition()
      .duration(750)
      .call(zoom.scaleTo as any, initialZoomLevel, [x(centerDate), 0])
      .on("end", () => {
        const currentScale = d3.zoomTransform(svg.node()!).rescaleX(x);
        xScaleRef.current = currentScale;
        updatePivotDateFromScale(pivotPositionRef.current);
      });

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
          div.style.borderRight = "1px solid white";
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
      console.log(
        "Precise pivot position:",
        position,
        "Date:",
        date.toISOString()
      );
    }
  }

  // const handlePivotMouseDown = (e: React.MouseEvent) => {
  //   e.preventDefault();
  //   setIsDragging(true);
  //   setDragStartX(e.clientX);
  //   setDragStartPivot(precisePivotRef.current);
  // };

  // const handleMouseMove = (e: React.MouseEvent) => {
  //   if (!isDragging || !containerRef.current) return;

  //   const deltaX = e.clientX - dragStartX;
  //   const maxX = width - marginLeft - marginRight;

  //   const newPosition = Math.max(0, Math.min(dragStartPivot + deltaX, maxX));

  //   console.log(newPosition, "-----new position (with sub-pixel precision)");

  //   setPivotPosition(newPosition);
  //   precisePivotRef.current = newPosition;
  //   updatePivotDateFromScale(newPosition);
  // };

  // const handleMouseUp = () => {
  //   setIsDragging(false);
  // };

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
    return d3.timeFormat("%m/%d/%Y, %I:%M:%S %p")(date);
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

  return (
    <div className="flex flex-col items-center bg-gray-50 overflow-x-hidden p-4">
      <div className="mb-4 p-4 bg-gray-100 rounded-lg shadow-sm text-sm font-mono w-full">
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

      <div className="relative w-full flex items-center px-10">
        <button
          className="h-10 w-10 rounded-full bg-white hover:bg-neutral-400 absolute top-12 left-5 z-[99999]"
          onClick={() => scrollTimeline("left", 100)}
        >
          ◀
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
            className="absolute top-12 bg-amber-200 h-4"
            style={{
              width: `${width - marginLeft - marginRight}px`,
              height: `${timelineHeight}px`,
              marginLeft: `${marginLeft}px`,
              marginTop: "10px",
              border: "1px solid #ccc",
              overflow: "hidden",
              pointerEvents: "none",
            }}
            ref={timelineRef}
          />

          <div
            className="absolute top-32 bg-amber-200 h-4"
            style={{
              width: `${width - marginLeft - marginRight}px`,
              height: `${timelineHeight}px`,
              marginLeft: `${marginLeft}px`,
              marginTop: "10px",
              border: "1px solid #ccc",
              overflow: "hidden",
              pointerEvents: "none",
            }}
          />

          <div
            className="absolute"
            style={{
              left: `${marginLeft + pivotPosition}px`,
              top: "0",
              bottom: "0",
              width: "1px",
              backgroundColor: "#2563eb",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            <div
              className="absolute top-0 bottom-0 w-full"
              style={{
                background:
                  "linear-gradient(to bottom, #2563eb 0%, #2563eb 100%)",
              }}
            />

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
                borderTop: "8px solid #2563eb",
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
                borderBottom: "8px solid #2563eb",
              }}
            />
          </div>

          <div
            className="absolute bg-white border-2 border-blue-600 rounded-lg shadow-lg px-3 py-2"
            style={{
              left: `${marginLeft + pivotPosition}px`,
              top: "-45px",
              transform: "translateX(-50%)",
              pointerEvents: "auto",
              zIndex: 20,
              userSelect: "none",
              cursor: isDragging ? "grabbing" : "grab",
            }}
            // onMouseDown={handlePivotMouseDown}
            onMouseDown={(e) => handlePivotStart(e.clientX)}
            onTouchStart={(e) => handlePivotStart(e.touches[0].clientX)}
          >
            <div className="text-xs font-semibold text-gray-700 whitespace-nowrap flex items-center gap-1">
              <span>{formatPivotDate(pivotDate)}</span>
              <span className="text-blue-600">⟷</span>
            </div>
          </div>
        </div>
        <button
          className="h-10 w-10 rounded-full bg-white hover:bg-neutral-400 absolute top-12 right-5"
          onClick={() => scrollTimeline("right", 100)}
        >
          ▶
        </button>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Scroll to zoom, drag to pan. Drag the tooltip to move the pivot line
        with sub-pixel precision.
      </div>
    </div>
  );
};

export default ZoomableTimeline6;
