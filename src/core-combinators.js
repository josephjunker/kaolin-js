
import {mapObject, mergeObjects, zip} from "./utils";

function descriptorToConstructor(name, argNames) {
  return (...args) => {
    let foo = mergeObjects(
      { name, meta: {} },
      zip(args, argNames)
        .reduce((acc, [arg, name]) => {
          acc[name] = arg;
          return acc;
        }, {}));

     return foo;
  };
}

const descriptors = {
  string: [],
  boolean: [],
  function: [],
  object: [],
  number: [],
  any: [],
  literal: ["value"],
  array: ["contents"],
  laxStruct: ["fields"],
  strictStruct: ["fields"],
  dictionary: ["keys", "values"],
  optional: ["contents"],
  reference: ["referenceName"]
};

const schemaConstructors = mergeObjects(
  mapObject(descriptors, (args, name) => descriptorToConstructor(name, args)),
  {
    custom: (label, ...args) => ({ name: "custom", label, args, meta: {} }),
    intersection: (...parents) => ({ name: "intersection", parents, meta: {}}),
    alternatives: (...options) => ({ name: "alternatives", options, meta: {}})
  });

export default schemaConstructors;

