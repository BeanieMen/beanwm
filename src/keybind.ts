import { WindowManager } from './wm';

export interface KeyBinding {
    mod: number;
    keysym: number;
    action: (wm: WindowManager) => void;
}

export class KeybindManager {
    public static createWorkspaceBindings(): KeyBinding[]{
        const bindings: KeyBinding[] = [];
        for (let i = 0; i<9; i++){
            const keysymNumber = 0x0031 + i; // 0x0031 is the keysym for '1'
            bindings.push({
                mod: 64, // Mod1Mask (Mod4)
                keysym: keysymNumber,
                action: (wm: WindowManager) => {
                    wm.switchToWorkspace(i);
                }
            })
        }
        return bindings;
    }
}