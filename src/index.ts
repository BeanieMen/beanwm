import x11 from "x11";
import { WindowManager } from "./wm";

x11.createClient((err, display) => {
  if (err) {
    console.error("X11 Connection Error:", err);
    process.exit(1);
  }

  console.log("[beanwm] Connected to X11 display!");
  const wm = new WindowManager(x11, display);
  wm.init();

  display.client.on("error", (err: any) =>
    console.error("[beanwm] X11 Error:", err),
  );
});
