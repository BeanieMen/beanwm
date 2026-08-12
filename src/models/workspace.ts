import { ClientModel } from "./client";

export class WorkspaceModel {
  public readonly id: number;
  public clients: ClientModel[] = [];
  public activeClient: ClientModel | null = null;

  constructor(id: number) {
    this.id = id;
  }

  public addClient(client: ClientModel): void {
    this.clients.push(client);
    this.activeClient = client;
  }

  public removeClient(winId: number): ClientModel | null {
    const index = this.clients.findIndex((c) => c.windowId === winId);
    if (index === -1) return null;

    const [removed] = this.clients.splice(index, 1);
    if (this.activeClient?.windowId === winId) {
      this.activeClient = this.clients[this.clients.length - 1] || null;
    }
    return removed;
  }
}
