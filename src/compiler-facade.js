
import compile from "./compiler";
import validatorInterpreters from "./validator-interpreters";

function compileValidators (scope, customInterpreters = {}) {
  return compile(scope.getTypes(), validatorInterpreters, customInterpreters);
}

export {
  compileValidators
};

