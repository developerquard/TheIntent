// Anonymous browsing identity — a stable per-browser actor id + human label.
// No login required; declaring & matching works anonymously.

const ID_KEY = "sd_actor_id";
const LABEL_KEY = "sd_actor_label";

function randId(): string {
  return "u_" + Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 4);
}

export function getActor(): { id: string; label: string } {
  if (typeof window === "undefined") return { id: "u_ssr00", label: "u_ssr00" };
  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id = randId();
    localStorage.setItem(ID_KEY, id);
  }
  let label = localStorage.getItem(LABEL_KEY);
  if (!label) {
    label = id;
    localStorage.setItem(LABEL_KEY, label);
  }
  return { id, label };
}

export function setLabel(label: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LABEL_KEY, label);
}
