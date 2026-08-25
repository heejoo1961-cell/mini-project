"use client";
import { useCallback, useEffect, useState } from "react";
import { DASHBOARD_STORAGE_KEY, DEFAULT_WIDGETS, DashboardWidgetId, DashboardWidgetSetting, freshDefaultWidgets } from "./dashboardConfig";
type StoredLayout = { version: 1; widgets: DashboardWidgetSetting[] };
function isValidLayout(value: unknown): value is StoredLayout {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || !Array.isArray(record.widgets) || record.widgets.length !== DEFAULT_WIDGETS.length) return false;
  const expected = new Set(DEFAULT_WIDGETS.map(({ id }) => id));
  return record.widgets.every((item) => {
    if (!item || typeof item !== "object") return false;
    const widget = item as Record<string, unknown>;
    return typeof widget.id === "string" && expected.delete(widget.id as DashboardWidgetId) && typeof widget.visible === "boolean" && typeof widget.order === "number";
  }) && expected.size === 0;
}
function save(widgets: DashboardWidgetSetting[]) { try { window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify({ version: 1, widgets })); } catch { /* 현재 화면 설정은 유지한다. */ } }
export function useDashboardLayout() {
  const [widgets, setWidgets] = useState<DashboardWidgetSetting[]>(freshDefaultWidgets);
  useEffect(() => { try { const raw = window.localStorage.getItem(DASHBOARD_STORAGE_KEY); const parsed: unknown = raw ? JSON.parse(raw) : null; if (isValidLayout(parsed)) setWidgets([...parsed.widgets].sort((a, b) => a.order - b.order)); else { const defaults = freshDefaultWidgets(); setWidgets(defaults); if (raw) save(defaults); } } catch { const defaults = freshDefaultWidgets(); setWidgets(defaults); save(defaults); } }, []);
  const update = useCallback((producer: (current: DashboardWidgetSetting[]) => DashboardWidgetSetting[]) => { setWidgets((current) => { const next = producer(current).map((widget, index) => ({ ...widget, order: index + 1 })); save(next); return next; }); }, []);
  return {
    widgets,
    toggle: (id: DashboardWidgetId) => update((current) => current.map((widget) => widget.id === id ? { ...widget, visible: !widget.visible } : widget)),
    move: (id: DashboardWidgetId, direction: -1 | 1) => update((current) => { const next = [...current]; const index = next.findIndex((widget) => widget.id === id); const target = index + direction; if (index < 0 || target < 0 || target >= next.length) return next; [next[index], next[target]] = [next[target], next[index]]; return next; }),
    reset: () => update(() => freshDefaultWidgets()),
  };
}
