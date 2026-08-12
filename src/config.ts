export interface WMConfig {
    modKey: number; // 64 = Super/Windows key, 8 = Alt
    borderWidth: number;
    focusedBorderColor: number;
    unfocusedBorderColor: number;
    gapSize: number;
    terminal: string;
}

export const defaultConfig: WMConfig = {
    modKey: 64,
    borderWidth: 2,
    focusedBorderColor: 0x89b4fa, // Catppuccin Mocha Blue
    unfocusedBorderColor: 0x45475a, // Dark Gray
    gapSize: 8,
    terminal: "xterm",
};
