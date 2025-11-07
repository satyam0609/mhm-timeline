"use client";
import DualAxisChart from "@/components/dualAsixLineChart";
import ZoomableTimelineDebug from "@/components/timeline-debug";
import ZoomableTimelineDebug1 from "@/components/timeline4";
import { Checkbox } from "@/components/ui/checkbox";
import { COLORS } from "@/constants/color";
import { generateTimeSeriesData } from "@/utils/line-chart-data";
import { useEffect, useState } from "react";

const generateColorBlocks = (startDate: Date, endDate: Date) => {
  const blocks = [];
  const colors: Record<number, string> = {
    1: "#9999d6", // COLORS.silverChalice
    2: COLORS.darkgreen,
    3: COLORS.salem,
    4: COLORS.jade,
    5: COLORS.algaeGreen,
    6: "#7c79b2", // COLORS.codGray
    7: COLORS.lightRed,
    8: COLORS.pearlBush,
  };

  const colorKeys = Object.keys(colors).map(Number);
  const current = new Date(startDate);

  while (current < endDate) {
    // random duration between 0 and 4 hours
    const duration = Math.random() * 3600000 * 4;
    const blockEnd = new Date(
      Math.min(current.getTime() + duration, endDate.getTime())
    );

    const randomKey = colorKeys[Math.floor(Math.random() * colorKeys.length)];

    blocks.push({
      start: new Date(current),
      end: blockEnd,
      color: colors[randomKey],
    });

    // move to the next block start
    current.setTime(blockEnd.getTime());
  }

  return blocks;
};

export default function Home() {
  const [domain, setDomain] = useState<{ startDate: Date; endDate: Date }>({
    startDate: new Date(Date.UTC(2025, 6, 1, 0, 0, 0)),
    endDate: new Date(Date.UTC(2025, 6, 8, 0, 0, 0)),
  });
  const [currentInterval, setCurrentInterval] = useState("1h");
  const [data, setData] = useState<
    {
      start: Date;
      end: Date;
      color: string;
    }[]
  >([]);
  const [lineChartData, setLineChartData] = useState<any[]>([]);
  const [visibleRange, setVisibleRange] = useState({
    start: new Date(),
    end: new Date(),
  });

  //linechart states
  const [showTemperature, setShowTemperature] = useState(true);
  const [showHumidity, setShowHumidity] = useState(true);
  const [visibleTicks, setVisibleTicks] = useState([]);

  useEffect(() => {
    if (currentInterval && visibleRange.start && visibleRange.end) {
      const {
        data: generateData,
        startInserted,
        endInserted,
      } = generateTimeSeriesData(
        visibleRange.start,
        visibleRange.end,
        currentInterval
      );
      setLineChartData(generateData);
    }
  }, [visibleRange]);

  useEffect(() => {
    const blocks = generateColorBlocks(domain.startDate, domain.endDate);
    setData(blocks);
  }, [domain.startDate, domain.endDate]);
  // console.log("lineChartData", lineChartData);
  return (
    <div className="px-0">
      <div>
        <ZoomableTimelineDebug
          startDate={domain.startDate}
          endDate={domain.endDate}
          data={data}
          onZoom={(data) => {
            setCurrentInterval(data.currentInterval);
            setVisibleTicks(data.visibleTicks);
          }}
          onVisibleRangeChange={(data) => setVisibleRange(data)}
          timelineConfig={{
            initialInterval: 4,
            scrollTo: "start",
            needTwoLineLabel: true,
            intervalVariant: "even",
            animateInitialRender: true,
          }}
        />
      </div>
      <div>
        {/* <ZoomableTimeline
          startDate={domain.startDate}
          endDate={domain.endDate}
          data={data}
          onZoom={(data) => setCurrentInterval(data)}
          onVisibleRangeChange={(data) => setVisibleRange(data)}
        /> */}
      </div>
      {currentInterval}
      <div className="pb-8">
        <div className="bg-lavenderMist_50_opacity mx-15 pt-9">
          <div className=" flex justify-end gap-6.5 mr-4">
            <div className="flex gap-2 items-center">
              <Checkbox
                id={"humidity"}
                checked={showHumidity}
                onCheckedChange={(val) => setShowHumidity(!!val)}
              />
              <label
                htmlFor={"humidity"}
                className="text-sm font-medium text-stratos"
              >
                Humidity
              </label>
            </div>
            <div className="flex gap-2 items-center">
              <Checkbox
                id={"temp"}
                checked={showTemperature}
                onCheckedChange={(val) => setShowTemperature(!!val)}
              />
              <label
                htmlFor="temp"
                className="text-sm font-medium text-stratos"
              >
                Temperature
              </label>
            </div>
          </div>
        </div>

        {data.length > 0 && (
          <DualAxisChart
            showHumidity={showHumidity}
            showTemperature={showTemperature}
            data={lineChartData}
            visibleLabelTicks={visibleTicks as any}
          />
        )}
      </div>
    </div>
  );
}
