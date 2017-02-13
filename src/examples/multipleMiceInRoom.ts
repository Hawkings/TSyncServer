import {Server} from '../core/Server';
import {Peer} from '../core/Peer';
import {Remote, Member, RemoteObject} from '../sharedobject/Remote'
import {Validators as RV} from '../sharedobject/Validators'
import {Room} from '../core/Room'
import events = require("events");

@Remote
class ExampleMouse extends events.EventEmitter {
  @Member(RV.isNumber.isGreaterOrEqual(0).isInteger)
  public x: number;
  @Member(RV.isNumber.isGreaterOrEqual(0).isInteger)
  public y: number;
}

var s = new Server({
  sharedObjects: [ExampleMouse]
})

var miceRoom = new Room("mice", s);

s.on('newPeer', (peer: Peer) => {
  // Peer's owned pointer
  var peerMouse = s.createSharedObject<ExampleMouse>(peer.id + "mouse", ExampleMouse, peer);
  miceRoom.add(peerMouse);
  // either
  miceRoom.add(peer);
});
