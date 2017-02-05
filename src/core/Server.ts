import websocket = require('websocket');
import http = require('http');
import events = require('events');

import {IPeer} from './IPeer';
import {Peer} from './Peer';
import {RemoteSetWriteDriver as SetWriteDriver} from '../sharedobject/Remote';

var WSServer = websocket.server;

interface IClass extends Function {
  name: string;
}

export class IServerConfig {
  sharedObjects?: [any]
}

// TODO: Bad way to do so
function randomID() {
  return Math.random() + "";
}

// TODO: This class is not finished
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

  private peers: { [id: string]: Peer };

  // TODO: This constructor is stub
  // TODO: Add arguments
  constructor(config: IServerConfig) {
    super()

    this.serverObjects = {};
    this.peers = {};

    if (config.sharedObjects) {
      config.sharedObjects.forEach((v) => {
        this.sharedObjectConstructors[v.name] = v;
      })
    }

    this.http = http.createServer(function(request, response) {
      console.log((new Date()) + ' Received request for ' + request.url);
      response.writeHead(404);
      response.end();
    })

    this.http.listen(8080, function() {
      console.log((new Date()) + ' Server is listening on port 8080');
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
      var id = randomID();
      var peer = new Peer(id,
        (w) => connection.sendUTF(w));

      this.peers[id] = peer;

      console.log((new Date()) + ' Connection accepted.');

      for (var k in this.serverObjects) {
        peer.sendObjectMetadata(k, this.serverObjects[k].type, "/");
      }

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
          if (json._ === "updateObject") {
            peer.updateObject(json);
          }
        }
      });
      connection.on('close', function(reasonCode, description) {
        // console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
      });

      this.emit("newPeer", peer);
    });
  }

  createSharedObject(id: string, objectConstructor: any, owner?: Peer, args?: [any]): any {
    var name = objectConstructor.name;
    if (name) {
      if (objectConstructor.name in this.sharedObjectConstructors) {
        let result = new (Function.prototype.bind.apply(this.sharedObjectConstructors[name], args));
        result.__remoteTable.id = id;
        if (owner instanceof Peer) {
          owner.registerRemote(result);
        } else {
          this.serverObjects[result.__remoteTable.id] = {
            type: name,
            object: result
          };
          SetWriteDriver(result, (key, value) => {
            this.broadcast(JSON.stringify({
              _: "updateObject",
              id: id,
              k: key,
              v: value
            }));
          });
        }
        return result;
      } else {
        throw "Object constructor " + objectConstructor.name + " not registered in constructor";
      }
    } else {
      throw "First argument must be a Class constructor";
    }
  }

  broadcast(message: string) {
    for (var k in this.peers) {
      this.peers[k].sendRaw(message);
    }
  }
}
