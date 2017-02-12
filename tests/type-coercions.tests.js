
const {expect} = require("chai");
const {createScope, compileTypeCoercers, core: c} = require("../lib");

describe("type coercions", () => {

  it("should work for the most basic case", () => {

    const scope = createScope();

    scope.newType("A", c.strictStruct({
      foo: c.string()
    }));

    const b = scope.newType("B", c.strictStruct({
      bar: c.string()
    }));

    scope.newType("C", c.strictStruct({
      baz: b
    }));

    const data = {
      baz: {
        foo: "blah"
      }
    };

    const aToBCoercion = (x) => ({
      bar: x.foo
    });

    scope.newTypeConverter("A", "B", aToBCoercion);

    const coerce = compileTypeCoercers(scope);

    const converted = coerce.C(data);

    expect(converted).to.deep.equal({
      baz: {
        bar: "blah"
      }
    });
  });

  it("should work when the outermost type needs a conversion", () => {

    const scope = createScope();

    scope.newType("A", c.strictStruct({
      foo: c.string()
    }));

    const b = scope.newType("B", c.strictStruct({
      bar: c.string()
    }));

    const data = {
      foo: "blah"
    };

    const aToBCoercion = (x) => ({
      bar: x.foo
    });

    scope.newTypeConverter("A", "B", aToBCoercion);

    const coerce = compileTypeCoercers(scope);

    const converted = coerce.B(data);

    expect(converted).to.deep.equal({
      bar: "blah"
    });
  });

  it("should follow a chain of conversions", () => {

    const scope = createScope();

    scope.newType("A", c.strictStruct({
      foo: c.string()
    }));

    const b = scope.newType("B", c.strictStruct({
      bar: c.string()
    }));

    scope.newType("C", c.strictStruct({
      baz: c.string()
    }));

    const data = {
      foo: "blah"
    };

    const aToBCoercion = (x) => ({
      bar: x.foo
    });

    const bToCCoercion = (x) => ({
      baz: x.bar
    });

    scope.newTypeConverter("A", "B", aToBCoercion);

    scope.newTypeConverter("B", "C", bToCCoercion);

    const coerce = compileTypeCoercers(scope);

    const converted = coerce.C(data);

    expect(converted).to.deep.equal({
      baz: "blah"
    });
  });

  it("should handle a nested case", () => {

    const scope = createScope();

    const a = scope.newType("A", c.strictStruct({
      foo: c.string()
    }));

    scope.newType("B", c.strictStruct({
      bar: a
    }));

    const d = scope.newType("D", c.strictStruct({
      baz: c.string()
    }));

    scope.newType("E", c.strictStruct({
      qux: d
    }));

    const aToDCoercion = x => ({
      baz: x.foo
    });

    const bToEConversion = x => ({
      qux: x.bar
    });

    const data = {
      bar: {
        foo: "blah"
      }
    };

    scope.newTypeConverter("A", "D", aToDCoercion);
    scope.newTypeConverter("B", "E", bToEConversion);

    const coerce = compileTypeCoercers(scope);

    const converted = coerce.E(data);

    expect(converted).to.deep.equal({
      qux: {
        baz: "blah"
      }
    });
  });

  it("should follow a chain of conversions with dead-ends", () => {
  });

  it("should let you convert keys and values in dictionaries", () => {
  });

  it("should let you convert the contents of lists", () => {
  });

  it("should let you convert fields inside lax structs", () => {
  });

  it("should convert items in an alternatives field", () => {
  });

  it("should not convert an alternative if a match is possible later in the alternatives", () => {
  });

  it("should be able to convert one enum to another", () => {
  });

  it("should be able to convert an enum to a string or a string to an enum", () => {
  });

  it("should be able to convert a self-referential recursive structure to another recursive structure", () => {
  });

  it("should let you convert a custom type to a built-in type and vice versa", () => {
  });

  it("should let you convert one custom type to another", () => {
  });

  it("should handle the composition of dictionaries, structs, and arrays in a complex case", () => {
  });

  it("should let you convert primitive types", () => {
    const scope = createScope();

    scope.newType("myString", c.string());
    scope.newType("myNumber", c.number());

    scope.newTypeConverter("myString", "myNumber", x => x.length);

    const coerce = compileTypeCoercers(scope);

    expect(coerce.myNumber("foo")).to.equal(3);
  });

  it("should let you convert an optional field", () => {
  });

  it("should not convert an optional field if the convertable value is null", () => {
  });

});

