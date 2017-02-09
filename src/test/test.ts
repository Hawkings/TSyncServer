var chai = require("chai");
var should = chai.should();

declare function schemaFromObject(o: any);

// TODO: arrays
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
	it("should fail for non-object parameters", function() {
		[-4, false, function(){}, null, "world"].forEach(function(val) {
			chai.expect(() => schemaFromObject(val)).to.throw();
		});
	});
	it("should create a valid schema for a complex object", function() {
		var obj = {
			n: 7,
			s: " ",
			o: {
				p: {
					q: {
						b: false
					},
					r: {
						n: 8
					},
					n: 0
				}
			}
		};
		
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