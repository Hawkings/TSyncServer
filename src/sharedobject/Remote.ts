import {ValidatorChain, Validator} from './Validators';

function InstallRemoteDecorator(validator: Function | ValidatorChain): Function {
  return function(obj, member: string, unkown: undefined) {
    if (!('__remoteTable' in obj)) {
      obj.__remoteTable = {
        sharedMembers: {},
        sharedValues: {},
        own: true
      };
    }
    if (typeof validator === "function") {
      obj.__remoteTable.sharedMembers[member] = validator;
    } else {
      obj.__remoteTable.sharedMembers[member] = validator.popChain();
    }
    var val: Function | [Validator] = obj.__remoteTable.sharedMembers[member];
    Object.defineProperty(obj, member, {
      get: () => obj.__remoteTable.sharedValues[member],
      set: function(v) {
        if (typeof val === "function") {
          let v2 = val(v);
          if (typeof v2 === "undefined") {
            throw "Validator failed";
          }
          obj.__remoteTable.sharedValues[member] = v2;
        } else {
          var lastval = v;
          val.forEach((v) => {
            lastval = v(lastval);
            if (typeof lastval === "undefined") {
              throw "Validator failed";
            }
          });
          obj.__remoteTable.sharedValues[member] = lastval;
        }
      }
    })
  }
}

export function Remote(validator: Function | ValidatorChain): Function {
  console.log(arguments);
  return InstallRemoteDecorator(validator);
}
