import { Client } from "./client";
import { defaultConfig, WMConfig } from "./config";
import { LayoutEngine } from "./layout";
import { Workspace } from "./workspace";
import { XClient, XDisplay, XEvent } from "./types/client";
import { KeybindManager, KeyBinding } from "./keybind";
import * as x11 from "@berstend/node-x11-typescript";
import { spawn } from "child_process";

export class WindowManager {
  private x11: typeof x11;
  private X: XClient;
  private root: number;
  private screenWidth: number;
  private screenHeight: number;
  private config: WMConfig;
  private layoutEngine: LayoutEngine;
  private keybindings: KeyBinding[] = [];
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
    this.keybindings = KeybindManager.getBindings();

    // Default workspace initialization (0..8)
    for (let i = 0; i < 9; i++) {
      this.workspaces.push(new Workspace(i));
    }
  }

  private isSuperPressed = false;
  private isAltPressed = false;
  private isShiftPressed = false;

  public init(): void {
    console.log("[beanwm] Registering SubstructureRedirect, KeyPress & KeyRelease on Root Window...");

    const eventMask =
      this.x11.eventMask.SubstructureRedirect |
      this.x11.eventMask.SubstructureNotify |
      this.x11.eventMask.StructureNotify |
      this.x11.eventMask.KeyPress |
      this.x11.eventMask.KeyRelease;

    this.X.ChangeWindowAttributes?.(this.root, { eventMask });
    this.grabKeybindings();
    console.log("[beanwm] Window Manager & Keybindings active!");

    this.setupEvents();
  }

  private grabKeybindings(): void {
    for (const kb of this.keybindings) {
      // GrabKey(wid, ownerEvents, modifiers, keycode, pointerMode, keyboardMode)
      // Grab with specified modifier as well as 0 modifier so Xephyr unmapped modifiers work
      this.X.GrabKey?.(this.root, true, kb.mod, kb.keycode, 1, 1);
      this.X.GrabKey?.(this.root, true, 0, kb.keycode, 1, 1);
    }
  }

  private setupEvents(): void {
    this.X.on("event", (ev: XEvent & { keycode?: number; state?: number }) => {
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
        console.log(`[beanwm] MapRequest received for window ${winId}`);
        this.handleMapRequest(winId);
      } else if ((ev.name === "DestroyNotify" || ev.name === "UnmapNotify") && winId) {
        console.log(`[beanwm] Unmap/Destroy received for window ${winId}`);
        this.handleUnmap(winId);
      } else if (ev.name === "ConfigureRequest" && winId) {
        // Acknowledge ConfigureRequest without manually re-sending invalid stack/sibling properties
        console.log(`[beanwm] ConfigureRequest for window ${winId}`);
      }
    });
  }

  private handleKeyPress(keycode: number, state: number): void {
    // Ignore pure modifier presses
    if (keycode === 133 || keycode === 134 || keycode === 64 || keycode === 108 || keycode === 50 || keycode === 62) return;

    // Clean state by masking out Lock (2) and NumLock (16)
    let cleanState = state & ~(2 | 16);

    // Inject manual modifier state if Xephyr didn't include it in state
    if (this.isAltPressed) {
      cleanState |= 8; // MOD_ALT (Mod1)
    }
    if (this.isSuperPressed) {
      cleanState |= 64; // MOD_SUPER (Mod4)
    }
    if (this.isShiftPressed) {
      cleanState |= 1; // Shift mask bit
    }

    console.log(`[beanwm] [DEBUG KEYPRESS] Raw keycode: ${keycode}, Raw state: ${state}, Effective state: ${cleanState}`);
    const binding = this.keybindings.find((k) => k.keycode === keycode && k.mod === cleanState);
    if (binding) {
      console.log(`[beanwm] Keypress triggered: ${binding.description}`);
      binding.action(this);
    } else {
      console.log(`[beanwm] Unhandled keypress: keycode=${keycode}, state=${cleanState}`);
    }
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
    if (targetIndex < 0 || targetIndex >= this.workspaces.length || targetIndex === this.currentWorkspaceIndex) {
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
    console.log(`[beanwm] Switched to Workspace ${targetIndex + 1} (${newWs.clients.length} windows active)`);
  }

  public moveActiveClientToWorkspace(targetIndex: number): void {
    if (targetIndex < 0 || targetIndex >= this.workspaces.length || targetIndex === this.currentWorkspaceIndex) {
      return;
    }
    const currentWs = this.workspaces[this.currentWorkspaceIndex];
    const activeClient = currentWs.activeClient;

    if (!activeClient) return;

    currentWs.removeClient(activeClient.windowId);
    this.X.UnmapWindow?.(activeClient.windowId);
    this.applyCurrentLayout();

    const targetWs = this.workspaces[targetIndex];
    targetWs.addClient(activeClient);

    console.log(`[beanwm] Moved window ${activeClient.windowId} to Workspace ${targetIndex + 1}`);
  }

  public spawnTerminal(): void {
    const displayEnv = process.env.DISPLAY || ":2";
    console.log(`[beanwm] Spawning terminal (${this.config.terminal}) on ${displayEnv}`);
    
    // Strip WAYLAND_DISPLAY so Wayland-native apps like Kitty are forced onto Xephyr X11
    const { WAYLAND_DISPLAY, ...envWithoutWayland } = process.env;

    const child = spawn(this.config.terminal, [], {
      detached: true,
      stdio: ["ignore", "inherit", "inherit"],
      env: {
        ...envWithoutWayland,
        DISPLAY: displayEnv,
        GDK_BACKEND: "x11",
        QT_QPA_PLATFORM: "xcb",
        LIBGL_ALWAYS_SOFTWARE: "1",
        LANG: "C",
        LC_ALL: "C",
      },
    });
    child.on("error", (err) => {
      console.error(`[beanwm] Failed to spawn terminal (${this.config.terminal}):`, err.message);
    });
    child.unref();
  }

  public killActiveClient(): void {
    const currentWs = this.workspaces[this.currentWorkspaceIndex];
    if (currentWs.activeClient) {
      console.log(`[beanwm] Killing window ${currentWs.activeClient.windowId}`);
      this.X.DestroyWindow?.(currentWs.activeClient.windowId);
    }
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