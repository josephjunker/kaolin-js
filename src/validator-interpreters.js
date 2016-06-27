
import {mapObject, firstTruthy, arrayDifference, mergeObjects} from "./utils";
import core from "./core-combinators";

function laxStruct ({fields}, recurse, compiled) {
  const compiledFields = mapObject(fields, recurse);

  return recurse(core.intersection(
    core.object(),
    compiled(x => {
      let err = firstTruthy(
        Object.keys(compiledFields),
        fieldName => compiledFields[fieldName](x[fieldName]));

      if (err) return { found: x, error: err, source: "laxStruct" };
    }
    )));
}

function strictStruct ({fields}, recurse, compiled) {
  return recurse(core.intersection(
    core.laxStruct(fields),
    compiled(x => {
      var extraKey = Object.keys(x).find(key => !fields[key]);
      if (extraKey)
        return { found: x, error: "too many keys", source: "strictStruct" };
    })));
}

function literal({value}) {
  return x => x !== value ? { found: x } : null;
}

function optional({contents}, recurse) {
  const validateContents = recurse(contents);

  return x => {
    const error = validateContents(x);
    if (!error || error.found === null || error.found === undefined) return;
    return { found: x, error, source: "optional"};
  };
}

function alternatives({options}, recurse) {
  const compiledOptions = options.map(recurse);

  return x => {
    for (let i = 0; i < compiledOptions.length; i++) {
      if (!compiledOptions[i](x)) return;
    }
    return firstTruthy(compiledOptions, option => !option(x)) ?
      null :
      { found: x };
  };
}

function dictionary({keys, values}, recurse, compiled) {
  const keyValidator = recurse(keys),
        valueValidator = recurse(values);

  return recurse(
    core.intersection(
      core.object(),
      compiled(x => {
        const keyErrors = Object.keys(x)
        .map(keyValidator)
        .filter(Boolean);

        const valueErrors = Object.keys(x)
        .map(key => valueValidator(x[key]))
        .filter(Boolean);

        if (keyErrors.length || valueErrors.length) return {
          message: `Wrong keys or values in dictionary`,
          found: x,
          keyErrors,
          valueErrors,
        };
      })));
}

function _array({contents}, recurse) {
  const contentsValidator = recurse(contents);
  return x => {
    if(!x || !Array.isArray(x)) return {
      found: x
    };

    return firstTruthy(x, contentsValidator);
  };
}

function intersection({parents}, recurse) {
  const validators = parents.map(recurse);

  return x => firstTruthy(validators, validator => validator(x));
}

// We need to evaluate this lazily, because this may be a forward reference,
// meaning that getCompiledTarget may throw an error until compilation is complete
function reference({getCompiledTarget}) {
  return x => getCompiledTarget()(x);
}

function wrapInFunction(x) {
  return () => x;
}

function wrapInErrorReturn(tester) {
  return x => tester(x) ? null : { found: x };
}

const primitives = mapObject({
  string: x => typeof x === "string",
  number: x => !isNaN(x) && typeof x === "number",
  boolean: x => typeof x === "boolean",
  function: x => typeof x === "function",
  object: x => (typeof x === "object") && !Array.isArray(x) && (x !== null),
  any: () => true
}, tester => wrapInFunction(wrapInErrorReturn(tester)));

export default mergeObjects(primitives, {
  literal,
  array: _array,
  laxStruct,
  strictStruct,
  dictionary,
  optional,
  alternatives,
  intersection,
  reference
});

