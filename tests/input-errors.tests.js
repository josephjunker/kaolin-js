
"use strict";

var main = require("../"),
    cloneDeep = require("lodash.clonedeep");

var compileValidators = main.compileValidators,
    core = main.core,
    createScope = main.createScope;

describe("input errors", function () {

  it("should tell you if you forget to call a primitive as a function", function () {
    const scope = createScope();

    scope.newType("foo", core.string);

    expectErrorMatching(/foo.*found a function.*creator.*primitive/i, function () {
      compileValidators(scope);
    });
  });

  it("should detect reference cycles", function () {
    const scope = createScope();

    scope.newType("foo", core.reference("bar"));
    scope.newType("bar", core.reference("foo"));

    expectErrorMatching(/foo.*reference cycle.*foo.*bar/i, function () {
      compileValidators(scope);
    });
  });

  it("should detect references to undeclared types", function () {
    const scope = createScope();

    scope.newType("foo", core.reference("bar"));

    expectErrorMatching(/schema.*type.*foo.*reference.*type.*bar.*no.*definition/i, function () {
      compileValidators(scope);
    });
  });

  it("should detect references to undeclared types inside a custom type", function () {
    const scope = createScope();

    scope.newType("foo", core.custom(core.string(), core.reference("bar")));

    expectErrorMatching(/schema.*type.*foo.*reference.*type.*bar.*no.*definition/i, function () {
      compileValidators(scope);
    });
  });

  it("should detect junk data inside a type", function () {
    const scope = createScope();

    scope.newType("foo", core.array({ name: "bar" }));

    expectErrorMatching(/error.*foo.*array.*contents.*invalid name.*bar/i, function () {
      compileValidators(scope);
    });
  });

  it("should detect if a type node is missing fields", function () {
    const scope = createScope();

    scope.newType("foo", { name: "dictionary", meta: {}, keys: core.string() });

    expectErrorMatching(/error.*foo.*dictionary.*"values" field/i, function () {
      compileValidators(scope);
    });
  });

  it("should detect if you try to redefine a built-in type", function () {
    const scope = createScope();

    scope.newType("array", core.string());

    expectErrorMatching(/error.*array.*redefine.*array/, function () {
      compileValidators(scope);
    });
  });

  it("should detect if you try to redefine a already added type", function () {
    const scope = createScope();

    scope.newType("foo", core.string());

    expectErrorMatching(/redefine.*foo/, function () {
      scope.newType("foo", core.number());
    });
  });
});

function expectErrorMatching(regex, fn) {
  try {
    fn();
  } catch (e) {
    if (!regex.test(e.message.replace(/\n/g, " ")))
      throw new Error("expected the error message\n" + e.message + "\nto match " + regex);
    return;
  }
  throw new Error("expected an error to be thrown");
}

