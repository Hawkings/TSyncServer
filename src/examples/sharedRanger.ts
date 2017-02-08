import {Server} from '../core/Server';
import {Peer} from '../core/Peer';
import {Remote, Member, RemoteObject} from '../sharedobject/Remote'
import {Validators as RV} from '../sharedobject/Validators'
import events = require("events");

@Remote
class ExampleSyncedRanger {
  @Member(RV.isNumericString.isGreatOrEqual(0).isLessOrEqual(100))
  public value: string;
}

var s = new Server({
  sharedObjects: [ExampleSyncedRanger]
})

// Server's owned slider
var serverRanger = s.createSharedObject<ExampleSyncedRanger>("serverRange", ExampleSyncedRanger);

// For every new peer create his own Ranger
s.on('newPeer', (p: Peer) => {
  var peerRanger = s.createSharedObject<ExampleSyncedRanger>("clientRange", ExampleSyncedRanger, p);
})
// Whenever a client changes his ranger, update server's ranger:
.on('remoteObjectChange', (obj: RemoteObject) => {
  if (obj instanceof ExampleSyncedRanger) {
    serverRanger.value = obj.value;
  }
});
