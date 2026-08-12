import { Client, Rectangle } from "./client";

export class LayoutEngine {
  public calculateLayout(
    clients: Client[],
    screenWidth: number,
    screenHeight: number,
    gap: number = 8
  ): Map<number, Rectangle> {
    const layoutMap = new Map<number, Rectangle>();
    const n = clients.length;

    if (n === 0) return layoutMap;

    // Single window -> Takes full screen minus gaps
    if (n === 1) {
      layoutMap.set(clients[0].windowId, {
        x: gap,
        y: gap,
        width: screenWidth - gap * 2,
        height: screenHeight - gap * 2,
      });
      return layoutMap;
    }

    // Master-Stack Layout: Master takes left 50%, Stack takes right 50%
    const masterWidth = Math.floor((screenWidth - gap * 3) / 2);
    const stackWidth = masterWidth;

    // 1. Master Window (First Client)
    layoutMap.set(clients[0].windowId, {
      x: gap,
      y: gap,
      width: masterWidth,
      height: screenHeight - gap * 2,
    });

    // 2. Stack Windows (Remaining Clients stacked vertically)
    const stackCount = n - 1;
    const stackHeight = Math.floor((screenHeight - gap * (stackCount + 1)) / stackCount);

    for (let i = 1; i < n; i++) {
      const client = clients[i];
      const stackIndex = i - 1;
      const y = gap + stackIndex * (stackHeight + gap);

      layoutMap.set(client.windowId, {
        x: gap * 2 + masterWidth,
        y: y,
        width: stackWidth,
        height: stackHeight,
      });
    }

    return layoutMap;
  }
}