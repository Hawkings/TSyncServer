export interface IPacketServer {
  objectChanges?: { [id: string]: any }
  newObjects?: {
    [id: string]: {
      type: string,
      path: string
    }
  }
  destroyObjects?: string[]
}
