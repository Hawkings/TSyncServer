import {IPeer} from './IPeer';
import {Server} from './Server'
import events = require('events');
import {RemoteUpdateObjectKeyValue as UpdateKeyValue,} from '../sharedobject/Remote';

export class Peer extends events.EventEmitter implements IPeer {
  private mId: string;
  private objects: {
    [id: string]: {
      type: string,
      object: any
    }
  }
  private writeDriver;

  constructor(id: string, writeDriver: (any) => any) {
    super();
    this.mId = id;
    this.objects = {};

    this.writeDriver = writeDriver;

    this.on('message', (m) => {
      console.log(this.mId, m);
    })
  }

  isServer() {
    return true;
  }

  isClient() {
    return false;
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

  updateObject(json: any) {
    var x = this.objects[json.id];
    if (!x) {
      console.error("Peer " + this.mId + " trying to update " + json.id);
    }
    try {
      UpdateKeyValue(x.object, json.k, json.v);
      x.object.emit('tsync-change', json);
    } catch (e) {
      console.error("Peer " + this.mId + " tried to update " + json.k + " with value " + json.v + " throwing \n" + e);
    }
  }

  sendRaw(message: string) {
    this.writeDriver(message);
  }
}
