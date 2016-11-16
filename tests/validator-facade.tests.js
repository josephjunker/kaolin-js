"use strict";

var main = require("../lib"),
    cloneDeep = require("lodash.clonedeep");

var compileValidators = main.compileValidators,
    core = main.core,
    createScope = main.createScope;

var _string = core.string(),
    _number = core.number(),
    _boolean = core.boolean(),
    _function = core.function(),
    any = core.any(),
    literal = core.literal,
    _array = core.array,
    laxStruct = core.laxStruct,
    strictStruct = core.strictStruct,
    dictionary = core.dictionary,
    optional = core.optional,
    alternatives = core.alternatives,
    validate = core.validate,
    reference = core.reference;

describe("validators", () => {

  it("string should match strings", () => {
    passingCases(_string, [
      "", "foo", "adslkfdj kljw", "2332423"
    ]);

    failingCases(_string, [
      1, null, undefined, true, false, 1.4, 0, {}, [], ["foo"], NaN, () => {}
    ]);
  });

  it("number should match numbers", () => {
    passingCases(_number, [
      0, 1, -1, 999999999, 9.1
    ]);

    failingCases(_number, [
      null, undefined, true, false, {}, [], [1], NaN, () => {}
    ]);
  });

  it("boolean should match booleans", () => {
    passingCases(_boolean, [
      true, false
    ]);

    failingCases(_boolean, [
      null, undefined, {}, [], [true], 123, 0, NaN, "foo", "true", "false", () => {}
    ]);
  });

  it("function should match functions", () => {
    passingCases(_function, [
      function () {}
    ]);

    failingCases(_function, [
      null, undefined, true, false, {}, [], [1], NaN, "foo", "true", "false", 123, 0
    ]);
  });

  it("any should match everything", () => {
    passingCases(any, [
      null, undefined, true, false, {}, [], [1], NaN, "foo", "true", "false", 123, 0, () => {}
    ]);
  });

  it("literal should match an exact value", () => {
    passingCases(literal("foo"), ["foo"]);

    failingCases(literal("foo"), [
      null, undefined, true, false, {}, [], [1], NaN, "", "true", "false", 123, 0, () => {}
    ]);

    passingCases(literal(false), [false]);

    failingCases(literal(false), [
      null, undefined, true, {}, [], [1], NaN, "", "true", "false", 123, 0, () => {}
    ]);

    passingCases(literal(1), [1]);

    failingCases(literal(1), [
      null, undefined, true, false, {}, [], [1], NaN, "", "true", "false", 123, 0, () => {}
    ]);
  });

  it("array should match if it's an array of the specified type", () => {
    passingCases(_array(_string), [
      [], ["foo"], ["bar", "baz"], [""], ["", "qux"]
    ]);

    failingCases(_array(_string), [
      "foo", ["bar", 1, "baz"], ["", []], [[]], 4
    ]);
  });

  it("laxStruct should match if all of its fields match", () => {
    var aStruct = laxStruct({
      number: _number,
      string: _string
    });

    passingCases(aStruct, [
      { number: 0, string: "" }, { number: 10, string: "foo" }, { number: 20, string: "bar", extra: true }
    ]);

    failingCases(aStruct, [
      {}, { string: "foo" }, { number: 10 }, { extra: true }, [], 4
    ]);
  });

  it("strictStruct should match if all of its fields match", () => {
    var aStruct = strictStruct({
      number: _number,
      string: _string
    });

    passingCases(aStruct, [
      { number: 0, string: "" }, { number: 10, string: "foo" }
    ]);

    failingCases(aStruct, [
      {}, { string: "foo" }, { number: 10 }, { extra: true }, { number: 20, string: "bar", extra: true }, []
    ]);
  });

  it("dictionary should match if all of its keys and values are of the specified type", () => {
    passingCases(dictionary(_string, _string), [
      {}, { foo: "bar" }, { "": "" }, { a: "b", c: "d", e: "f" }
    ]);

    failingCases(dictionary(_string, _string), [
      { foo: "bar", baz: 1 }, "foo", []
    ]);
  });

  it("optional should match a value or null or undefined", () => {
    passingCases(optional(_number), [
      0, 1, null, undefined
    ]);

    failingCases(optional(_number), [
      "", false, {}, [], NaN
    ]);

    passingCases(optional(_string), [
      "", "foo", null, undefined
    ]);

    failingCases(optional(_string), [
      0, false, {}, [], NaN
    ]);
  });

  it("alternatives should match any of the provided types", () => {
    passingCases(alternatives(_string, _number), [
      "", "foo", 0, 1, -1
    ]);

    failingCases(alternatives(_string, _number), [
      null, false, NaN, {}, []
    ]);
  });

  describe("composing combinators", () => {
    it("should work with dictionaries", () => {
      passingCases(dictionary(_string, alternatives(optional(_string), _number)), [
        { foo: null, bar: 1, baz: "qux" }, {}, { x: undefined }
      ]);

      var nestedDictionary = dictionary(_string, dictionary(_string, _string));

      passingCases(nestedDictionary, [
        { foo: { bar: "baz" } }, { x: {}, y: { z: "asdf", a: "b" } }, {}
      ]);

      failingCases(nestedDictionary, [
        { foo: "bar" }, { baz: { qux: {} } }
      ]);
    });

    it("should work with structs", () => {
      var a = strictStruct({
        foo: optional(_number),
        bar: alternatives(_string, _boolean)
      });

      var b = strictStruct({
        baz: alternatives(a, _array(a))
      });

      passingCases(a, [
        { foo: 1, bar: "baz" }, { foo: 0, bar: false }, { foo: null, bar: "qux" }, { bar: true }
      ]);

      failingCases(a, [
        { foo: false, bar: "baz" }, { foo: 2, bar: 2 }, {}
      ]);

      passingCases(b, [
        { baz: { bar: true } }, { baz: [{ foo: 1, bar: ""}, { bar: "x" }] }
      ]);

      failingCases(b, [
        { baz: null }, {}, { baz: { foo: false, bar: "x" } }, { baz: [{ foo: 1 }] }
      ]);
    });

    it("should allow recursive types with forward references", () => {
      var scope = createScope();

      var foo = scope.newType("foo", strictStruct({
        a: optional(reference("bar"))
      }));

      var bar = scope.newType("bar", strictStruct({
        b: optional(foo)
      }));

      var validators = compileValidators(scope),
          fooChecker = validators.foo,
          barChecker = validators.bar;

      passingCases(fooChecker, [
        {}, { a: null }, { a: {} }, { a: { b: null } }, { a: { b: {} } }, { a: { b: { a: null } } },
        { a: { b: { a: {} } } }, { a: { b: { a: { b: null } } } },
        { a: { b: { a: { b: {} } } } },
        { a: { b: { a: { b: { a: null } } } } }
      ]);

      failingCases(fooChecker, [
        { b: null },
        { a: { a: null } },
        { a: { b: { a: {}, c: {} } } },
        { a: { b: { a: { b: false } } } },
        { a: { a: { a: { b: {} } } } },
        { b: { b: { a: { b: { a: null } } } } }
      ]);

      passingCases(barChecker, [
        {}, { b: null }, { b: {} }, { b: { a: null } }, { b: { a: {} } }, { b: { a: { b: null } } },
        { b: { a: { b: {} } } }, { b: { a: { b: { a: null } } } },
        { b: { a: { b: { a: {} } } } },
        { b: { a: { b: { a: { b: null } } } } }
      ]);

      failingCases(barChecker, [
        { a: null },
        { b: { b: null } },
        { b: { a: { b: {}, c: {} } } },
        { b: { a: { b: { a: false } } } },
        { b: { b: { b: { a: {} } } } },
        { a: { a: { b: { a: { b: null } } } } }
      ]);

      it("should allow self-referential types", () => {
        var scope = createScope();

        scope.newType("recursive", strictStruct({
          inception: optional(reference("recursive"))
        }));

        var recursiveValidator = compileValidators(scope).recursive;

        passingCases(recursiveChecker, [
          {}, { inception: null }, { inception: {} }, { inception: { inception: null } },
          { inception: { inception: {} } },
          { inception: { inception: { inception: null } } },
          { inception: { inception: { inception: {} } } }
        ]);

        failingCases(recursiveChecker, [
          { inception: false }, { inception: { foo: null } },
          { inception: { inception: false } },
          { inception: { inception: { inception: null } } },
          { inception: { foo: { inception: null } } },
          { inception: { inception: { inception: { inception: "inception" } } } }
        ]);
      });
    });
  });

  describe("error messages", () => {
    it("should be pretty", () => {
      var scope = createScope();

      var aliasedNumber = scope.newType("specialAliasedNumber", _number);

      var numberWrapper = scope.newType("numberWrapper", strictStruct({
        numberField: aliasedNumber
      }));

      var stringWrapper = scope.newType("stringWrapper", strictStruct({
        stringField: _string
      }));

      var wrapperWrapper = scope.newType("wrapperWrapper", strictStruct({
        numberStruct: numberWrapper,
        stringStruct: stringWrapper
      }));

      var nested = scope.newType("nested", strictStruct({
        a: _boolean,
        b: stringWrapper,
        c: wrapperWrapper
      }));

      var nestedChecker = compileValidators(scope).nested;

      var good = {
        a: true,
        b: { stringField: "second" },
        c: {
          numberStruct: { numberField: 3 },
          stringStruct: { stringField: "fourth" }
        }
      };

      var bad1 = cloneDeep(good);
      bad1.a = null;
      var error1 = nestedChecker(bad1);
      assertMatches(error1, /"nested".*field "a".*Expected.*"boolean".*null/i);

      var bad2 = cloneDeep(good);
      bad2.b.stringField = 5;
      var error2 = nestedChecker(bad2);
      assertMatches(error2, /"nested".*field "b".*"stringWrapper".*field "stringField".*Expected.*"string".*5/i);

      var bad3 = cloneDeep(good);
      bad3.c.numberStruct.numberField = "asdf";
      var error3 = nestedChecker(bad3);
      assertMatches(
        error3,
        /"nested".*field "c".*"wrapperWrapper".*field "numberStruct".*"numberWrapper".*field "numberField".*Expected.*"specialAliasedNumber".*"asdf"/i);

      var bad4 = cloneDeep(good);
      delete bad4.c.stringStruct.stringField;
      var error4 = nestedChecker(bad4);
      assertMatches(
        error4,
        /"nested".*field "c".*"wrapperWrapper".*field "stringStruct".*"stringWrapper".*field "stringField".*missing/i);
    });
  });
});

function passingCases(type, values) {
  var validator;
  if (typeof type === "function") {
    validator = type;
  } else {
    var scope = createScope();
    scope.newType("x", type);
    validator = compileValidators(scope).x;
  }
  values.forEach(function (x) {
    var error = validator(x);
    if (error !== null && error !== undefined) throw new Error("unexpected error: " + JSON.stringify(error));
  });
}

function failingCases(type, values) {
  var validator;
  if (typeof type === "function") {
    validator = type;
  } else {
    var scope = createScope();
    scope.newType("x", type);
    validator = compileValidators(scope).x;
  }
  values.forEach(function (x) {
    var error = validator(x);
    if (error === null || error === undefined) throw new Error("expected an error for input: " + JSON.stringify(x));
  });
}

function assertMatches(str, regex) {
  if (typeof str !== "string") throw new Error("expected a string, got " + JSON.stringify(str));
  if (regex.test(str.replace(/\n/g, " "))) return;
  throw new Error("Failed to match string: " + str);
}

