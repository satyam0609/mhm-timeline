"use client";
import DualAxisChart from "@/components/dualAsixLineChart";
import ZoomableTimelineDebug from "@/components/timeline-debug";
import { Checkbox } from "@/components/ui/checkbox";
import { COLORS } from "@/constants/color";
import {
  getMachineAnalysisData,
  getSpectrogram,
  getZoomableData,
  verifyWebToken,
} from "@/lib/apis/machine";
import { useAppDispatch, useAppSelector } from "@/lib/hooks/useRedux";
import { setToken } from "@/lib/store/slices/auth-slice";
import {
  combineTempHumidity,
  generateTimeSeriesData,
} from "@/lib/utils/line-chart-data";
import { useReactNativeBridge } from "@/lib/utils/useReactNativeBridge";
import { timeFormat, timeParse } from "d3";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import NewZoomableTimeline from "@/components/new-timeline";
import ZoomableTimeline from "@/components/timeline6";
import ZoomableTimelineV1 from "@/components/timelinev1";
import ZoomableTimelineV2 from "@/components/timelinev2";
import throttle from "lodash.throttle";
import { Skeleton } from "@/components/ui/skeleton";
import { timeStamp } from "console";

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
  const { data: nativeData, sendToReactNative } = useReactNativeBridge({
    callGetSpectrogram: (data: any) => debouncedSpectrogram(data),
  });
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  const [loading, setLoading] = useState(true);

  const [domain, setDomain] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });
  const [currentInterval, setCurrentInterval] = useState("1h");
  const [data, setData] = useState<
    {
      start: Date;
      end: Date;
      color: number | string;
    }[]
  >([]);

  const [visibleRange, setVisibleRange] = useState({
    start: null,
    end: null,
  });

  //spectrogram states
  const [isLoadingSpectrogram, setIsLoadingSpectrogram] = useState(true);
  const [spectrogram, setSpectrogram] = useState("");

  //linechart states
  const [lineChartData, setLineChartData] = useState<any[]>([]);
  const [showTemperature, setShowTemperature] = useState(true);
  const [showHumidity, setShowHumidity] = useState(true);
  const [isSubModeOn, setIsSubModeOn] = useState(false);
  const [visibleTicks, setVisibleTicks] = useState([]);

  const [temperatureData, setTemperatureData] = useState([]);
  const [humidityData, setHumidityData] = useState([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(true);

  const parseDate = timeParse("%d/%m/%Y - %I:%M %p");

  const getTimelineData = async () => {
    try {
      setLoading(true);
      const body = {
        endDate: nativeData.endDate ?? domain.endDate,
        sensorId: nativeData.sensorId ?? "67b4459f21a7961649312abc",
        startDate: nativeData.startDate ?? domain.startDate,
      };
      // sendToReactNative("data", body, "-----------from web body");
      const data = await getZoomableData(body);

      console.log(data);
      if (data.success) {
        const timlineData = data.data;
        const modifiedTimelineData = timlineData.map((item: any) => ({
          start: parseDate(item.from),
          end: parseDate(item.to),
          color: blockColors[item.color],
        }));
        console.log(modifiedTimelineData, "--------------modified");
        // sendToReactNative("data", modifiedTimelineData, null);
        setDomain({
          startDate: parseDate(timlineData[0]?.from)!,
          endDate: parseDate(timlineData[timlineData.length - 1]?.to)!,
        });
        setData(modifiedTimelineData);

        // sendToReactNative(
        //   "data",
        //   {
        //     from: parseDate(timlineData[0]?.from)!,
        //     to: parseDate(timlineData[timlineData.length - 1]?.to)!,
        //   },
        //   "-----------from web"
        // );
      }
    } catch (err) {
    } finally {
      // setLoading(false);
      setTimeout(() => {
        setLoading(false);
      }, 5000);
    }
  };

  useEffect(() => {
    if (currentInterval && visibleRange.start && visibleRange.end) {
      sendToReactNative("data", null, "----------------called the chart data");
      const {
        data: generateData,
        startInserted,
        endInserted,
      } = generateTimeSeriesData(
        visibleRange.start,
        visibleRange.end,
        currentInterval
      );
      sendToReactNative("data", visibleRange, "------------range");
      // setLineChartData(generateData);
      const chartLabels = generateData.map((item) => item.time);
      debouncedMachineAnalysis({
        body: { sensorId: nativeData.sensorId, timeSlots: chartLabels },
        range: visibleRange,
        currentInterval,
      });
    }
  }, [visibleRange.start, visibleRange.end, currentInterval]);

  // useEffect(() => {
  //   if (!loading) {
  //     const blocks = generateColorBlocks(domain.startDate!, domain.endDate!);
  //     setData(blocks);
  //   }
  // }, [domain.startDate, domain.endDate, loading]);
  const callGetSpectrogramApi = useCallback(
    async (body: any) => {
      setIsLoadingSpectrogram(true);
      try {
        const data: any = await getSpectrogram(body);
        // sendToReactNative("data", data, null);

        if (data?.success) {
          setSpectrogram(`data:image/png;base64,${data.image}`);
        }
      } catch (error) {
        // console.log("Error to get Spectrogram data", error);
      } finally {
        setIsLoadingSpectrogram(false);
      }
    },
    [visibleRange]
  );

  const debouncedSpectrogram = useCallback(
    throttle((q) => {
      callGetSpectrogramApi(q);
    }, 350),
    []
  );

  const callGetMachineAnalysis = useCallback(
    async (data: any) => {
      try {
        setLoadingAnalysis(true);

        const res: any = await getMachineAnalysisData(data.body);
        sendToReactNative("data", res, "--------machine analysis data");
        if (res.success) {
          // setHumidityData(data?.sensorData?.humidity);
          // setTemperatureData(data.sensorData.temperature);
          // sendToReactNative("data", data.sensorData.temperature, null);
          const tempData = res.sensorData.temperature;
          const humidityData = res.sensorData.humidity;
          const range = data.range;
          // sendToReactNative(
          //   "data",
          //   res.sensorData.temperature,
          //   "--------humdata"
          // );
          // sendToReactNative(
          //   "data",
          //   res.sensorData.humidity,
          //   `---------tempdata ${(range.start, range.end, currentInterval)}`
          // );

          const {
            data: tickData,
            startInserted,
            endInserted,
          } = generateTimeSeriesData(
            range.start!,
            range.end!,
            data.currentInterval
          );
          sendToReactNative(
            "data",
            tickData,
            "-------------data for linechart"
          );
          const modifiedData = combineTempHumidity(tempData, humidityData).map(
            (item: any, idx: number) => ({
              ...item,
              time: tickData[idx].time,
              timestamp: tickData[idx].timestamp,
            })
          );
          sendToReactNative(
            "data",
            `${modifiedData.length}-----${tickData.length}`,
            "-------------data for generated"
          );
          setLineChartData(modifiedData);
        }
      } catch (err) {
      } finally {
        setLoadingAnalysis(false);
      }
    },
    [visibleRange.start, visibleRange.end, currentInterval]
  );

  const debouncedMachineAnalysis = useCallback(
    throttle((q) => {
      callGetMachineAnalysis(q);
    }, 350),
    []
  );

  const getHeaderDate = useCallback(() => {
    return `${timeFormat("%B %d, %Y")(domain.startDate!)} - ${timeFormat(
      "%B %d, %Y"
    )(domain.endDate!)}`;
  }, [domain]);

  // useEffect(() => {
  //   checkToken();
  // }, [webToken]);

  useEffect(() => {
    if (token) {
      console.log(
        "fetching data,",
        token,
        nativeData.startDate,
        nativeData.endDate,
        nativeData.sensorId
      );
      getTimelineData();
      debouncedSpectrogram({
        id: nativeData.sensorId,
        days: nativeData.selectedDays,
        startDate: nativeData.startDate,
        endDate: nativeData.endDate,
        startTimeLine: nativeData.startDate,
      });
    }
  }, [token, nativeData.startDate, nativeData.endDate, nativeData.sensorId]);

  return (
    <div className="px-0">
      <div>
        {/* <h1 className="text-2xl">Data Coming from webview</h1> */}
        {/* {JSON.stringify(nativeData)} */}
        {/* {spectrogram} */}
        {/* {JSON.stringify(temperatureData)} */}
      </div>
      <div className="py-2.5 mx-11.5 border-t border-[#8D8A9D] bg-lavenderMistLight px-3 flex justify-between hidden">
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
          <Select>
            <SelectTrigger className="w-[100px]! bg-white">
              <SelectValue placeholder="Zoom" />
            </SelectTrigger>
            <SelectContent align="end" className="w-[100px]!">
              <SelectItem value="light">1hr</SelectItem>
              <SelectItem value="dark">2hr</SelectItem>
              <SelectItem value="system">3hr</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* <div className="">
        <ZoomableTimelineDebug
          loading={loading && data.length > 0}
          startDate={domain.startDate}
          endDate={domain.endDate}
          data={data}
          onZoom={(data) => {
            setCurrentInterval(data.currentInterval);
            setVisibleTicks(data.visibleTicks);
          }}
          onVisibleRangeChange={(data) => setVisibleRange(data)}
          timelineConfig={{
            initialInterval: 7,
            scrollTo: "end",
            needTwoLineLabel: true,
            intervalVariant: "even",
            animateInitialRender: true,
          }}
          onCalendarClick={() =>
            sendToReactNative("action", null, "openCalendar")
          }
        />
      </div> */}
      {/* <ZoomableTimelineV1
        loading={loading}
        startDate={domain.startDate!}
        endDate={domain.endDate!}
        data={data}
        onZoom={(data) => {
          setCurrentInterval(data.currentInterval);
          setVisibleTicks(data.visibleTicks);
        }}
        onVisibleRangeChange={(data) => setVisibleRange(data)}
        timelineConfig={{
          initialInterval: 7,
          scrollTo: "end",
          needTwoLineLabel: true,
          intervalVariant: "even",
          animateInitialRender: true,
        }}
        onCalendarClick={() =>
          sendToReactNative("action", null, "openCalendar")
        }
      /> */}

      <ZoomableTimelineV2
        loading={loading}
        startDate={domain.startDate!}
        endDate={domain.endDate!}
        data={data}
        onZoom={(data) => {
          setCurrentInterval(data.currentInterval);
          setVisibleTicks(data.visibleTicks);
        }}
        onVisibleRangeChange={(data) =>
          setVisibleRange((prev: any) => {
            const prevStart = prev.start
              ? new Date(prev.start).getTime()
              : null;
            const prevEnd = prev.end ? new Date(prev.end).getTime() : null;

            const newStart = new Date(data.start).getTime();
            const newEnd = new Date(data.end).getTime();

            if (prevStart === newStart && prevEnd === newEnd) {
              return prev; // DO NOT UPDATE → prevents effect from firing
            }

            return data; // Only update if actual timestamp changed
          })
        }
        timelineConfig={{
          scrollTo: "end",
          needTwoLineLabel: true,
          intervalVariant: "even",
        }}
        onCalendarClick={() =>
          sendToReactNative("action", null, "openCalendar")
        }
        spectrogram={spectrogram}
      />

      {/* <div>
        <NewZoomableTimeline
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
      </div> */}

      <div className="pb-8">
        <div className="bg-lavenderMist_50_opacity mx-11 py-8">
          <div className=" flex justify-end gap-6.5 mr-4">
            <div className="flex gap-2 items-center">
              <Checkbox
                className="h-3 w-3"
                id={"humidity"}
                checked={showHumidity}
                onCheckedChange={(val) => setShowHumidity(!!val)}
              />
              <label htmlFor={"humidity"} className="text-sm text-stratos">
                Humidity
              </label>
            </div>
            <div className="flex gap-2 items-center">
              <Checkbox
                className="h-3 w-3"
                id={"temp"}
                checked={showTemperature}
                onCheckedChange={(val) => setShowTemperature(!!val)}
              />
              <label htmlFor="temp" className="text-sm text-stratos">
                Temperature
              </label>
            </div>
          </div>
        </div>

        <div>
          {loadingAnalysis || loading ? (
            <div className="px-11 relative">
              <Skeleton className="h-[260px] w-full rounded-none" />
            </div>
          ) : (
            <DualAxisChart
              showHumidity={showHumidity}
              showTemperature={showTemperature}
              data={lineChartData}
              visibleLabelTicks={visibleTicks as any}
            />
          )}
        </div>
      </div>
    </div>
  );
}
