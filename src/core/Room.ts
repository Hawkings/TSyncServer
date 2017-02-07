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
      var watcher = el;
      this.watchers.push(el);
      this.objects.forEach((v) => {
        this.server.subscribe(watcher, this.path, v);
      });
    } else if (el instanceof Room) {
      if (el.server != this.server)
        throw 'Trying to add a Room of a server inside Room of another server';
      el.parent = this;
    } else {
      var peer = el;
      this.objects.push(el);
      this.watchers.forEach((v) => {
        this.server.subscribe(v, this.path, peer);
      })
    }
  }
}

function RoomDrivers(r: Room) {
  r.on('peerJoin', (p: Peer) => {
    // TODO: Notify peer
    // TODO: Notify other peers??
  })
  .on('peerLeave', (p: Peer) => {
    // TODO: Notify peer
  })
  .on('objectJoin', (obj: RemoteObject) => {
    // TODO: Notify all peers
  })
  .on('objectLeave', (obj: RemoteObject) => {
    // TODO: Notify all peers
  })
  .on('objectChange', (obj: RemoteObject) => {
    // TODO: Notify all peers
  })
}
