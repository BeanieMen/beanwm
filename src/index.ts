import * as x11 from "@berstend/node-x11-typescript";
import { WindowManager } from "./wm";
import { XDisplay } from "./types/client";

x11.createClient({}, (err: Error | null, display?: XDisplay) => {
  if (err || !display?.client) {
    process.exit(1);
  }

  display.client.on("error", (err: Error) => {
    console.error("[beanwm] X11 Error (another Window Manager might already be active on this display):", err.message);
  });

  const wm = new WindowManager(x11, display);
  wm.init();
});
