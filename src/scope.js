
import {core} from "./core-combinators";
import {clone} from "./utils";

export default () => {
  let types = {},
      metadata = {};

  return {
    newType: (name, definition, meta) => {
      if (types[name]) throw new Error(`Cannot redefine the existing type ${name}`);
      types[name] = clone(definition);
      metadata[name] = clone(meta) || {};
      return core.reference(name);
    },
    getTypes: () => clone(types),
    getMetadata: () => clone(metadata)
  };

};

