import {Server} from './core/Server';
import {Peer} from './core/Peer';
import {Remote, Member} from './sharedobject/Remote'
import {Validators as RV} from './sharedobject/Validators'
import events = require("events");

@Remote
class ExampleSyncedRanger extends events.EventEmitter {
  @Member(RV.isNumericString.isGreatOrEqual(0).isLessOrEqual(100))
  public value: string;
}

var s = new Server({
  sharedObjects: [ExampleSyncedRanger]
})

// Server's owned slider
var serverRanger: ExampleSyncedRanger = s.createSharedObject("serverRange", ExampleSyncedRanger);

s.on('newPeer', (p: Peer) => {
  // Peer's owned slider
  var peerRanger: ExampleSyncedRanger = s.createSharedObject("clientRange", ExampleSyncedRanger, p);
  peerRanger.on("change", (v) => {
    serverRanger.value = peerRanger.value;
  });
});
