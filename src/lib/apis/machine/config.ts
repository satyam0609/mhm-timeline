const machinesApiEndpoint = {
  getAllMachines: "/api/machine/getAllMachines",
  getMachineById: "/api/machine/getMachineById",
  createMachines: "/api/machine/createMachines",
  getActivity: "/api/machine/getCurrentAvtivity",
  setUpSensorUnit: "/api/machine/setUpSensorUnit",
  editSensor: "/api/machine/editSensorData",
  setUpSentinelUnit: "/api/machine/setUpGatewayUnit",
  getSpectrogram: "/api/activity/getspectrogramImage",
  getCurrentActivity: "/api/machine/getSensorCurrentAactivity",
  postMachineData: "/api/machine/filterSensorData",
  getZoomableData: "/api/machine/getAudioData",
  getTimelineStartDate: "/api/activity/getStartDateOfData",
  getSpectrogramByDay: "/api/activity/getspectrogram",
  getSensorDropdown: "/api/dropdown/getSensor",
  getGatewayDropdown: "/api/dropdown/getGateway",
};

export default machinesApiEndpoint;
