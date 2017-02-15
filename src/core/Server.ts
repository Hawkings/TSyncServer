import websocket = require('websocket');
import http = require('http');
import events = require('events');

import {Room} from './Room';
import {Peer} from './Peer';
import {RemoteUtils as rUtils, RemoteObject} from '../sharedobject/Remote';

const SERVER_PATH = "/";
const NO_PATH = "";

var WSServer = websocket.server;

interface IClass extends Function {
  name: string;
}

export class IServerConfig {
  sharedObjects?: any[];
  port?: number;
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

// TODO: add events signatures
export class Server extends events.EventEmitter {
  private ws: websocket.server;
  private http: http.Server;

  private sharedObjectConstructors = {};
  private serverObjects: {
    [id: string]: {
      type: string,
      object: any
    }
  }
  private otherObjects: {
    [id: string]: {
      type: string,
      object: any,
      owner: string
    }
  }

  private peers: { [id: string]: Peer };
  private packets: { [peerId: string]: any };
  private rooms: { [id: string]: Room };
  private subs: { [objectId: string]: Room[] }
  private triggering: boolean = false;

  // TODO: This constructor is stub
  constructor(config: IServerConfig) {
    super()
    this.Drivers();

    this.otherObjects = {};
    this.serverObjects = {};
    this.peers = {};
    this.rooms = {};
    this.subs = {};

    if (config.sharedObjects) {
      config.sharedObjects.forEach((v) => {
        if (rUtils.IsRemoteClass(v)) {
          this.sharedObjectConstructors[v.name] = v;
        } else {
          throw 'Class ' + v['name'] + ' is not @Remote decorated';
        }
      })
    }

    this.http = http.createServer(function(request, response) {
      response.writeHead(404);
      response.end();
    })

    this.http.listen(config.port || 8080, function() {
      console.log((new Date()) + ' Server is listening on port ' + config.port || 8080);
    });

    this.ws = new WSServer({
      httpServer: this.http,
      autoAcceptConnections: false
    });

    this.ws.on('request', (request) => {
      // TODO: Do not accept any origin

      // if (!originIsAllowed(request.origin)) {
      //   // Make sure we only accept requests from an allowed origin
      //   request.reject();
      //   console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      //   return;
      // }
      var connection = request.accept('tsync', request.origin);
      var id = uuid();
      var peer = new Peer(id,
        (w) => connection.sendUTF(w));

      this.peers[id] = peer;
      this.emit('newPeer', peer);

      connection.on('message', (message) => {
        // if (message.type === 'utf8') {
        //   console.log('Received Message: ' + message.utf8Data);
        //   connection.sendUTF(<string>message.utf8Data);
        // }
        // else if (message.type === 'binary') {
        //   console.log('Received Binary Message of ' + (<Buffer>message.binaryData).length + ' bytes');
        //   connection.sendBytes(<Buffer>message.binaryData);
        // }
        if (message.utf8Data) {
          var json = JSON.parse(message.utf8Data);
          console.log(json);
          if ('objectChanges' in json) {
            for (var id in json.objectChanges) {
              if (id in this.otherObjects) {
                // Check ownage:
                if (peer.isOwner(id)) {
                  peer.updateObject(id, json.objectChanges[id]);
                } else {
                  console.log('Peer trying to update ' + id + ' object.');
                }
                this.emit('remoteObjectChange', this.otherObjects[id].object, json.objectChanges[id]);
              }
            }
          }
        }
      });
      connection.on('close', (reasonCode, description) => {
        this.emit('peerDisconnect', peer);
      });
    });
  }

