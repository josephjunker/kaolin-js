"use strict";

var main = require("../lib"),
    cloneDeep = require("lodash.clonedeep");

var compileValidators = main.compileValidators,
    core = main.core,
    createScope = main.createScope;

describe("custom validators", function () {

  describe("for primitive values", function () {
    function makeEvenValidator() {
      return function (x) {
        if (x % 2 !== 0) return {
          message: "expected an even number"
        };
      };
    }

    var evenNumberValidator;

    beforeEach(function () {
      var scope = createScope();

      var evenNumber = scope.newType(
        "evenNumber",
        core.intersection(
          core.number(),
          core.custom("even")));

      evenNumberValidator = compileValidators(scope, { even: makeEvenValidator }).evenNumber;
    });

    it("should let you define a new type", function () {
      passes(evenNumberValidator, [4, 0, -2, 200]);
      fails(evenNumberValidator, [1, true, 13, {}, [0], [], "2"]);
    });
  });

  describe("for collections", function () {

    function makeTupleValidator(tree, recurse) {
      var name = tree.meta.typeName,
          args = tree.args,
          compiledArgs = args.map(recurse);

      return function(x) {
        if (!Array.isArray(x)) return {
          message: "expected an array, but found: " + JSON.stringify(x)
        };

        if (x.length !== args.length) return {
          message: "expected an array of length " + args.length + ", but found one of length: " + x.length
        };

        var err;
        for (var i = 0; i < x.length; i++) {
          err = compiledArgs[i](x[i]);
          if (err) return {
            message: "error at index " + i,
            innerError: err
          };
        }
      };
    }

    var tripletChecker;

    beforeEach(function () {
      var scope = createScope();

      var stringNumberBooleanTuple = scope.newType(
        "strNumBool",
        core.custom("tuple", core.string(), core.number(), core.boolean()));

      tripletChecker = compileValidators(scope, { tuple: makeTupleValidator }).strNumBool;
    });

    it("should recognize a valid instance", function () {
      passes(tripletChecker, [
        ["foo", 1, true],
        ["", 0, false]
      ]);
    });

    it("should report nice errors", function () {
      assertMatches(tripletChecker({}), /strNumBool.*expected.*array.*found.*\{.*\}/i);
      assertMatches(tripletChecker([]), /strNumBool.*array.*length.*3.*found.*0/i);
      assertMatches(tripletChecker(["foo", "bar", true]), /strNumBool.*index.*1.*number.*found.*bar/i);
      assertMatches(tripletChecker(["foo", 0, []]), /strNumBool.*index.*2.*boolean.*found.*\[\]/i);
    });
  });

  describe("composing custom collections ", function () {

    it("should be able to take itself as an argument", function () {

      function binaryTreeInterpreter(typeDescriptor, recurse) {
        var args = typeDescriptor.args,
            selfReference = args[0],
            nodeContents = args[1];

        return recurse(core.laxStruct({
          left: core.optional(selfReference),
          right: core.optional(selfReference),
          contents: nodeContents
        }));
      }

      var customInterpreters = { binaryTree: binaryTreeInterpreter };

      var scope = createScope();

      scope.newType("numericTree",
                    core.custom(
                      "binaryTree",
                      core.reference("numericTree"),
                      core.number()));

      scope.newType("stringTree",
                    core.custom(
                      "binaryTree",
                      core.reference("stringTree"),
                      core.string()));

      var validators = compileValidators(scope, customInterpreters);

      passes(validators.numericTree, [
        { contents: 5 },
        { left: { contents: 3 }, contents: 5, right: { contents: 7 } },
        { left: { left: { contents: 2 }, contents: 3 }, contents: 5, right: { contents: 7, right: { contents: 8 } } },
        { left: { left: { contents: 2 }, contents: 3, right: { contents: 4 } }, contents: 5 },
        { left: { left: { contents: 2, right: { contents: 2.5 } }, contents: 3, right: { contents: 4 } }, contents: 5 }
      ]);

      fails(validators.numericTree, [
        {},
        { left: { contents: 3 }, contents: 5, right: { contents: "foo" } },
        { left: { left: { contents: 2 }, contents: 3 }, contents: false, right: { contents: 7, right: { contents: 8 } } },
        { left: { left: {}, contents: 3, right: { contents: 4 } }, contents: 5 },
        { left: { left: { contents: 2, right: { contents: "bar" } }, contents: 3, right: { contents: 4 } }, contents: 5 }
      ]);

      passes(validators.stringTree, [
        { contents: "c" },
        { left: { left: { contents: "a", right: { contents: "b" } }, contents: "c", right: { contents: "d" } }, contents: "e" }
      ]);

      fails(validators.stringTree, [
        {},
        { left: { left: { contents: "a", right: { contents: "b" } }, right: { contents: "d" } }, contents: "e" },
        { left: { left: { contents: "a", right: { contents: false } }, contents: "c", right: { contents: "d" } }, contents: "e" }
      ]);
    });

    it("should be able to take collections as arguments", function () {

      function wrapperInterpreter(typeDescriptor, recurse) {
        var container = typeDescriptor.args[0],
            contained = typeDescriptor.args[1];

        return recurse(container(contained));
      }

      var customInterpreters = { wrapper: wrapperInterpreter };
      var scope = createScope();

      var numberArray = scope.newType("numberArray", core.custom("wrapper", core.array, core.number())),
          numberArrayArray = scope.newType("numberArrayArray", core.custom("wrapper", core.array, numberArray));

      var validators = compileValidators(scope, customInterpreters);

      passes(validators.numberArray, [[], [1], [1, 2], [1, 2, 3]]);
      fails(validators.numberArray, [1, [true], [1, "foo"]]);

      passes(validators.numberArrayArray, [
        [[]], [[], []], [[1], [1, 2], [1, 2, 3]]
      ]);

      fails(validators.numberArrayArray, [
        [[[]]], [[], [false]], [[], [1], [1, 2], [1, 2, null]]
      ]);
    });
  });
});

function assertMatches(str, regex) {
  if (typeof str !== "string") throw new Error("expected a string, got " + JSON.stringify(str));
  if (regex.test(str.replace(/\n/g, " "))) return;
  throw new Error("Failed to match string: " + str);
}

function passes(validator, values) {
  values.forEach(function (x) {
    var error = validator(x);
    if (error !== null && error !== undefined) throw new Error("unexpected error: " + JSON.stringify(error));
  });
}

function fails(validator, values) {
  values.forEach(function (x) {
    var error = validator(x);
    if (error === null || error === undefined) throw new Error("expected an error for input: " + JSON.stringify(x));
  });
}

