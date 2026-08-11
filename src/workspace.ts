import { Client } from "./client";
import { LayoutEngine } from "./layout";

export class Workspace {
  public id: number;
  public clients: Client[] = [];
  public activeClient: Client | null = null;
  public layoutEngine: LayoutEngine;

  constructor(id: number) {
    this.id = id;
    this.layoutEngine = new LayoutEngine();
  }

  public addClient(client: Client) {
    this.clients.push(client);
    this.activeClient = client;
  }

  public removeClient(winId: number): Client | null {
    const idx = this.clients.findIndex((c) => c.windowId === winId);
    if (idx !== -1) {
      const [removed] = this.clients.splice(idx, 1);
      if (this.activeClient?.windowId === winId) {
        this.activeClient = this.clients[this.clients.length - 1] || null;
      }
      return removed;
    }
    return null;
  }
}
