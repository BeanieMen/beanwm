import * as x11 from "@berstend/node-x11-typescript";
import { defaultConfig, WMConfig } from "./config";
import { ClientModel } from "./models/client";
import { WorkspaceModel } from "./models/workspace";
import { LayoutService } from "./services/layout.service";
import { KeybindService, KeyBinding } from "./services/keybind.service";
import { ProcessService } from "./services/process.service";
import { XClient, XDisplay, XEvent } from "./types/client";

export class WindowManager {
  private readonly x11: typeof x11;
  private readonly X: XClient;
  private readonly root: number;
  private readonly screenWidth: number;
  private readonly screenHeight: number;
  private readonly config: WMConfig;
  private readonly layoutService: LayoutService;
  private readonly keybindings: KeyBinding[];

  public readonly workspaces: WorkspaceModel[] = [];
  public currentWorkspaceIndex = 0;

  private isSuperPressed = false;
  private isAltPressed = false;
  private isShiftPressed = false;

  constructor(x11Client: typeof x11, display: XDisplay) {
    this.x11 = x11Client;
    if (!display.client) throw new Error("Display client undefined");

    this.X = display.client;
    const screen = display.screen[0];
    this.root = screen.root;
    this.screenWidth = screen.pixel_width;
    this.screenHeight = screen.pixel_height;
    this.config = defaultConfig;
    this.layoutService = new LayoutService();
    this.keybindings = KeybindService.getBindings();

    for (let i = 0; i < 9; i++) {
      this.workspaces.push(new WorkspaceModel(i));
    }
  }

  public init(): void {
    const eventMask =
      this.x11.eventMask.SubstructureRedirect |
      this.x11.eventMask.SubstructureNotify |
      this.x11.eventMask.StructureNotify |
      this.x11.eventMask.KeyPress |
      this.x11.eventMask.KeyRelease;

    this.X.ChangeWindowAttributes?.(this.root, { eventMask });
    this.grabKeybindings();
    this.setupEvents();
  }

  private grabKeybindings(): void {
    for (const kb of this.keybindings) {
      this.X.GrabKey?.(this.root, true, kb.mod, kb.keycode, 1, 1);
      this.X.GrabKey?.(this.root, true, 0, kb.keycode, 1, 1);
    }
  }

  private setupEvents(): void {
    this.X.on("event", (ev: XEvent) => {
      const winId = ev.wid ?? ev.window;

      if (ev.name === "KeyPress" && ev.keycode !== undefined) {
        if (ev.keycode === 133 || ev.keycode === 134) this.isSuperPressed = true;
        if (ev.keycode === 64 || ev.keycode === 108) this.isAltPressed = true;
        if (ev.keycode === 50 || ev.keycode === 62) this.isShiftPressed = true;
        this.handleKeyPress(ev.keycode, ev.state ?? 0);
      } else if (ev.name === "KeyRelease" && ev.keycode !== undefined) {
        if (ev.keycode === 133 || ev.keycode === 134) this.isSuperPressed = false;
        if (ev.keycode === 64 || ev.keycode === 108) this.isAltPressed = false;
        if (ev.keycode === 50 || ev.keycode === 62) this.isShiftPressed = false;
      } else if (ev.name === "MapRequest" && winId) {
        this.handleMapRequest(winId);
      } else if ((ev.name === "DestroyNotify" || ev.name === "UnmapNotify") && winId) {
        this.handleUnmap(winId);
      }
    });
  }

  private handleKeyPress(keycode: number, state: number): void {
    if (keycode === 133 || keycode === 134 || keycode === 64 || keycode === 108 || keycode === 50 || keycode === 62) return;

    let cleanState = state & ~(2 | 16);
    if (this.isAltPressed) cleanState |= 8;
    if (this.isSuperPressed) cleanState |= 64;
    if (this.isShiftPressed) cleanState |= 1;

    const binding = this.keybindings.find((k) => k.keycode === keycode && k.mod === cleanState);
    binding?.action(this);
  }

  private handleMapRequest(winId: number): void {
    const ws = this.workspaces[this.currentWorkspaceIndex];
    if (!ws || ws.clients.some((c) => c.windowId === winId)) return;

    const client = new ClientModel(winId, { x: 0, y: 0, width: 400, height: 300 });
    ws.addClient(client);

    this.X.MapWindow?.(winId);
    this.applyCurrentLayout();
  }

  private handleUnmap(winId: number): void {
    for (const ws of this.workspaces) {
      if (ws.removeClient(winId) && ws.id === this.currentWorkspaceIndex) {
        this.applyCurrentLayout();
        break;
      }
    }
  }

  public switchToWorkspace(targetIndex: number): void {
    if (targetIndex < 0 || targetIndex >= this.workspaces.length || targetIndex === this.currentWorkspaceIndex) return;

    const oldWs = this.workspaces[this.currentWorkspaceIndex];
    const newWs = this.workspaces[targetIndex];

    for (const c of oldWs.clients) this.X.UnmapWindow?.(c.windowId);
    this.currentWorkspaceIndex = targetIndex;
    for (const c of newWs.clients) this.X.MapWindow?.(c.windowId);

    this.applyCurrentLayout();
  }

  public moveActiveClientToWorkspace(targetIndex: number): void {
    if (targetIndex < 0 || targetIndex >= this.workspaces.length || targetIndex === this.currentWorkspaceIndex) return;

    const currentWs = this.workspaces[this.currentWorkspaceIndex];
    const activeClient = currentWs.activeClient;
    if (!activeClient) return;

    currentWs.removeClient(activeClient.windowId);
    this.X.UnmapWindow?.(activeClient.windowId);
    this.applyCurrentLayout();

    this.workspaces[targetIndex].addClient(activeClient);
  }

  public spawnTerminal(): void {
    ProcessService.spawnProcess(this.config.terminal, process.env.DISPLAY || ":2");
  }

  public killActiveClient(): void {
    const activeClient = this.workspaces[this.currentWorkspaceIndex].activeClient;
    if (activeClient) {
      this.X.DestroyWindow?.(activeClient.windowId);
    }
  }

  public applyCurrentLayout(): void {
    const ws = this.workspaces[this.currentWorkspaceIndex];
    if (!ws) return;

    const layout = this.layoutService.calculateMasterStack(
      ws.clients,
      this.screenWidth,
      this.screenHeight,
      this.config.gapSize
    );

    for (const [winId, rect] of layout.entries()) {
      this.X.MoveResizeWindow?.(winId, rect.x, rect.y, rect.width, rect.height);
    }
  }
}