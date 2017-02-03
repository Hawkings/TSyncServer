var chai = require("chai");
var should = chai.should();

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