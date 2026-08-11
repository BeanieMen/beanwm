import * as x11 from "@berstend/node-x11-typescript";
import { WindowManager } from "./wm";
import { XDisplay } from "./types/client";

x11.createClient({}, (err: Error | null, display?: XDisplay) => {
  if (err || !display || !display.client) {
    console.error("X11 Connection Error:", err ?? new Error("Failed to connect to X11 display"));
    process.exit(1);
  }

  console.log("[beanwm] Connected to X11 display!");

  const wm = new WindowManager(x11, display);
  wm.init();

  display.client.on("error", (clientErr: Error) => {
    console.error("[beanwm] X11 Error:", clientErr);
  });
});