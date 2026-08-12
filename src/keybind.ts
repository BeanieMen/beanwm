import { WindowManager } from "./wm";

export interface KeyBinding {
  mod: number;
  keycode: number;
  description: string;
  action: (wm: WindowManager) => void;
}

export class KeybindManager {
  public static getBindings(): KeyBinding[] {
    const bindings: KeyBinding[] = [];
    // Mod1 (Alt) = 8, Mod1 + Shift = 9
    const MOD_ALT = 8;
    const MOD_ALT_SHIFT = 9;
    // 1. Alt + 1..9: Switch to Workspace 1..9
    for (let i = 0; i < 9; i++) {
      const keycode = 10 + i; // Keycode for 1 is 10, 2 is 11, ... 9 is 18
      bindings.push({
        mod: MOD_ALT,
        keycode,
        description: `Switch to workspace ${i + 1}`,
        action: (wm) => wm.switchToWorkspace(i),
      });
    }
    // 2. Alt + Shift + 1..9: Move active window to Workspace 1..9
    for (let i = 0; i < 9; i++) {
      const keycode = 10 + i;
      bindings.push({
        mod: MOD_ALT_SHIFT,
        keycode,
        description: `Move active window to workspace ${i + 1}`,
        action: (wm) => wm.moveActiveClientToWorkspace(i),
      });
    }
    // 3. Alt + Return (Keycode 36): Launch Terminal
    bindings.push({
      mod: MOD_ALT,
      keycode: 36,
      description: "Launch Terminal",
      action: (wm) => wm.spawnTerminal(),
    });
    // 4. Alt + Shift + Q (Keycode 24): Close Active Window
    bindings.push({
      mod: MOD_ALT_SHIFT,
      keycode: 24,
      description: "Close Active Window",
      action: (wm) => wm.killActiveClient(),
    });
    return bindings;
  }
}
