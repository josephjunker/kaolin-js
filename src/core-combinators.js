
import {mapObject, mergeObjects, zip} from "./utils";

function descriptorToConstructor(name, argNames) {
  return (...args) => {
    let foo = mergeObjects(
      { name },
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
  customPrimitive: ["label"],
  customCollection: ["label", "args"],
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
    intersection: (...parents) => ({ name: "intersection", parents}),
    alternatives: (...options) => ({ name: "alternatives", options})
  });

export default schemaConstructors;

