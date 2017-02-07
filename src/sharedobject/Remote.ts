import {ValidatorChain, Validator} from './Validators';

// TODO: Use this interface instead of using any.
export interface RemoteObject {
  __remoteTable;
  __remoteInstance;
}

function RemoteMemberGetter(member) {
  return () => this.__remoteInstance.sharedValues[member];
}

function RemoteValidate(remoteObject: any, member: string, v: any) {
  var val: Function | [Validator] = remoteObject.__remoteTable.sharedMembers[member];
  if (typeof val === "function") {
    let v2 = val(v);
    if (typeof v2 === "undefined") {
      throw "Validator failed";
    }
    return v2;
  } else {
    var lastval = v;
    val.forEach((v) => {
      lastval = v(lastval);
      if (typeof lastval === "undefined") {
        throw "Validator failed";
      }
    });
    return lastval;
  }
}

function RemoteOwnedMemberSetter(member: string) {
  return (v) => {

    var val = RemoteValidate(this, member, v);
    this.__remoteInstance.sharedValues[member] = val;
    if (this.__remoteInstance.writeDriver)
      this.__remoteInstance.writeDriver(member, val);
  }
}

function RemoteForeignMemberSetter(member: string) {
  return () => { throw "Cannot set " + member + " because you don't have ownership of this Object." };
}

export function RemoteSetWriteDriver(remoteObject, driver: (key: string, value: any) => any) {
  if (!remoteObject.__remoteTable) {
    throw "Object does not contain Remote members.";
  }
  remoteObject.__remoteInstance.writeDriver = driver;
}

export function RemoteChangeOwnership(remoteObject: any, imOwner: boolean) {
  if (!remoteObject.__remoteTable) {
    throw "Object does not contain Remote members.";
  }
  if (remoteObject.__remoteInstance.own != imOwner) {
    for (var k in remoteObject.__remoteTable) {
      Object.defineProperty(remoteObject, k, {
        get: RemoteMemberGetter.call(remoteObject, k),
        set: (imOwner ? RemoteOwnedMemberSetter : RemoteForeignMemberSetter).call(remoteObject, k),
        configurable: true
      })
    }
    remoteObject.__remoteInstance.own = imOwner;
  }
}

export function RemoteUpdateObjectKeyValue(remoteObject: any, member: string, value: any) {
  if (!remoteObject.__remoteTable) {
    throw "Object does not contain Remote members.";
  }
  if (member in remoteObject.__remoteTable.sharedMembers) {
    let v = RemoteValidate(remoteObject, member, value);
    if (typeof v === "undefined") {
      throw "Value " + value + " for member " + remoteObject.constructor.name + "." + member + "is not valid.";
    }
    remoteObject.__remoteInstance.sharedValues[member] = v;
  } else {
    throw "Object does not contain Remote member " + member;
  }
}

export function Remote(constructor: Function): any {
  if (!('__remoteTable' in constructor.prototype)) {
    throw "No remote members. Use @Member in at least one member";
  }

  var x = function() {
    constructor.apply(this, arguments);
    this.__remoteInstance = {
      sharedValues: {},
      own: true,
      writeDriver: null,
      readDriver: null,
      uuid: null
    }

    for (var k in this.__remoteTable.sharedMembers) {
      Object.defineProperty(this, k, {
        get: RemoteMemberGetter.call(this, k),
        set: RemoteOwnedMemberSetter.call(this, k),
        configurable: true
      })
    }
  }

  x.prototype = constructor.prototype;
  x.prototype.__isRemote = true;
  Object.defineProperty(x, "name", {
    value: constructor["name"]
  })



  return x;
}

function InstallMemberDecorator(validator: Function | ValidatorChain): Function {
  return function(obj, member: string, unkown: undefined) {
    if (!('__remoteTable' in obj)) {
      obj.__remoteTable = {
        sharedMembers: {},
      };
    }
    if (typeof validator === "function") {
      obj.__remoteTable.sharedMembers[member] = validator;
    } else {
      obj.__remoteTable.sharedMembers[member] = validator.popChain();
    }
  }
}

export function Member(validator?: Function | ValidatorChain): Function {
  return InstallMemberDecorator(validator || ((v) => v));
}
