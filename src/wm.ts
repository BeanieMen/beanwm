import { Client } from "./client";
import { defaultConfig, WMConfig } from "./config";
import { LayoutEngine } from "./layout";
import { Workspace } from "./workspace";
import { XClient, XDisplay, XEvent } from "./types/client";
import * as x11 from "@berstend/node-x11-typescript";

export class WindowManager {
  private x11: typeof x11;
  private X: XClient;
  private root: number;
  private screenWidth: number;
  private screenHeight: number;
  private config: WMConfig;
  private layoutEngine: LayoutEngine;
  public clients: Client[] = [];

  public workspaces: Workspace[] = [];
  public currentWorkspaceIndex: number = 0;

  constructor(x11Client: typeof x11, display: XDisplay) {
    this.x11 = x11Client;
    if (!display.client) {
      throw new Error("Display client is undefined");
    }
    this.X = display.client;
    const screen = display.screen[0];
    this.root = screen.root;
    this.screenWidth = screen.pixel_width;
    this.screenHeight = screen.pixel_height;
    this.config = defaultConfig;
    this.layoutEngine = new LayoutEngine();

    // Default workspace initialization (0..8)
    for (let i = 0; i < 9; i++) {
      this.workspaces.push(new Workspace(i));
    }
  }

  public init(): void {
    console.log("[beanwm] Registering SubstructureRedirect on Root Window...");

    const eventMask =
      this.x11.eventMask.SubstructureRedirect |
      this.x11.eventMask.SubstructureNotify |
      this.x11.eventMask.StructureNotify;

    this.X.ChangeWindowAttributes?.(this.root, { eventMask });
    console.log("[beanwm] Window Manager active!");

    this.setupEvents();
  }

  private setupEvents(): void {
    this.X.on("event", (ev: XEvent) => {
      const winId = ev.wid ?? ev.window;
      if (!winId) return;

      if (ev.name === "MapRequest") {
        this.handleMapRequest(winId);
      } else if (ev.name === "DestroyNotify" || ev.name === "UnmapNotify") {
        this.handleUnmap(winId);
      } else if (ev.name === "ConfigureRequest") {
        this.X.ConfigureWindow?.(winId, {
          x: ev.x ?? 0,
          y: ev.y ?? 0,
          width: ev.width ?? 400,
          height: ev.height ?? 300,
          borderWidth: ev.borderWidth ?? 0,
          stackMode: 0,
          sibling: 0,
        });
      }
    });
  }

  private handleMapRequest(winId: number): void {
    const ws = this.workspaces[this.currentWorkspaceIndex];
    if (!ws) return;
    if (ws.clients.some((c) => c.windowId === winId)) return;

    const client = new Client(winId, { x: 0, y: 0, width: 400, height: 300 });
    ws.addClient(client);

    this.X.MapWindow?.(winId);
    this.applyCurrentLayout();
  }

  private handleUnmap(winId: number): void {
    for (const ws of this.workspaces) {
      const removed = ws.removeClient(winId);
      if (removed && ws.id === this.currentWorkspaceIndex) {
        this.applyCurrentLayout();
        break;
      }
    }
  }

  public switchToWorkspace(targetIndex: number): void {
    if (targetIndex < 0 || targetIndex >= this.workspaces.length) {
      console.warn(`[beanwm] Invalid workspace index: ${targetIndex}`);
      return;
    }
    const oldWs = this.workspaces[this.currentWorkspaceIndex];
    const newWs = this.workspaces[targetIndex];

    for (const c of oldWs.clients) {
      this.X.UnmapWindow?.(c.windowId);
    }

    this.currentWorkspaceIndex = targetIndex;

    for (const c of newWs.clients) {
      this.X.MapWindow?.(c.windowId);
    }
    this.applyCurrentLayout();
    console.log(`[beanwm] Switched to Workspace ${targetIndex + 1}`);
  }

  public applyCurrentLayout(): void {
    const ws = this.workspaces[this.currentWorkspaceIndex];
    if (!ws) return;

    const layoutMap = ws.layoutEngine.calculateLayout(
      ws.clients,
      this.screenWidth,
      this.screenHeight,
    );
    for (const [winId, rect] of layoutMap.entries()) {
      this.X.MoveResizeWindow?.(winId, rect.x, rect.y, rect.width, rect.height);
    }
  }
}