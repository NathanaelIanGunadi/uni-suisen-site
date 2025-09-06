export const API_BASE = "http://localhost:3000";

export const getToken = (): string | null => localStorage.getItem("token");

export const authHeaders = (): Record<string, string> => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

export const flash = (
  el: HTMLElement,
  type: "success" | "danger",
  text: string
): void => {
  el.innerHTML = `<div class="alert alert-${type}">${text}</div>`;
};
