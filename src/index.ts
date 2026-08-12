import * as x11 from "@berstend/node-x11-typescript";
import { WindowManager } from "./wm";
import { XDisplay } from "./types/client";

x11.createClient({}, (err: Error | null, display?: XDisplay) => {
  if (err || !display || !display.client) {
    console.error(
      "X11 Connection Error:",
      err ?? new Error("Failed to connect to X11 display"),
    );
    process.exit(1);
  }

  console.log("[beanwm] Connected to X11 display!");

  const wm = new WindowManager(x11, display);
  wm.init();

  console.log("\n[beanwm] Controls (using Alt to avoid Hyprland shortcut collisions):");
  console.log("  - Alt + 1..9        : Switch to Workspace 1..9");
  console.log("  - Alt + Shift + 1..9: Move active window to Workspace 1..9");
  console.log("  - Alt + Return       : Launch terminal");
  console.log("  - Alt + Shift + Q   : Close active window\n");

  display?.client.on("error", (clientErr: Error) => {
    console.error("[beanwm] X11 Error:", clientErr);
  });
});
