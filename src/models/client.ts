export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ClientModel {
  public readonly windowId: number;
  public geometry: Rectangle;
  public isFloating: boolean;

  constructor(windowId: number, geometry: Rectangle, isFloating = false) {
    this.windowId = windowId;
    this.geometry = geometry;
    this.isFloating = isFloating;
  }
}
