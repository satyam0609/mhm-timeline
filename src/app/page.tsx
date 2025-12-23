"use client";
import DualAxisChart from "@/components/dualAsixLineChart";
import { Checkbox } from "@/components/ui/checkbox";
import { COLORS } from "@/constants/color";
import {
  getMachineAnalysisData,
  getSpectrogram,
  getZoomableData,
  verifyWebToken,
} from "@/lib/apis/machine";
import { useAppDispatch, useAppSelector } from "@/lib/hooks/useRedux";
import {
  combineTempHumidity,
  generateTimeSeriesData,
} from "@/lib/utils/line-chart-data";
import { useReactNativeBridge } from "@/lib/utils/useReactNativeBridge";
import { timeFormat, timeParse } from "d3";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import ZoomableTimelineV2 from "@/components/timelinev2";
import throttle from "lodash.throttle";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { token } = useAppSelector((state) => state.auth);
  const { data: nativeData, sendToReactNative } = useReactNativeBridge({
    callGetSpectrogram: (data: any) => debouncedSpectrogram(data),
  });

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
  const [isNormalSubMode, setIsNormalSubmode] = useState(true);

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
  const [selectedThermo, setSelectedThermo] = useState<Record<string, boolean>>(
    {}
  );
  const thermoColor = {
    "0x60": COLORS.green,
    "0x67": COLORS.dodgerBlue,
    "0x63": COLORS.darkyellow,
  };

  const [visibleTicks, setVisibleTicks] = useState([]);

  const [temperatureData, setTemperatureData] = useState([]);
  const [humidityData, setHumidityData] = useState([]);
  const [thermoTempData, setThermoTempData] = useState<any>([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(true);

  const parseDate = timeParse("%d/%m/%Y - %I:%M %p");

  const getTimelineData = async (body: any) => {
    try {
      setLoading(true);

      sendToReactNative("data", body, "-----------from web body");
      const data = await getZoomableData(body);

      console.log(data);
      if (data.success) {
        const timelineData = data.data;

        // console.log(modifiedTimelineData, "--------------modified");
        // sendToReactNative(
        //   "data",
        //   {
        //     startDate: parseDate(timelineData[0]?.from)!,
        //     endDate: parseDate(timelineData[timelineData.length - 1]?.to)!,
        //     timelineData,
        //   },
        //   "---------timeline data from web-----------"
        // );
        setDomain({
          startDate: parseDate(timelineData[0]?.from)!,
          endDate: parseDate(timelineData[timelineData.length - 1]?.to)!,
        });
        setData(timelineData);

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
      // sendToReactNative("data", null, "----------------called the chart data");
      setLoadingAnalysis(true);
      setIsLoadingSpectrogram(true);

      const {
        data: generateData,
        startInserted,
        endInserted,
      } = generateTimeSeriesData(
        visibleRange.start,
        visibleRange.end,
        currentInterval
      );
      sendToReactNative(
        "data",
        {
          visibleRange,
          id: nativeData.sensorId,
          days: nativeData.selectedDays,
          startDate: visibleRange.start,
          endDate: visibleRange.end,
          startTimeLine: visibleRange.start,
        },
        "------------range"
      );
      // setLineChartData(generateData);
      const chartLabels = generateData.map((item) => item.time);
      debouncedMachineAnalysis({
        body: { sensorId: nativeData.sensorId, timeSlots: chartLabels },
        range: visibleRange,
        currentInterval,
      });
      debouncedSpectrogram({
        // sensorId: nativeData.sensorId,
        id: nativeData.sensorId,
        days: nativeData.selectedDays,
        startDate: visibleRange.start,
        endDate: visibleRange.end,
        startTimeLine: visibleRange.start,
      });
    }
  }, [visibleRange.start, visibleRange.end, currentInterval]);

  useEffect(() => {
    if (thermoTempData[0]?.value) {
      const initialState = Object.keys(thermoTempData[0].value).reduce(
        (acc, key) => {
          acc[key] = true; // or false if you want unchecked by default
          return acc;
        },
        {} as Record<string, boolean>
      );

      setSelectedThermo(initialState);
    }
  }, [thermoTempData]);

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
        // sendToReactNative("data", body, "------------this is spectrogram body");

        const data: any = await getSpectrogram(body);
        // sendToReactNative("data", data, "------------this is spectrogram");

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
      setLineChartData([]);
      try {
        setLoadingAnalysis(true);
        sendToReactNative("data", data, "--------machine analysis body");

        const res: any = await getMachineAnalysisData(data.body);
        sendToReactNative("data", res, "--------machine analysis data");
        if (res.success) {
          // setHumidityData(data?.sensorData?.humidity);
          // setTemperatureData(data.sensorData.temperature);
          // sendToReactNative("data", data.sensorData.temperature, null);
          const tempData = res.sensorData.temperature;
          const humidityData = res.sensorData.humidity;
          const thermoCouple = res.sensorData.thermoCouple;
          const range = data.range;

          setTemperatureData(tempData);
          setHumidityData(humidityData);
          setThermoTempData(thermoCouple);

          const {
            data: tickData,
            startInserted,
            endInserted,
          } = generateTimeSeriesData(
            range.start!,
            range.end!,
            data.currentInterval
          );

          const modifiedData = combineTempHumidity(
            tempData,
            humidityData,
            thermoCouple
          ).map((item: any, idx: number) => ({
            ...item,
            time: tickData[idx].time,
            timestamp: tickData[idx].timestamp,
          }));

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
    }, 2000),
    []
  );

  const getModifiedTimelineData = (isNormal: boolean, rawData: any[]) => {
    const getColor = (code: number) =>
      !isNormal && [2, 3, 4, 5].includes(code)
        ? COLORS.jade
        : blockColors[code];
    return rawData.map((item: any) => ({
      start: parseDate(item.from),
      end: parseDate(item.to),
      color: getColor(item.color),
    }));
  };
  const [calculatedTimelineData, setCalculatedTimelineData] = useState<any[]>(
    []
  );
  useEffect(() => {
    if (data.length > 0) {
      // Initial calculation

      const initialData = getModifiedTimelineData(isNormalSubMode, data);
      setCalculatedTimelineData(initialData);
    }
  }, [data, isNormalSubMode]);

  const handleModeChange = useCallback(
    (val: boolean) => {
      // 1. Immediately calculate the new data using the 'val' (new state)
      const newData = getModifiedTimelineData(val, data);

      // 2. Update the timeline data state immediately
      setCalculatedTimelineData(newData);

      // 3. Update the mode state (this state is now mostly for the checkboxes/UI)
      setIsNormalSubmode(val);
    },
    [data] // Depend only on 'data' for the recalculation
  );

  // useEffect(() => {
  //   checkToken();
  // }, [webToken]);

  useEffect(() => {
    if (token) {
      getTimelineData({
        endDate: nativeData.endDate,
        sensorId: nativeData.sensorId,
        startDate: nativeData.startDate,
      });
    }
  }, [token, nativeData.startDate, nativeData.endDate, nativeData.sensorId]);

  return (
    <div className="px-0">
      <div>
        {/* {currentInterval} */}
        {/* <h1 className="text-2xl">Data Coming from webview</h1> */}
        {/* {JSON.stringify(nativeData)} */}
        {/* {spectrogram}
        {JSON.stringify(isNormalSubMode)} */}
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
        loadingSpectrogram={isLoadingSpectrogram || loading}
        startDate={domain.startDate!}
        endDate={domain.endDate!}
        data={calculatedTimelineData}
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
        onReloadClick={() => {
          setIsNormalSubmode(true);
          sendToReactNative("action", null, "reset");
        }}
        spectrogram={spectrogram}
        onModeChange={handleModeChange}
        isNormalSubMode={isNormalSubMode}
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
          <div className="flex justify-end gap-6.5 mr-4">
            {thermoTempData[0]?.value && thermoTempData[0].value !== "0" && (
              <div className="flex gap-4 items-center">
                <span className="text-xs text-stratos">Thermocouple: </span>
                {Object.keys(thermoTempData[0].value).map((item: string) => (
                  <div key={item} className="flex gap-2 items-center">
                    <Checkbox
                      className="h-3 w-3"
                      id={item}
                      checked={!!selectedThermo[item]}
                      onCheckedChange={(val) =>
                        setSelectedThermo((prev) => ({
                          ...prev,
                          [item]: !!val,
                        }))
                      }
                    />
                    <label htmlFor={item} className="text-xs text-stratos">
                      {item}
                    </label>
                  </div>
                ))}
              </div>
            )}
            {thermoTempData[0] && thermoTempData[0].value !== "0" && (
              <div className="h-5 w-px bg-stratos"></div>
            )}
            <div className="flex gap-2 items-center">
              <Checkbox
                className="h-3 w-3"
                id={"humidity"}
                checked={showHumidity}
                onCheckedChange={(val) => setShowHumidity(!!val)}
              />
              <label htmlFor={"humidity"} className="text-xs text-stratos">
                Humidity (%)
              </label>
            </div>
            <div className="flex gap-2 items-center">
              <Checkbox
                className="h-3 w-3"
                id={"temp"}
                checked={showTemperature}
                onCheckedChange={(val) => setShowTemperature(!!val)}
              />
              <label htmlFor="temp" className="text-xs text-stratos">
                Temperature (°C)
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
              thermoColor={thermoColor}
              showHumidity={showHumidity}
              showTemperature={showTemperature}
              selectedThermo={selectedThermo}
              data={lineChartData}
              visibleLabelTicks={visibleTicks as any}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// import React from "react";

// function page() {
//   return <div>page</div>;
// }

// export default page;
