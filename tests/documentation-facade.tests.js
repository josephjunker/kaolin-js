"use strict";

var main = require("../lib/main"),
    cloneDeep = require("lodash.clonedeep");

var compileDocumentation = main.compileDocumentation,
    core = main.schemaConstructors,
    createScope = main.createScope;

describe("documentation smoke test", function () {

  it("should work", function () {
    var scope = createScope();

    scope.newType("foo", core.strictStruct({
      numberField: core.number(),
      stringField: core.string(),
      aDict: core.dictionary(core.string(), core.boolean())
    }));

    var docs = compileDocumentation(scope).foo;

    if (!/{.*numberField:.*number.*stringField:.*string.*aDict:.*dictionary<.*string,.*boolean.*}/i.test(docs.replace(/\n/g)))
      throw "Produced wrong documentation: " + docs;
  });

});