  createSharedObject<T>(id: string, objectConstructor: any, owner?: Peer, args?: [any]): RemoteObject & T  {
    var name = objectConstructor.name;
    if (name) {
      if (objectConstructor.name in this.sharedObjectConstructors) {
        // CHORIZO: correct way to call constructor given an array of arguments
        let result: RemoteObject&T = new (Function.prototype.bind.apply(this.sharedObjectConstructors[name], args));
        // TODO: do not use remoteInstance directly
        result.__remoteInstance.id = id;
        if (!owner) {
          this.serverObjects[id] = {
            type: name,
            object: result
          };
          rUtils.SetDriver(result, (key, value) => {
            this.emit('localObjectChange', result, key);
          });
        } else {
          this.otherObjects[id] = {
            type: name,
            object: result,
            owner: owner.id
          };
          rUtils.ChangeOwnership(result, false);
        }
        this.emit('newObject', result, owner || this);
        return result;
      } else {
        throw "Object constructor " + objectConstructor.name + " not registered in constructor";
      }
    } else {
      throw "First argument must be a Class constructor";
    }
  }

  subscribeRoom(r: Room, obj: RemoteObject) {
    this.subs[rUtils.GetId(obj)] = this.subs[rUtils.GetId(obj)] || [];
    this.subs[rUtils.GetId(obj)].push(r);
  }


  triggerUpdates() {
    if (this.triggering)
      return;
    this.triggering = true;
    setTimeout((v) => {
      this.triggering = false;
      this.flush();
    }, 0);
  }

  private flush() {
    for (var k in this.peers) {
      this.peers[k].flush();
    }
  }

  private Drivers() {
    this.on('newObject', (obj: RemoteObject, owner: Peer|this) => {
      console.log('server@newObject');
      // If object's owner is server, assume it is in path SERVER_PATH
      if (owner === this) {
        for (var k in this.peers) {
          this.peers[k].emit('newObject', obj, SERVER_PATH);
        }
      }
      // If object's owner is a peer, don't apply any path
      else {
        owner.emit('newObject', obj, NO_PATH);
      }
      this.triggerUpdates();
    }).on('objectDestroy', (obj: RemoteObject) => {
      console.log('server@objectDestroy');
      var id = rUtils.GetId(obj);
      var d1 = this.otherObjects[id];
      if (d1) {
        if (d1.owner in this.peers) {
          this.peers[d1.owner].emit('objectDestroy', obj);
          this.subs[id].forEach((v) => {
            v.emit('objectDestroy', obj);
          });
          delete this.otherObjects[id];
        }
      } else {
        var d2 = this.serverObjects[id];
        if (d2) {
          for (var k in this.peers) {
            this.peers[k].emit('objectDestroy', obj);
          }
          delete this.serverObjects[id];
        } else {
          console.error('Destroying unkown object.')
        }
      }
      this.triggerUpdates();
    }).on('newPeer', (p: Peer) => {
      console.log('server@newPeer');
      for (var k in this.serverObjects) {
        p.emit('newObject', this.serverObjects[k].object, SERVER_PATH);
      }
      // TODO: Notify server config (if any)
      this.triggerUpdates();
    }).on('peerDisconnect', (p: Peer) => {
      console.log('server@peerDisconnect');
      p.emit('disconnect');
      delete this.peers[p.id];
      // TODO: Destroy objects (configurable)
      this.triggerUpdates();
    }).on('localObjectChange', (obj: RemoteObject, key: string) => {
      console.log('server@localObjectChange');
      // NOTE: Don't notify anyone else: Room's must notify peers about changes.
      var changes = {};
      changes[key] = obj[key];
      var x = this.subs[rUtils.GetId(obj)] || [];
      x.forEach((v) => {
        v.emit('objectChange');
      })
      if (rUtils.GetOwn(obj)) {
        for (var k in this.peers) {
          this.peers[k].emit('objectChange', obj, changes);
        }
      }
      this.triggerUpdates();
    }).on('remoteObjectChange', (obj: RemoteObject, changes: any) => {
      console.log('server@remoteObjectChange');
      // NOTE: Don't notify anyone else: Room's must notify peers about changes.
      var x = this.subs[rUtils.GetId(obj)] || [];
      x.forEach((v) => {
        v.emit('objectChange', obj, changes);
      })
      this.triggerUpdates();
    })
  }
}
