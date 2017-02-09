import {IPeer} from './IPeer';
import {Room} from './Room';
import {Server} from './Server'
import events = require('events');
import {RemoteUpdateMultipleValues as UpdateMultipleValues,
RemoteObject} from '../sharedobject/Remote';

export class Peer extends events.EventEmitter implements IPeer {
  private mId: string;
  private objects: {
    [id: string]: {
      type: string,
      object: any
    }
  }
  private writeDriver;
  private packet: any = {};
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
    return obj.__remoteInstance.id in this.objects;
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

  registerRemote(v) {
    this.objects[v.__remoteTable.id] = {
      type: v.constructor.name,
      object: v
    }
    this.sendObjectMetadata(v.__remoteTable.id, v.constructor.name, this.mId);
  }

  sendObjectMetadata(id: string, type: string, owner: string) {
    this.writeDriver(JSON.stringify({
      _: 'objectMetadata',
      id: id,
      type: type,
      owner: owner
    }));
  }

  updateObject(id: string, obj: any) {
    var x = this.objects[id];
    for (var k in obj) {
      try {
        UpdateMultipleValues(x.object, obj);
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
      this.packet.objectChanges[obj.__remoteInstance.id] =
      this.packet.objectChanges[obj.__remoteInstance.id] || {};
      for (var k in changes) {
        this.packet.objectChanges[obj.__remoteInstance.id][k] = changes[k];
      }
    })
      .on('joinRoom', (room: Room) => {
        this.rooms[room.path] = room;
      console.log('peer@newRoom');
    })
      .on('newObject', (obj, path) => {
      console.log('peer@newObject');
      // Object is owned by this peer
      if (path === '') {
        this.objects[obj.__remoteInstance.id] = {
          object: obj,
          type: obj.constructor.name
        };
      }
      this.packet.newObjects = this.packet.newObjects || {};
      this.packet.newObjects[obj.__remoteInstance.id] = {
        type: obj.constructor.name,
        path: path
      }
    })
      .on('leaveRoom', (path) => {
      console.log('peer@leaveRoom');
    })
      .on('destroyObject', (obj, path) => {
      console.log('peer@destroyObject');
    })
      .on('disconnect', () => {
      for (var k in this.rooms) {
        this.rooms[k].emit('peerLeave', this);
      }
    })
  }
}
