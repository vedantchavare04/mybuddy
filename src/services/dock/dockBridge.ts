import { call } from "../tauri";

export type DockRegion = { x: number; y: number; w: number; h: number };

export const dockBridge = {
  enter(region: DockRegion) {
    void call("dock_enter", { ...region }).catch(() => {});
  },

  hold(on: boolean) {
    void call("dock_hold", { on }).catch(() => {});
  },

  leave() {
    void call("dock_leave").catch(() => {});
  },
};