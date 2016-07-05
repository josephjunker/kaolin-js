
import {core} from "./core-combinators";
import {clone} from "./utils";
import SchemaError from "./schema-error";

export default () => {
  let types = {};

  return {
    // Should eventually check to make sure the definition doesn't have unbound parameters
    newType: (name, definition) => {
      if (types[name]) throw new SchemaError(`Cannot redefine the existing type ${name}`);
      types[name] = clone(definition);
      return core.reference(name);
    },
    getTypes: () => clone(types)
  };

};

