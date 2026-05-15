import type { NavigateFunction, To } from "react-router-dom";

let nav: NavigateFunction | null = null;

export function setMpNavigator(fn: NavigateFunction | null) {
  nav = fn;
}

export function mpNavigate(to: To) {
  if (nav) nav(to);
}
