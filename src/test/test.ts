import chai = require("chai");
var should = chai.should();
var expect = chai.expect;

import {Remote, Member} from '../sharedobject/Remote';
import {Validators as RV} from '../sharedobject/Validators';

declare function schemaFromObject(any): any;

describe("schemaFromObject", function() {
  it("should create a valid schema for an object with a single number", function() {
    testSingleProperty(5);
  });
  it("should create a valid schema for an object with a single string", function() {
    testSingleProperty("hello");
  });
  it("should create a valid schema for an object with a single boolean", function() {
    testSingleProperty(true);
  });
  it("should create a valid schema for an object with a single null value", function() {
    testSingleProperty(null);
  });

  function testSingleProperty(value: any): void {
    var obj = {};
    var propName = "property";
    obj[propName] = value;
    var propType = typeof value;
    var schema = schemaFromObject(obj);
    schema.should.include.keys("properties");
    schema.properties.should.have.all.keys(propName);
    schema.properties[propName].should.contanin.keys("type");
    schema.properties[propName].type.should.equal(propType);
  }
});

describe('Remote decorator testing', function() {
  @Remote
  class RemoteTest {
    @Member(RV.isNumber.isGreatOrEqual(0))
    public nonNegative: number;
    @Member(RV.isString.isRegex(/^\+?[0-9]{9}$/))
    public phoneNumber: string;
  }
  let x = new RemoteTest();

  it('@Remote can not be used without any @Member decorator', () => {
    expect(() => {
      @Remote
      class X {};
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
})

describe('Server general functionality testing', () => {

})
