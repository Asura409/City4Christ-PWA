import { api } from "../auth/session";
export const publicRoot = "/api/v1/livebroadcasts";
export const adminRoot = "/api/v1/admin/livebroadcasts";
export const readBroadcast = async (id, signal) => (await api.request(`${publicRoot}/${encodeURIComponent(id)}`, { public: true, signal })).data;
export const getBroadcast = async (id) => (await api.request(`${adminRoot}/${encodeURIComponent(id)}`)).data;
export const createBroadcast = async (body) => (await api.request(adminRoot, { method: "POST", body })).data;
export const updateBroadcast = async (id, body) => (await api.request(`${adminRoot}/${encodeURIComponent(id)}`, { method: "PATCH", body })).data;
