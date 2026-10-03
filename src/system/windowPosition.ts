import {
  currentMonitor,
  getCurrentWindow,
  PhysicalPosition,
  PhysicalSize,
} from "@tauri-apps/api/window";

export async function positionMyBuddy() {
  const monitor = await currentMonitor();

  if (!monitor) {
    return;
  }

  const appWindow = getCurrentWindow();

  await appWindow.setSize(
    new PhysicalSize(monitor.size.width, monitor.size.height),
  );

  await appWindow.setPosition(
    new PhysicalPosition(monitor.position.x, monitor.position.y),
  );
}
