
import {core} from "./core-combinators";
import {clone} from "./utils";

export default () => {
  let types = {};

  return {
    newType: (name, definition) => {
      if (types[name]) throw new Error(`Cannot redefine the existing type ${name}`);
      types[name] = clone(definition);
      return core.reference(name);
    },
    getTypes: () => {
      return clone(types);
    }
  };

};

