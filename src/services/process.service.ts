import { spawn } from "child_process";

export class ProcessService {
  public static spawnProcess(command: string, display: string): void {
    const { WAYLAND_DISPLAY, ...cleanEnv } = process.env;

    const child = spawn(command, [], {
      detached: true,
      stdio: "ignore",
      env: {
        ...cleanEnv,
        DISPLAY: display,
        GDK_BACKEND: "x11",
        QT_QPA_PLATFORM: "xcb",
        LIBGL_ALWAYS_SOFTWARE: "1",
        LANG: "C",
        LC_ALL: "C",
      },
    });

    child.on("error", () => {});
    child.unref();
  }
}
