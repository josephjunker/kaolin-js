
const {expect} = require("chai");
const {createScope, compileTypeCoercers, core: c} = require("../lib");

describe("type coercions", () => {

  it("should let you do a basic conversion", () => {
    const scope = createScope();

    scope.newType("myString", c.string());
    scope.newType("myNumber", c.number());

    scope.newTypeConverter("myString", "myNumber", x => x.length);

    const coerce = compileTypeCoercers(scope);

    expect(coerce.myNumber("foo")).to.equal(3);
  });

  it("should work with strict structs", () => {

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

    const a = scope.newType("innerSource", c.strictStruct({
      sourceInnerField: c.string()
    }));

    scope.newType("outerSource", c.strictStruct({
      sourceOuterField: a
    }));

    const d = scope.newType("innerTarget", c.strictStruct({
      targetInnerField: c.string()
    }));

    scope.newType("outerTarget", c.strictStruct({
      targetOuterField: d
    }));

    const innerConversion = x => ({
      targetInnerField: x.sourceInnerField
    });

    const outerConversion = x => ({
      targetOuterField: x.sourceOuterField
    });

    const data = {
      sourceOuterField: {
        sourceInnerField: "blah"
      }
    };

    scope.newTypeConverter("innerSource", "innerTarget", innerConversion);
    scope.newTypeConverter("outerSource", "outerTarget", outerConversion);

    const coerce = compileTypeCoercers(scope);

    const converted = coerce.outerTarget(data);

    expect(converted).to.deep.equal({
      targetOuterField: {
        targetInnerField: "blah"
      }
    });
  });

  it("should follow a chain of conversions with dead-ends", () => {
    const scope = createScope();

    scope.newType("sourceType", c.strictStruct({
      field: c.string()
    }));

    scope.newType("deadEnd1", c.strictStruct({
      badField: c.string()
    }));

    scope.newType("correctStep1", c.strictStruct({
      stepField: c.string()
    }));

    scope.newType("deadEnd2", c.strictStruct({
      anotherBadField: c.string()
    }));

    scope.newType("deadEnd3", c.strictStruct({
      badField3: c.string()
    }));

    scope.newType("targetType", c.strictStruct({
      target: c.string()
    }));

    scope.newType("deadEnd4", c.strictStruct({
      badField4: c.string()
    }));

    scope.newType("deadEnd5", c.strictStruct({
      badField5: c.string()
    }));

    scope.newTypeConverter("sourceType", "deadEnd1", x => ({
      badField: x.field
    }));

    scope.newTypeConverter("sourceType", "correctStep1", x => ({
      stepField: x.field
    }));

    scope.newTypeConverter("sourceType", "deadEnd2", x => ({
      anotherBadField: x.field
    }));

    scope.newTypeConverter("correctStep1", "deadEnd3", x => ({
      badField3: x.stepField
    }));

    scope.newTypeConverter("correctStep1", "targetType", x => ({
      target: x.stepField
    }));

    scope.newTypeConverter("correctStep1", "deadEnd4", x => ({
      badField4: x.stepField
    }));

    scope.newTypeConverter("deadEnd4", "deadEnd5", x => ({
      badField5: x.badField4
    }));

    const coerce = compileTypeCoercers(scope);

    const converted = coerce.targetType({
      field: "foo"
    });

    expect(converted).to.deep.equal({
      target: "foo"
    });
  });

  it("should let you convert primitive types to refined types", () => {
    const scope = createScope();

    const shortString = scope.newType("shortString", c.refined(c.string(), x => x.length < 5));

    scope.newTypeConverter("string", "shortString", x => x.slice(0, 4));

    const coerce = compileTypeCoercers(scope);

    expect(coerce.shortString("qwerty")).to.equal("qwer");
  });

  it("should let you convert keys and values in dictionaries", () => {
    const scope = createScope();

    const shortString = scope.newType("shortString", c.refined(c.string(), x => x.length < 5));

    const evenNumber = scope.newType("evenNumber", c.refined(c.number(), x => x % 2 === 0));

    scope.newType("someDictionary", c.dictionary(shortString, evenNumber));

    scope.newTypeConverter("string", "shortString", x => x.slice(0, 4));
    scope.newTypeConverter("number", "evenNumber", x => x * 2);

    const coerce = compileTypeCoercers(scope);

    expect(coerce.someDictionary({
      foo: 2,
      bar: 3,
      reallyLongKey: 4,
      anotherLongKey: 5
    })).to.deep.equal({
      foo: 2,
      bar: 6,
      real: 4,
      anot: 10
    });
  });

  it("should let you convert the contents of lists", () => {
    const scope = createScope();

    const from = scope.newType("from", c.strictStruct({
      foo: c.string()
    }));

    const to = scope.newType("to", c.strictStruct({
      bar: c.string()
    }));

    const someArray = scope.newType("someArray", c.array(to));

    scope.newTypeConverter("from", "to", x => ({ bar: x.foo }));

    const coerce = compileTypeCoercers(scope);

    expect(coerce.someArray([
      { foo: "a" },
      { bar: "b" },
      { foo: "c" }
    ])).to.deep.equal([
      { bar: "a" },
      { bar: "b" },
      { bar: "c" }
    ]);
  });

  it("should let you convert lax structs", () => {

    const scope = createScope();

    const originalInner = scope.newType("originalInner", c.laxStruct({
      foo: c.string()
    }));

    const newInner = scope.newType("newInner", c.laxStruct({
      bar: c.string()
    }));

    scope.newType("originalOuter", c.laxStruct({
      baz: newInner
    }));

    scope.newType("newOuter", c.laxStruct({
      qux: newInner
    }));

    scope.newTypeConverter("originalOuter", "newOuter", x => ({ qux: x.baz }));
    scope.newTypeConverter("originalInner", "newInner", x => ({ bar: x.foo }));

    const coerce = compileTypeCoercers(scope);

    expect(coerce.newOuter({
      baz: {
        foo: "blah"
      }
    })).to.deep.equal({
      qux: {
        bar: "blah"
      }
    });
  });

  it("should convert items in an alternatives field", () => {
    const scope = createScope();

    const rawContents1 = scope.newType("rawContents1", c.strictStruct({
      foo: c.string()
    }));

    const rawContents2 = scope.newType("rawContents2", c.strictStruct({
      bar: c.string()
    }));

    const convertedContents1 = scope.newType("convertedContents1", c.strictStruct({
      baz: c.string()
    }));

    const convertedContents2 = scope.newType("convertedContents2", c.strictStruct({
      qux: c.string()
    }));

    const wrapper = scope.newType("wrapper", c.alternatives(
      convertedContents1,
      convertedContents2,
      c.strictStruct({
        cat: c.string()
      })));

    scope.newTypeConverter("rawContents1", "convertedContents1", x => ({ baz: x.foo }));
    scope.newTypeConverter("rawContents2", "convertedContents2", x => ({ qux: x.bar }));

    const coerce = compileTypeCoercers(scope);

    expect(coerce.wrapper({
      foo: "blah"
    })).to.deep.equal({
      baz: "blah"
    });

    expect(coerce.wrapper({
      bar: "blah"
    })).to.deep.equal({
      qux: "blah"
    });

    expect(coerce.wrapper({
      cat: "blah"
    })).to.deep.equal({
      cat: "blah"
    });
  });

  it("should be able to convert one enum to another", () => {

    const scope = createScope();

    scope.newType("rawEnum", c.enum("first", "second", "third"));

    scope.newType("convertedEnum", c.enum(1, 2, 3));

    scope.newTypeConverter("rawEnum", "convertedEnum", x =>
                           x === "first"  ? 1 :
                           x === "second" ? 2 :
                           /* otherwise */  3);

    const coerce = compileTypeCoercers(scope);

    expect(coerce.convertedEnum("first")).to.equal(1);
    expect(coerce.convertedEnum("second")).to.equal(2);
    expect(coerce.convertedEnum("third")).to.equal(3);
  });

  it("should let you convert an optional field", () => {

    const scope = createScope();

    scope.newType("from", c.strictStruct({
      foo: c.string()
    }));

    const to = scope.newType("to", c.strictStruct({
      bar: c.string()
    }));

    scope.newType("target", c.optional(to));

    scope.newTypeConverter("from", "to", x => ({ bar: x.foo }));

    const coerce = compileTypeCoercers(scope);

    expect(coerce.target({ foo: "blah" })).to.deep.equal({ bar: "blah" });
    expect(coerce.target(null)).to.deep.equal(null);
  });

  it("should not convert an optional field if the convertable value is null", () => {

    const scope = createScope();

    scope.newType("from", c.strictStruct({
      foo: c.string()
    }));

    const to = scope.newType("to", c.strictStruct({
      bar: c.string()
    }));

    scope.newType("target", c.optional(to));

    scope.newTypeConverter("from", "to", x => ({ bar: x.foo }));

    const coerce = compileTypeCoercers(scope);

    expect(coerce.target(null)).to.deep.equal(null);
  });

  it("should be able to convert a self-referential recursive structure to another recursive structure", () => {

    const scope = createScope();

    scope.newType("linkedList1", c.strictStruct({
      payload: c.number(),
      next: c.optional(c.reference("linkedList1"))
    }));

    scope.newType("linkedList2", c.strictStruct({
      body: c.number(),
      following: c.optional(c.reference("linkedList2"))
    }));

    scope.newTypeConverter("linkedList1", "linkedList2", x => ({
      body: x.payload,
      following: x.next || null
    }));

    const coerce = compileTypeCoercers(scope);

    expect(coerce.linkedList2({
      payload: 1,
      next: {
        payload: 2,
        next: {
          payload: 3
        }
      }
    })).to.deep.equal({
      body: 1,
      following: {
        body: 2,
        following: {
          body: 3,
          following: null
        }
      }
    });
  });

  it("should let you convert one custom type to another", () => {

    const scope = createScope();

    scope.newType("even", c.custom("evenNumber"));
    scope.newType("odd", c.custom("oddNumber"));

    scope.newTypeConverter("odd", "even", x => x * 2);

    const makeOddValidator = () =>
      x => (typeof x === 'number') && !isNaN(x) && x % 2 === 1 ?
        { found: x } :
        { failure: true };

    const makeEvenValidator = () =>
      x => (typeof x === 'number') && !isNaN(x) && x % 2 === 0 ?
        { found: x } :
        { failure: true };

    const coerce = compileTypeCoercers(scope, {
      evenNumber: makeEvenValidator,
      oddNumber: makeOddValidator
    });

    expect(coerce.odd(1)).to.equal(1);
    expect(coerce.even(2)).to.equal(2);
    expect(coerce.even(3)).to.equal(6);
  });

  it("should be able to map the contents of an array for a conversion", () => {

    const scope = createScope();

    const someObj = scope.newType("someObj", c.strictStruct({
      foo: c.string()
    }));

    scope.newType("arrayOfObjects", c.array(someObj));

    scope.newTypeConverter("string", "someObj", x => ({ foo: x }));

    const coerce = compileTypeCoercers(scope);
    expect(coerce.arrayOfObjects(['a', 'b', 'c'])).to.deep.equal([
      { foo: 'a' },
      { foo: 'b' },
      { foo: 'c' }
    ]);
  });

  it("should be able to map the contents of an array twice for a conversion", () => {

    const scope = createScope();

    const someObj = scope.newType("someObj", c.strictStruct({
      foo: c.string()
    }));

    const anotherObj = scope.newType("anotherObj", c.strictStruct({
      bar: c.string()
    }));

    scope.newType("arrayOfObjects", c.array(anotherObj));

    scope.newTypeConverter("string", "someObj", x => ({ foo: x }));
    scope.newTypeConverter("someObj", "anotherObj", x => ({ bar: x.foo }));

    const coerce = compileTypeCoercers(scope);
    expect(coerce.arrayOfObjects(['a', 'b', 'c'])).to.deep.equal([
      { bar: 'a' },
      { bar: 'b' },
      { bar: 'c' }
    ]);
  });

  it("should be able to map an object to an array for a conversion", () => {

    const scope = createScope();

    scope.newType("someStruct", c.strictStruct({
      foo: c.string(),
      bar: c.string()
    }));

    scope.newType("arrayOfStrings", c.array(c.string()));

    scope.newTypeConverter("someStruct", "arrayOfStrings", x => ([ x.foo, x.bar ]));

    const coerce = compileTypeCoercers(scope);

    expect(coerce.arrayOfStrings({
      foo: "a",
      bar: "b"
    })).to.deep.equal([
      "a",
      "b"
    ]);
  });

  it("should be able to map an array to a single object", () => {

    const scope = createScope();

    scope.newType("arrayOfStrings", c.array(c.string()));

    scope.newType("someStruct", c.strictStruct({
      foo: c.string(),
      bar: c.string()
    }));

    scope.newTypeConverter("arrayOfStrings", "someStruct", x => ({foo: x[0], bar: x[1]}));

    const coerce = compileTypeCoercers(scope);

    expect(coerce.someStruct([
      "a",
      "b"
    ])).to.deep.equal({
      foo: "a",
      bar: "b"
    });
  });

  it("should be able to map an object to an array to an object", () => {

    const scope = createScope();

    scope.newType("someStruct", c.strictStruct({
      foo: c.string(),
      bar: c.string()
    }));

    scope.newType("arrayOfStrings", c.array(c.string()));

    scope.newType("anotherStruct", c.strictStruct({
      baz: c.string(),
      qux: c.string()
    }));

    scope.newTypeConverter("someStruct", "arrayOfStrings", x => [x.foo, x.bar]);
    scope.newTypeConverter("arrayOfStrings", "anotherStruct", x => ({baz: x[0], qux: x[1]}));

    const coerce = compileTypeCoercers(scope);

    expect(coerce.anotherStruct({
      foo: "a",
      bar: "b"
    })).to.deep.equal({
      baz: "a",
      qux: "b"
    });
  });
});

