import { WindowManager } from "../wm";

export interface KeyBinding {
  mod: number;
  keycode: number;
  action: (wm: WindowManager) => void;
}

export class KeybindService {
  public static getBindings(): KeyBinding[] {
    const bindings: KeyBinding[] = [];
    const MOD_ALT = 8;
    const MOD_ALT_SHIFT = 9;

    for (let i = 0; i < 9; i++) {
      const keycode = 10 + i;
      bindings.push({
        mod: MOD_ALT,
        keycode,
        action: (wm) => wm.switchToWorkspace(i),
      });
      bindings.push({
        mod: MOD_ALT_SHIFT,
        keycode,
        action: (wm) => wm.moveActiveClientToWorkspace(i),
      });
    }

    bindings.push({
      mod: MOD_ALT,
      keycode: 36,
      action: (wm) => wm.spawnTerminal(),
    });

    bindings.push({
      mod: MOD_ALT_SHIFT,
      keycode: 24,
      action: (wm) => wm.killActiveClient(),
    });

    return bindings;
  }
}
