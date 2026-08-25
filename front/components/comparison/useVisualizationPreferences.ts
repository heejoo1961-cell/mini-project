"use client";
import { useEffect, useState } from "react";
import { DashboardPreset, PRESET_VIEWS, VIEW_OPTIONS, VISUALIZATION_STORAGE_KEY, VisualizationKey, VisualizationState, VisualizationViews } from "./visualizationConfig";

function defaults(): VisualizationState { return { version: 2, preset: "default", views: { ...PRESET_VIEWS.default } }; }
function validView<K extends VisualizationKey>(key: K, value: unknown): value is VisualizationViews[K] { return VIEW_OPTIONS[key].some((option) => option.value === value); }
function parse(raw: string | null): VisualizationState {
  if (!raw) return defaults();
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value.version === 2 && value.views && typeof value.views === "object") {
      const source = value.views as Record<string, unknown>; const next = defaults();
      (Object.keys(next.views) as VisualizationKey[]).forEach((key) => { if (validView(key, source[key])) (next.views as Record<string, string>)[key] = source[key] as string; });
      next.preset = ["default", "visual", "table", "custom"].includes(String(value.preset)) ? value.preset as DashboardPreset : "custom";
      return next;
    }
    if (value.version === 1) {
      const legacyViews = value.views && typeof value.views === "object" ? value.views as Record<string, unknown> : {};
      const legacy = legacyViews.totalCost ?? value.totalCost ?? value.totalCostView ?? value.view;
      const next = defaults(); if (validView("totalCost", legacy)) next.views.totalCost = legacy; next.preset = "custom"; return next;
    }
  } catch { /* 기본값 사용 */ }
  return defaults();
}
function persist(state: VisualizationState) { try { window.localStorage.setItem(VISUALIZATION_STORAGE_KEY, JSON.stringify(state)); } catch { /* 메모리 상태 유지 */ } }
export function useVisualizationPreferences() {
  const [state, setState] = useState<VisualizationState>(defaults);
  useEffect(() => { const next = parse(window.localStorage.getItem(VISUALIZATION_STORAGE_KEY)); setState(next); persist(next); }, []);
  function commit(next: VisualizationState) { setState(next); persist(next); }
  return {
    ...state,
    setView: <K extends VisualizationKey>(key: K, view: VisualizationViews[K]) => commit({ version: 2, preset: "custom", views: { ...state.views, [key]: view } }),
    applyPreset: (preset: Exclude<DashboardPreset, "custom">) => commit({ version: 2, preset, views: { ...PRESET_VIEWS[preset] } }),
    reset: () => commit(defaults()),
  };
}
