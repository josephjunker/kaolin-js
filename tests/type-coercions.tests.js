
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

});

