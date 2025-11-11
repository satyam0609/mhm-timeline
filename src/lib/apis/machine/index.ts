import api from "../apiConnector";
import machinesApiEndpoint from "./config";

export const verifyWebToken = async (adminToken: string) => {
  const res = await api.get("/api/user/short_lived_token_verify", {
    headers: {
      Authorization: adminToken,
      "Content-Type": "application/json",
      "Ngrok-Skip-Browser-Warning": "true",
    },
  });
  return res.data;
};

export const getZoomableData = async (payload: any) => {
  const res = await api.post(machinesApiEndpoint.getZoomableData, payload);
  return res.data;
};
