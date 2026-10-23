const DEVICE_ID_KEY = "ajrc-device-id";

export type DeviceIdentity = {
  id: string;
  label: string;
};

function deviceKind() {
  if (typeof window === "undefined") return "Aparelho";
  if (window.matchMedia("(max-width: 600px)").matches) return "Celular";
  if (window.matchMedia("(max-width: 1024px)").matches) return "Tablet";
  return "Computador";
}

export function getDeviceIdentity(): DeviceIdentity | null {
  if (typeof window === "undefined") return null;
  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return {
    id,
    label: `${deviceKind()} ${id.slice(0, 4).toUpperCase()}`,
  };
}
