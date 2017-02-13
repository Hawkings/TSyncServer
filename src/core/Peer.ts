import {IPacketServer as PacketServer} from './IPacket';
import {Room} from './Room';
import {Server} from './Server'
import events = require('events');
import {RemoteUtils as rUtils,
RemoteObject} from '../sharedobject/Remote';

export class Peer extends events.EventEmitter {
  private mId: string;
  private objects: {
    [id: string]: {
      type: string,
      object: any
    }
  }
  private writeDriver;
  private packet: PacketServer = {};
  private rooms: {[path:string] : Room} = {};

  constructor(id: string, writeDriver: (any) => any) {
    super();
    this.Drivers();

    this.mId = id;
    this.objects = {};

    this.writeDriver = writeDriver;

  }

  isServer() {
    return false;
  }

  isClient() {
    return true;
  }

  isOwner(id: string) {
    return id in this.objects;
  }

  isOwnerObject(obj: RemoteObject) {
    return rUtils.GetId(obj) in this.objects;
  }

  get id(): string {
    return this.mId;
  }

  set id(v) {
    if (!this.mId)
      this.mId = v;
    else
      throw "Can not overwrite " + this.mId + " Peer's id";
  }

  remoteObjects() {
    return this.objects;
  }

  updateObject(id: string, obj: any) {
    var x = this.objects[id];
    for (var k in obj) {
      try {
        rUtils.UpdateMultipleValues(x.object, obj);
      } catch (e) {
        console.error("Peer " + this.mId + " tried to update " + id + " with values " + obj + " throwing \n" + e);
        return;
      }
    }
    // TODO: this should not be used.
    if ('on' in x.object && 'emit' in x.object)
      x.object.emit('tsync-change', obj);
  }

  flush(): void {
    console.log("peer@flush");
    if (Object.keys(this.packet).length) {
      this.writeDriver(JSON.stringify(this.packet));
      this.packet = {};
    }
  }

  sendRaw(message: string) {
    this.writeDriver(message);
  }

  private Drivers() {
    this.on('objectChange', (obj, changes, path) => {
      console.log("peer@objectChange", obj, changes);
      this.packet.objectChanges =
      this.packet.objectChanges || {};
      this.packet.objectChanges[rUtils.GetId(obj)] =
      this.packet.objectChanges[rUtils.GetId(obj)] || {};
      for (var k in changes) {
        this.packet.objectChanges[rUtils.GetId(obj)][k] = changes[k];
      }
    })
    .on('joinRoom', (room: Room) => {
        console.log('peer@newRoom');
        this.rooms[room.path] = room;
    })
    .on('newObject', (obj, path) => {
      console.log('peer@newObject');
      // Object is owned by this peer
      if (path === '') {
        this.objects[rUtils.GetId(obj)] = {
          object: obj,
          type: obj.constructor.name
        };
      }
      this.packet.newObjects = this.packet.newObjects || {};
      this.packet.newObjects[rUtils.GetId(obj)] = {
        type: obj.constructor.name,
        path: path
      }
    })
    .on('leaveRoom', (path) => {
      console.log('peer@leaveRoom');
      delete this.rooms[path];
    })
    .on('destroyObject', (obj, path) => {
      console.log('peer@destroyObject');
      var id = rUtils.GetId(obj);
      if (id in this.objects)
        delete this.objects[id];
      this.packet.destroyObjects = this.packet.destroyObjects || [];
      this.packet.destroyObjects.push(id);
    })
    .on('disconnect', () => {
      for (var k in this.rooms) {
        this.rooms[k].emit('peerLeave', this);
      }
    })
  }
}
