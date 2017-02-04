import websocket = require('websocket');
import http = require('http');
var WSServer = websocket.server;

// TODO: This class is stub
export class Server {
  private ws: websocket.server;
  private http: http.Server;

  // TODO: This constructor is stub
  // TODO: Add arguments
  constructor() {
    this.http = http.createServer(function(request, response) {
      console.log((new Date()) + ' Received request for ' + request.url);
      response.writeHead(404);
      response.end();
    })

    this.ws = new WSServer({
      httpServer: this.http,
      // TODO: Do not autoAcceptConnections
      autoAcceptConnections: true
    });
  }
}
