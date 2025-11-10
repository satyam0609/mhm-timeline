import api from "../apiConnector";

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
