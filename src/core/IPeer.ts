export interface IPeer {
  isServer(): boolean;
  isClient(): boolean;
  id: string;
  remoteObjects(): {
    [id: string]: {
      type: string,
      object: any
    }
  }
  // TODO: remove sendRaw???
  sendRaw(m: string);
}
