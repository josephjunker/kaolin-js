
import compile from "./compiler";
import validatorInterpreters from "./validator-interpreters";
import {mergeObjects, mapObject, clone} from "./utils";

function compileValidators (scope, customInterpreters = {}) {
  const types = scope.getTypes();

  Object.keys(types).forEach(typeName => {
    if (validatorInterpreters[typeName]) throw `Cannot re-declare built-in type ${typeName}`;
  });

  const withTypeNames = mapObject(types, (value, key) => {
    let cloned = clone(value);
    cloned.meta.typeName = key;
    return cloned;
  });

  return compile(withTypeNames, validatorInterpreters, customInterpreters);
}

export {
  compileValidators
};

