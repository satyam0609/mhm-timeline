"use client";
import DualAxisChart from "@/components/dualAsixLineChart";
import ZoomableTimelineDebug from "@/components/timeline-debug";
import { Checkbox } from "@/components/ui/checkbox";
import { COLORS } from "@/constants/color";
import { verifyWebToken } from "@/lib/apis/machine";
import { useAppDispatch, useAppSelector } from "@/lib/hooks/useRedux";
import { setToken } from "@/lib/store/slices/auth-slice";
import { generateTimeSeriesData } from "@/lib/utils/line-chart-data";
import { useReactNativeBridge } from "@/lib/utils/useReactNativeBridge";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { token } = useAppSelector((state) => state.auth);
  const { data: nativeData, sendToReactNative } = useReactNativeBridge();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const webToken = searchParams.get("token");
  // const webToken =
  //   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzJiYjFlMzgzYTNhMjA0OGFhMWFhZTYiLCJpYXQiOjE3NjI3Nzg4NDgsImV4cCI6MTc2Mjc4NjA0OH0.TDm1XDE1NnJFVUKfTv6fBcnn-T13NHgmnGF912OkJxU ";
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

  const generateColorBlocks = useCallback(
    (startDate: Date, endDate: Date) => {
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

  const checkToken = async () => {
    sendToReactNative("start", "hello");
    if (!webToken) return;
    sendToReactNative("continue", "continue");
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
