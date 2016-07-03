"use strict";

var main = require("../lib/main"),
    cloneDeep = require("lodash.clonedeep");

var compileValidators = main.compileValidators,
    core = main.schemaConstructors,
    createScope = main.createScope;

describe("custom validators", function () {

  describe.skip("for primitive values", function () {

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
      if (tripletChecker(["foo", 1, true])) throw "Received an error";
    });

    it("should report nice errors", function () {
      assertMatches(tripletChecker({}).message, /strNumBool.*expected.*array.*found.*\{.*\}/i);
      assertMatches(tripletChecker([]).message, /strNumBool.*array.*length.*3.*found.*0/i);
      assertMatches(tripletChecker(["foo", "bar", true]).message, /strNumBool.*index.*1.*number.*found.*bar/i);
      assertMatches(tripletChecker(["foo", 0, []]).message, /strNumBool.*index.*2.*boolean.*found.*\[\]/i);
    });

    it.skip("should be able to take itself as an argument", function () {

    });

    it.skip("should be able to take a forward reference to another custom type as an argument", function () {

    });
  });
});

function assertMatches(str, regex) {
  if (typeof str !== "string") throw new Error("expected a string, got " + JSON.stringify(str));
  if (regex.test(str.replace(/\n/g, " "))) return;
  throw new Error("Failed to match string: " + str);
}
