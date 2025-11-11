"use client";
import DualAxisChart from "@/components/dualAsixLineChart";
import ZoomableTimelineDebug from "@/components/timeline-debug";
import { Checkbox } from "@/components/ui/checkbox";
import { COLORS } from "@/constants/color";
import { getZoomableData, verifyWebToken } from "@/lib/apis/machine";
import { useAppDispatch, useAppSelector } from "@/lib/hooks/useRedux";
import { setToken } from "@/lib/store/slices/auth-slice";
import { generateTimeSeriesData } from "@/lib/utils/line-chart-data";
import { useReactNativeBridge } from "@/lib/utils/useReactNativeBridge";
import { timeParse } from "d3";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const blockColors: Record<number, string> = {
  1: "#9999d6",
  2: COLORS.darkgreen,
  3: COLORS.salem,
  4: COLORS.jade,
  5: COLORS.algaeGreen,
  6: "#7c79b2",
  7: COLORS.lightRed,
  8: COLORS.pearlBush,
};

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { token } = useAppSelector((state) => state.auth);
  const { data: nativeData, sendToReactNative } = useReactNativeBridge();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  // const webToken = searchParams.get("token");
  const webToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzJiYjFlMzgzYTNhMjA0OGFhMWFhZTYiLCJpYXQiOjE3NjI4NjE2ODUsImV4cCI6MTc2Mjg2ODg4NX0.mOOYaeas8Uxf9qQoI6H913v4hwaizSFTA_bkIh4ftfs";

  const [domain, setDomain] = useState<{ startDate: Date; endDate: Date }>({
    startDate: new Date("2025-11-05T01:00:00.000Z"),
    endDate: new Date("2025-11-11T01:00:00.000Z"),
  });
  const [currentInterval, setCurrentInterval] = useState("1h");
  const [data, setData] = useState<
    {
      start: Date;
      end: Date;
      color: number | string;
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

  const generateColorBlocks = useCallback(
    (startDate: Date, endDate: Date) => {
      const blocks = [];
      const colors: Record<number, string> = {
        1: "#9999d6",
        2: COLORS.darkgreen,
        3: COLORS.salem,
        4: COLORS.jade,
        5: COLORS.algaeGreen,
        6: "#7c79b2",
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

        const randomKey =
          colorKeys[Math.floor(Math.random() * colorKeys.length)];

        blocks.push({
          start: new Date(current),
          end: blockEnd,
          color: colors[randomKey],
        });

        // move to the next block start
        current.setTime(blockEnd.getTime());
      }

      return blocks;
    },
    [visibleRange.start, visibleRange.end, currentInterval]
  );

  const parseDate = timeParse("%d/%m/%Y - %I:%M %p");

  const getTimelineData = async () => {
    const data = await getZoomableData({
      endDate: nativeData.endDate ?? domain.endDate,
      sensorId: nativeData.sensorId ?? "67b4459f21a7961649312abc",
      startDate: nativeData.startDate ?? domain.startDate,
    });
    console.log(data);
    if (data.success) {
      const timlineData = data.data;
      const modifiedTimelineData = timlineData.map((item: any) => ({
        start: parseDate(item.from),
        end: parseDate(item.to),
        color: blockColors[item.color],
      }));
      console.log(modifiedTimelineData, "--------------modified");
      setData(modifiedTimelineData);
      setDomain({
        startDate: parseDate(timlineData[0]?.from)!,
        endDate: parseDate(timlineData[timlineData.length - 1]?.to)!,
      });
      console.log({
        startDate: parseDate(timlineData[0]?.from)!,
        endDate: parseDate(timlineData[timlineData.length - 1]?.to)!,
      });
    }
  };

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

  // useEffect(() => {
  //   const blocks = generateColorBlocks(domain.startDate, domain.endDate);
  //   setData(blocks);
  // }, [domain.startDate, domain.endDate]);

  const checkToken = async () => {
    sendToReactNative("data", "hello", null);
    if (!webToken) return;
    sendToReactNative("data", "continue", null);
    try {
      const data = await verifyWebToken(webToken);

      if (data.success) {
        dispatch(setToken(data.token));
      }
    } catch (err) {}
  };

  useEffect(() => {
    checkToken();
  }, [webToken]);

  useEffect(() => {
    if (token) {
      getTimelineData();
    }
  }, [token, nativeData.startDate, nativeData.endDate, nativeData.sensorId]);

  console.log(data, "---data of block");
  return (
    <div className="px-0">
      <div>{JSON.stringify(nativeData)}</div>
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
            scrollTo: "end",
            needTwoLineLabel: true,
            intervalVariant: "even",
            animateInitialRender: true,
          }}
          onCalendarClick={() =>
            sendToReactNative("action", null, "openCalendar")
          }
        />
      </div>

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
        {currentInterval}

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
