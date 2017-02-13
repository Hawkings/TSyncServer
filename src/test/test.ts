import chai = require("chai");
var should = chai.should();
var expect = chai.expect;

import {Server} from '../core/Server';
import {RemoteUtils as rUtils, Remote, Member, RemoteObject} from '../sharedobject/Remote';
import {Validators as RV} from '../sharedobject/Validators';
import {Peer} from '../core/Peer';

declare function schemaFromObject(any): any;

// describe("schemaFromObject", function() {
//   it("should create a valid schema for an object with a single number", function() {
//     testSingleProperty(5);
//   });
//   it("should create a valid schema for an object with a single string", function() {
//     testSingleProperty("hello");
//   });
//   it("should create a valid schema for an object with a single boolean", function() {
//     testSingleProperty(true);
//   });// describe("schemaFromObject", function() {
//   it("should create a valid schema for an object with a single number", function() {
//     testSingleProperty(5);
//   });
//   it("should create a valid schema for an object with a single string", function() {
//     testSingleProperty("hello");
//   });
//   it("should create a valid schema for an object with a single boolean", function() {
//     testSingleProperty(true);
//   });
//   it("should create a valid schema for an object with a single null value", function() {
//     testSingleProperty(null);
//   });
//
//   function testSingleProperty(value: any): void {
//     var obj = {};
//     var propName = "property";
//     obj[propName] = value;
//     var propType = typeof value;
//     var schema = schemaFromObject(obj);
//     schema.should.include.keys("properties");
//     schema.properties.should.have.all.keys(propName);
//     schema.properties[propName].should.contanin.keys("type");
//     schema.properties[propName].type.should.equal(propType);
//   }
// });
//   it("should create a valid schema for an object with a single null value", function() {
//     testSingleProperty(null);
//   });
//
//   function testSingleProperty(value: any): void {
//     var obj = {};
//     var propName = "property";
//     obj[propName] = value;
//     var propType = typeof value;
//     var schema = schemaFromObject(obj);
//     schema.should.include.keys("properties");
//     schema.properties.should.have.all.keys(propName);
//     schema.properties[propName].should.contanin.keys("type");
//     schema.properties[propName].type.should.equal(propType);
//   }
// });

describe('Remote decorator testing,', function() {
  @Remote
  class RemoteTest {
    @Member(RV.isNumber.isGreaterOrEqual(0))
    public nonNegative: number;
    @Member(RV.isString.matchesRegex(/^\+?[0-9]{9}$/))
    public phoneNumber: string;
  }
  let x: RemoteTest&RemoteObject = <RemoteTest&RemoteObject>new RemoteTest();
  let y: RemoteTest&RemoteObject = <RemoteTest&RemoteObject>new RemoteTest();

  rUtils.ChangeOwnership(y, false);
  rUtils.ChangeOwnership(x, true);

  it('@Remote decorator is correctly installed', () => {
    expect(rUtils.IsRemote(x)).to.be.true
    expect(rUtils.IsRemote({})).to.be.false
    expect(rUtils.IsRemote(new Date())).to.be.false
  })

  it('@Remote decorator mantains class\' name', () => {
    expect(RemoteTest['name']).to.be.equal('RemoteTest');
  })

  it('@Remote ownership works', () => {
    expect(rUtils.GetOwn(y)).to.be.false
    rUtils.ChangeOwnership(y, true);
    expect(rUtils.GetOwn(y)).to.be.true
    rUtils.ChangeOwnership(y, false);
    expect(rUtils.GetOwn(y)).to.be.false
    expect(rUtils.GetOwn(x)).to.be.true
  })

  it('RemoteUtils miscellanea', () => {
    var id = y.__remoteInstance.id = Math.random();
    expect(rUtils.GetId(y)).to.be.eq(id);
    expect(rUtils.IsRemoteClass(RemoteTest)).to.be.true;
    expect(rUtils.IsRemoteClass(Date)).to.be.false;
  })

  it('Writing a member of a foreign object is not allowed', () => {
    expect(() => {y.nonNegative = 13;}).to.throw();
  })

  it('@Remote can not be used without any @Member decorator', () => {
    expect(() => {
      @Remote
      class X { };
    }).to.throw();
  })

  it('@Member decorator throws when writing with wrong values', () => {
    expect(() => { x.nonNegative = <any>"14" }).to.throw();
    expect(() => { x.nonNegative = -3 }).to.throw();

    expect(() => { x.phoneNumber = <any>965000000 }).to.throw();
    expect(() => { x.phoneNumber = "+96500000" }).to.throw();
    expect(() => { x.phoneNumber = "1196500000" }).to.throw();

    expect(() => { x.phoneNumber = "965000000" }).not.to.throw();
    expect(() => { x.phoneNumber = "+147748940" }).not.to.throw();
    expect(() => { x.nonNegative = 14 }).not.to.throw();
  })

  it('@Member decorator stores correct values', () => {
    x.nonNegative = 1779561;
    expect(x.nonNegative).to.eq(1779561);

    x.phoneNumber = "965112233";
    expect(x.phoneNumber).to.eq("965112233");
  })

  it('@Remote subs works', (done) => {
    var rand = ~~(Math.random()*65535);
    rUtils.Subscribe(x, () => {
      expect(x.nonNegative).to.be.equal(rand)
      done(undefined);
    }, true);
    x.nonNegative = rand;
  })
})

  describe('Server general functionality testing,', () => {
  class X { };
  var peer = new Peer(Math.random()+"", (v) => {});

  @Remote
  class Y {
    @Member()
    public a: any;
  };

  class Z {
    @Member()
    public a: any;
  }

  var s = new Server({
    sharedObjects: [Y]
  })

  it('Server owns Server objects', () => {
    var y = s.createSharedObject<Y>("serverObj", Y);
    expect(rUtils.GetOwn(y)).to.be.true;
  })

  it('Server do not own Peer objects', () => {
    var y = s.createSharedObject<Y>("clientObj", Y, peer);
    expect(rUtils.GetOwn(y)).to.be.false;
  })

  it('Server must not be constructed with non-remote classes', () => {
    expect(() => {
      new Server({
        sharedObjects: [X]
      });
    }).to.throw()

    expect(() => {
      new Server({
        sharedObjects: [Z]
      });
    }).to.throw()
  })
})
