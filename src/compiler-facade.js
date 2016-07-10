
import compile from "./compiler";
import validatorInterpreters from "./validator-interpreters";
import documentationInterpreters from "./documentation-interpreters";
import {mergeObjects, mapObject, cloneDeep} from "./utils";
import SchemaError from "./schema-error";
import checkTypeGraph from "./check-type-graph";

function wrapInErrorHandler (fn) {
  return function schemaErrorHandler(...args) {
    try {
      return fn(...args);
    } catch (e) {
      if (e instanceof SchemaError) {
        throw new Error(e.errorMessage);
      }
      throw e;
    }
  };
}

const compileValidators = wrapInErrorHandler((scope, customInterpreters = {}) => {
  const types = scope.getTypes();

  checkTypeGraph(types);

  Object.keys(types).forEach(typeName => {
    if (validatorInterpreters[typeName]) throw new SchemaError(`Cannot redefine built-in type ${typeName}`, typeName);
  });

  const withTypeNames = mapObject(types, (value, key) => {
    let cloned = cloneDeep(value);
    cloned.meta.typeName = key;
    return cloned;
  });

  const customWithNiceErrorMessages = mapObject(
    customInterpreters,
    (interpreter, typeName) =>
      (tree, recurse, compiled) => {
        const bare = interpreter(tree, recurse, compiled),
              name = tree.meta.typeName;
        return (x) => {
          const err = bare(x);
          if (err) return formatError(err, x, name);
        };
      }
  );

  const compiled = compile(withTypeNames, validatorInterpreters, customWithNiceErrorMessages);

  return mapObject(compiled, fn => x => { const err = fn(x); return err && err.message; });
});

function formatError({message, innerError}, found, name) {
  return {
    found,
    message: `In type "${name}", ${message}${innerError ? ":\n" + innerError.message : ""}`
  };
}

const compileDocumentation = wrapInErrorHandler((scope, customInterpreters = {}) => {
  const types = scope.getTypes();
  checkTypeGraph(types);

  return compile(types, documentationInterpreters, customInterpreters);
});

export {
  compileValidators,
  compileDocumentation
};

