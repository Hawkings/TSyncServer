import {Peer} from './Peer';
import {Server} from './Server';
import {RemoteObject} from '../sharedobject/Remote';
import events = require("events");

const EventEmitter = events.EventEmitter;

export class Room extends EventEmitter {
  private parent: Room|null;
  private server: Server;
  private name: string;
  private watchers: Peer[];
  private objects: RemoteObject[];

  constructor(roomName: string, s: Server) {
    super();
    this.Drivers();

    this.parent = null;
    this.server = s;
    this.name = roomName;
    this.watchers = [];
    this.objects = [];
  }

  get path() {
    return (this.parent ? this.parent.path : '') + '/' + this.name;
  }

  add(el: Peer | RemoteObject | Room) {
    if (el instanceof Peer) {
      this.watchers.push(el);
    } else if (el instanceof Room) {
      if (el.server != this.server)
        throw 'Trying to add a Room inside another Room of different servers';
      el.parent = this;
    } else {
      this.objects.push(el);
      this.server.subscribeRoom(this, el);
    }
  }
  private Drivers() {
    this.on('peerJoin', (p: Peer) => {
      p.emit('newRoom', this.path);
      for (var k in this.objects) {
        p.emit('newObject', this.objects[k], this.path);
      }
      // TODO: Notify other peers??
    })
      .on('peerLeave', (p: Peer) => {
      // TODO: Notify peer
    })
      .on('objectJoin', (obj: RemoteObject) => {
        // Notify all watchers
      for (var k in this.watchers) {
        this.watchers[k].emit('newObject', obj, this.path);
      }
    })
      .on('objectLeave', (obj: RemoteObject) => {
      // TODO: Notify all peers
    })
      .on('objectChange', (obj: RemoteObject, changes: any) => {
      // Notify all watchers
      for (var k in this.watchers) {
        this.watchers[k].emit('objectChange', obj, changes);
      }
      // Notify parent room
      if (this.parent) {
        this.parent.emit('objectChange', obj, changes)
      }
    })
  }
}
