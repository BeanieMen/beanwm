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
  private readonly config = defaultConfig;
  private readonly layoutService = new LayoutService();
  private readonly keybindings = KeybindService.getBindings();

  public readonly workspaces = Array.from({ length: 9 }, (_, i) => new WorkspaceModel(i));
  public currentWorkspaceIndex = 0;

  private modifiers = 0;

  constructor(x11Client: typeof x11, display: XDisplay) {
    this.x11 = x11Client;
    if (!display.client) throw new Error("Display client undefined");

    this.X = display.client;
    const s = display.screen[0];
    this.root = s.root;
    this.screenWidth = s.pixel_width;
    this.screenHeight = s.pixel_height;
  }

  public init(): void {
    this.X.ChangeWindowAttributes?.(this.root, {
      eventMask:
        this.x11.eventMask.SubstructureRedirect |
        this.x11.eventMask.SubstructureNotify |
        this.x11.eventMask.StructureNotify |
        this.x11.eventMask.KeyPress |
        this.x11.eventMask.KeyRelease,
    });

    for (const { mod, keycode } of this.keybindings) {
      this.X.GrabKey?.(this.root, true, mod, keycode, 1, 1);
      this.X.GrabKey?.(this.root, true, 0, keycode, 1, 1);
    }

    this.X.on("event", ev => {
      const key = ev.keycode;
      const win = ev.wid ?? ev.window;

      if (key !== undefined) {
        if (ev.name === "KeyPress") return this.keyPress(key, ev.state ?? 0);
        if (ev.name === "KeyRelease") return this.keyRelease(key);
      }

      if (win) {
        if (ev.name === "MapRequest") this.map(win);
        else if (ev.name === "DestroyNotify" || ev.name === "UnmapNotify") this.unmap(win);
      }
    });
  }

  private keyPress(key: number, state: number): void {
    if (this.updateModifier(key, true)) return;

    let mod = state & ~(2 | 16);
    mod |= this.modifiers;

    this.keybindings.find(k => k.keycode === key && k.mod === mod)?.action(this);
  }

  private keyRelease(key: number): void {
    this.updateModifier(key, false);
  }

  private updateModifier(key: number, pressed: boolean): boolean {
    const masks: Record<number, number> = {
      133: 64, 134: 64, // Super
      64: 8, 108: 8,   // Alt
      50: 1, 62: 1,    // Shift
    };

    const mask = masks[key];
    if (!mask) return false;

    this.modifiers = pressed ? this.modifiers | mask : this.modifiers & ~mask;
    return true;
  }

  private map(winId: number): void {
    const ws = this.workspaces[this.currentWorkspaceIndex];
    if (!ws || ws.clients.some(c => c.windowId === winId)) return;

    ws.addClient(new ClientModel(winId, {
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    }));

    this.X.MapWindow?.(winId);
    this.applyCurrentLayout();
  }

  private unmap(winId: number): void {
    const ws = this.workspaces.find(ws => ws.removeClient(winId));

    if (ws?.id === this.currentWorkspaceIndex)
      this.applyCurrentLayout();
  }

  public switchToWorkspace(target: number): void {
    if (
      target < 0 ||
      target >= this.workspaces.length ||
      target === this.currentWorkspaceIndex
    ) return;

    const oldWs = this.workspaces[this.currentWorkspaceIndex];
    const newWs = this.workspaces[target];

    oldWs.clients.forEach(c => this.X.UnmapWindow?.(c.windowId));
    this.currentWorkspaceIndex = target;
    newWs.clients.forEach(c => this.X.MapWindow?.(c.windowId));

    this.applyCurrentLayout();
  }

  public moveActiveClientToWorkspace(target: number): void {
    if (
      target < 0 ||
      target >= this.workspaces.length ||
      target === this.currentWorkspaceIndex
    ) return;

    const current = this.workspaces[this.currentWorkspaceIndex];
    const client = current.activeClient;
    if (!client) return;

    current.removeClient(client.windowId);
    this.X.UnmapWindow?.(client.windowId);
    this.applyCurrentLayout();

    this.workspaces[target].addClient(client);
  }

  public spawnTerminal(): void {
    ProcessService.spawnProcess(
      this.config.terminal,
      process.env.DISPLAY || ":2"
    );
  }

  public killActiveClient(): void {
    const client = this.workspaces[this.currentWorkspaceIndex].activeClient;
    if (client) this.X.DestroyWindow?.(client.windowId);
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

    layout.forEach((r, id) =>
      this.X.MoveResizeWindow?.(id, r.x, r.y, r.width, r.height)
    );
  }
}
