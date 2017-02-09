export interface IPeer {
  isServer(): boolean;
  isClient(): boolean;
  isOwner(id: string): boolean;
  id: string;
  remoteObjects(): {
    [id: string]: {
      type: string,
      object: any
    }
  }
  flush(): void;
  // TODO: remove sendRaw???
  sendRaw(m: string): void;
}
