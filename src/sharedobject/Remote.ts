import {ValidatorChain, Validator} from './Validators';

export interface RemoteObject {
  __remoteTable;
  __remoteInstance;
}

export var RemoteUtils = {
  GetId(obj: RemoteObject) {
    return obj.__remoteInstance.id;
  },

  GetOwn(obj: RemoteObject) {
    return obj.__remoteInstance.own;
  },

  IsRemote(obj: any) {
    return '__remoteInstance' in obj && '__remoteTable' in obj;
  },

  IsRemoteClass(classConstructor: any) {
    return '__remoteTable' in classConstructor.prototype && '__isRemote' in classConstructor.prototype;
  },

  Validate(obj: RemoteObject, member: string, v: any) {
    var val: Function |[Validator] = obj.__remoteTable.sharedMembers[member];
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
  },
  SetDriver(obj: RemoteObject, driver: (key: string, value: any) => any) {
    obj.__remoteInstance.writeDriver = driver;
  },
  ChangeOwnership(obj: RemoteObject, imOwner: boolean) {
    if (obj.__remoteInstance.own != imOwner) {
      for (var k in obj.__remoteTable.sharedMembers) {
        Object.defineProperty(obj, k, {
          get: RemoteMemberGetter.call(obj, k),
          set: (imOwner ? RemoteOwnedMemberSetter : RemoteForeignMemberSetter).call(obj, k),
          configurable: true
        })
      }
      obj.__remoteInstance.own = imOwner;
    }
  },
  UpdateKeyValue(obj: RemoteObject, member: string, value: any) {
    if (member in obj.__remoteTable.sharedMembers) {
      let v = RemoteUtils.Validate(obj, member, value);
      if (typeof v === "undefined") {
        throw "Value " + value + " for member " + obj.constructor["name"] + "." + member + "is not valid.";
      }
      obj.__remoteInstance.sharedValues[member] = v;
      if (this.__remoteInstance.onremotechange.length)
        this.__remoteInstance.onremotechange.forEach((v) => {
          v(this);
        })
    } else {
      throw "Object does not contain Remote member " + member;
    }
  },
  UpdateMultipleValues(obj: RemoteObject, changes: any) {
    var x = {};

    // First: check every value passes Validations
    for (var member in changes) {
      if (member in obj.__remoteTable.sharedMembers) {
        x[member] = RemoteUtils.Validate(obj, member, changes[member]);
        if (typeof x[member] === "undefined") {
          throw "Value " + changes[member] + " for member " + obj.constructor['name'] + "." + member + "is not valid.";
        }
      } else {
        throw "Object does not contain Remote member " + member;
      }
    }
    // Second: copy all changes to the object
    for (var k in x) {
      obj.__remoteInstance.sharedValues[k] = x[k];
    }
    if (this.__remoteInstance.onremotechange.length)
      this.__remoteInstance.onremotechange.forEach((v) => {
        v(this);
      })
  },

  Subscribe(obj: RemoteObject, subs: (RemoteObject) => void, subscribeLocallyToo?: boolean) {
    obj.__remoteInstance.onremotechange.push(subs);
    if (subscribeLocallyToo)
      obj.__remoteInstance.onlocalchange.push(subs);
  }
};

function RemoteMemberGetter(member) {
  return () => this.__remoteInstance.sharedValues[member];
}

function RemoteOwnedMemberSetter(member: string) {
  return (v) => {
    var val = RemoteUtils.Validate(this, member, v);
    this.__remoteInstance.sharedValues[member] = val;
    if (this.__remoteInstance.writeDriver)
      this.__remoteInstance.writeDriver(member, val);
    if (this.__remoteInstance.onlocalchange.length)
      this.__remoteInstance.onlocalchange.forEach((v) => {
        v(this);
      })
  }
}

function RemoteForeignMemberSetter(member: string) {
  return () => { throw "Cannot set " + member + " because you don't have ownership of this Object." };
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
      id: null,
      onremotechange: [],
      onlocalchange: []
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

function InstallMemberDecorator(validator: Function | ValidatorChain, obj, member: string, unkown: undefined) {
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

export function Member(validator?: Function | ValidatorChain): Function {
  return InstallMemberDecorator.bind(this, validator || ((v) => v));
}
