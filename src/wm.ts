import { Client } from "./client";
import { defaultConfig, WMConfig } from "./config";
import { LayoutEngine } from "./layout";

export class WindowManager {
  private client: any;
  private X: any;
  private root: number;
  private screenWidth: number;
  private screenHeight: number;
  private config: WMConfig;
  private layoutEngine: LayoutEngine;
  public clients: Client[] = [];

  constructor(x11Client: any, display: any) {
    this.client = x11Client;
    this.X = display.client;
    const screen = display.screen[0];
    this.root = screen.root;
    this.screenWidth = screen.pixel_width;
    this.screenHeight = screen.pixel_height;
    this.config = defaultConfig;
    this.layoutEngine = new LayoutEngine();
  }

  public init() {
    console.log("[beanwm] Registering SubstructureRedirect on Root Window...");

    const eventMask =
      this.X.eventMask.SubstructureRedirect |
      this.X.eventMask.SubstructureNotify |
      this.X.eventMask.StructureNotify;

    this.X.ChangeWindowAttributes(this.root, { eventMask }, (err: any) => {
      if (err) {
        console.error(
          "[beanwm] Could not claim Window Manager control (is another WM running?):",
          err,
        );
        return;
      }
      console.log("[beanwm] Window Manager active!");
    });

    this.setupEvents();
  }

  private setupEvents() {
    this.X.on("event", (ev: any) => {
      if (ev.name === "MapRequest") {
        this.handleMapRequest(ev.window);
      } else if (ev.name === "DestroyNotify" || ev.name === "UnmapNotify") {
        this.handleUnmap(ev.window);
      } else if (ev.name === "ConfigureRequest") {
        this.X.ConfigureWindow(ev.window, {
          x: ev.x,
          y: ev.y,
          width: ev.width,
          height: ev.height,
          borderWidth: ev.borderWidth,
        });
      }
    });
  }

  private handleMapRequest(winId: number) {
    if (this.clients.some((c) => c.windowId === winId)) return;

    this.X.SetWindowBorderWidth(winId, this.config.borderWidth);
    this.X.SetWindowBorder(winId, this.config.focusedBorderColor);

    const client = new Client(winId, { x: 0, y: 0, width: 400, height: 300 });
    this.clients.push(client);

    this.X.MapWindow(winId);
    this.applyLayout();
  }

  private handleUnmap(winId: number) {
    const idx = this.clients.findIndex((c) => c.windowId === winId);
    if (idx !== -1) {
      this.clients.splice(idx, 1);
      this.applyLayout();
    }
  }

  public applyLayout() {
    const layoutMap = this.layoutEngine.calculateLayout(
      this.clients,
      this.screenWidth,
      this.screenHeight,
    );
    for (const [winId, rect] of layoutMap.entries()) {
      this.X.MoveResizeWindow(winId, rect.x, rect.y, rect.width, rect.height);
    }
  }
}
