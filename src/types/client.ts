import * as x11 from "@berstend/node-x11-typescript";

type CreateClientCallback = Parameters<typeof x11.createClient>[1];

type CreateClientCallbackArgs = Parameters<CreateClientCallback>;

export type XDisplay = NonNullable<CreateClientCallbackArgs[1]>;
export type XClient = NonNullable<XDisplay["client"]> & {
  GrabKey?: (
    wid: number,
    ownerEvents: boolean,
    modifiers: number,
    key: number,
    pointerMode: number,
    keyboardMode: number
  ) => void;
};

export interface XEvent {
  name: string;
  window?: number;
  wid?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  borderWidth?: number;
  stackMode?: number;
  sibling?: number;
}