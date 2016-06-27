
import core from "./core-combinators";
import {clone} from "./utils";

export default () => {
  let types = {};

  return {
    // Should eventually check to make sure the definition doesn't have unbound parameters
    newType: (name, definition) => {
      types[name] = clone(definition);
      return core.reference(name);
    },
    getTypes: () => clone(types)
  };

};

