import { ClientModel, Rectangle } from "../models/client";

export class LayoutService {
  public calculateMasterStack(
    clients: ClientModel[],
    screenWidth: number,
    screenHeight: number,
    gap = 8
  ): Map<number, Rectangle> {
    const layout = new Map<number, Rectangle>();
    const count = clients.length;

    if (count === 0) return layout;

    if (count === 1) {
      layout.set(clients[0].windowId, {
        x: gap,
        y: gap,
        width: screenWidth - gap * 2,
        height: screenHeight - gap * 2,
      });
      return layout;
    }

    const masterWidth = Math.floor((screenWidth - gap * 3) / 2);
    const stackWidth = masterWidth;

    layout.set(clients[0].windowId, {
      x: gap,
      y: gap,
      width: masterWidth,
      height: screenHeight - gap * 2,
    });

    const stackCount = count - 1;
    const stackHeight = Math.floor((screenHeight - gap * (stackCount + 1)) / stackCount);

    for (let i = 1; i < count; i++) {
      const y = gap + (i - 1) * (stackHeight + gap);
      layout.set(clients[i].windowId, {
        x: gap * 2 + masterWidth,
        y,
        width: stackWidth,
        height: stackHeight,
      });
    }

    return layout;
  }
}
