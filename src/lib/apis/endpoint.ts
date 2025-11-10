export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: "/api/auth/signup",
    LOGIN: "/api/auth/login",
    LOGOUT: "/api/auth/logout",
    PROFILE: "/api/auth/profile",
  },
  EVENT: {
    BASE: "api/events",
    CREATE: "api/events",
    GET_ALL: "api/events",
    GET_SWAPPABLE: "api/events/swappable",
    UPDATE: "api/events",
    DELETE: "api/events",
    MARK: "api/events/mark",
  },
  REQUEST: {
    BASE: "api/requests",
    MY_REQUEST: "api/requests/my-request",
  },
};
