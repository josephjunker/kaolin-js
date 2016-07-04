
import compile from "./compiler";
import validatorInterpreters from "./validator-interpreters";
import documentationInterpreters from "./documentation-interpreters";
import {mergeObjects, mapObject, cloneDeep} from "./utils";

function compileValidators (scope, customInterpreters = {}) {
  const types = scope.getTypes();

  Object.keys(types).forEach(typeName => {
    if (validatorInterpreters[typeName]) throw `Cannot re-declare built-in type ${typeName}`;
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

  return compile(withTypeNames, validatorInterpreters, customWithNiceErrorMessages);
}

function findFirstNonReference(tree, types, visited=[]) {
  if (tree.name !== "reference") return tree;
  if (!types[tree.referenceName] && builtInTypes.indexOf(tree.referenceName === -1))
    throw `Found a reference to undeclared type ${tree.referenceName}`;

  if (visited.indexOf(tree.referenceName)) throw "Found a reference cycle including type" + tree.referenceName;

  return findFirstNonReference(types[tree.referenceName], types, visited.concat(tree.referenceName));
}

function compileDocumentation (scope, customInterpreters = {}) {
  const types = scope.getTypes();

  const referencesResolved = mapObject(types, tree => findFirstNonReference(tree, types));

  return compile(types, documentationInterpreters, customInterpreters);
}

function formatError({message, innerError}, found, name) {
  return {
    found,
    message: `In type "${name}", ${message}${innerError ? ":\n" + innerError.message : ""}`
  };
}

export {
  compileValidators,
  compileDocumentation
};

