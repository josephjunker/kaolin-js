
import {mapObject, firstTruthy, arrayDifference, mergeObjects, anyPassing, firstTruthyWithIndex} from "./utils";
import core from "./core-combinators";

function addToError(found, original, message) {
  return {
    found,
    message: message + (original.message ? "\n" + original.message : "")
  };
}

function laxStruct ({fields, meta}, recurse, compiled) {
  const compiledFields = mapObject(fields, recurse);

  const descriptor = core.intersection(
    core.object(),
    compiled(x => {
      let [badField, err] = firstTruthy(
        Object.keys(compiledFields),
        fieldName => {
          const error = compiledFields[fieldName](x[fieldName]);
          return error ? [fieldName, error] : null;
        }) || [];

      if (err) return meta.silent ? err :
          err.found === undefined ?
            { found: x, message: `In type "${meta.typeName || "laxStruct"}", expected a field "${badField}" but it was missing`} :
            addToError(x, err, `In type "${meta.typeName || "laxStruct"}", in field "${badField}":`);
    }));

  descriptor.meta.silent = true;

  return recurse(descriptor);
}

function strictStruct ({fields, meta}, recurse, compiled) {
  let laxStructDescriptor = core.laxStruct(fields);
  laxStructDescriptor.meta.typeName = meta.typeName;

  let descriptor = core.intersection(
    laxStructDescriptor,
    compiled(x => {
      var extraKey = Object.keys(x).find(key => !fields[key]);
      if (extraKey)
        return {
          found: x,
          message: `In type "${meta.typeName || "strictStruct"}", found an extra key "${extraKey}".\nAllowed keys: ${Object.keys(fields).map(k => '"' + k + '"').join(", ")}` };
    }));

  descriptor.meta.silent = true;

  return recurse(descriptor);
}

function literal({value}) {
  return x => x !== value ? {
    found: x,
    message: `Expected the literal value ${JSON.stringify(value)}, but found ${JSON.stringify(x)}`
  } : null;
}

function optional({contents, meta}, recurse) {
  const validateContents = recurse(contents);

  return x => {
    const error = validateContents(x);
    if (!error || error.found === null || error.found === undefined) return;
    return addToError(x, error, `In type "${meta.typeName || "Optional"}":`);
  };
}

function alternatives({options, meta}, recurse) {
  const compiledOptions = options.map(recurse);

  return x => {
    for (let i = 0; i < compiledOptions.length; i++) {
      if (!compiledOptions[i](x)) return;
    }
    return anyPassing(compiledOptions, option => !option(x)) ?
      null :
      { found: x, message: `Could not match any of the alternatives in type "${meta.typeName || "Alternatives"}" to the value ${JSON.stringify(x)}` };
  };
}

function dictionary({keys, values, meta}, recurse, compiled) {
  const keyValidator = recurse(keys),
        valueValidator = recurse(values);

  let descriptor = core.intersection(
    core.object(),
    compiled(x => {

      const [badKey, keyError] = firstTruthy(
        Object.keys(x),
        key => {
          const error = keyValidator(key);
          return error ? [key, error] : null;
        }) || [];

      if (keyError) return addToError(x, keyError, `In type "${meta.typeName || "Dictionary"}", found a key of an unexpected type:`);

      const [badValue, valueError] = firstTruthy(
        Object.keys(x),
        key => {
          const error = valueValidator(x[key]);
          return error ? [x[key], error] : null;
        }) || [];

      if (valueError) return addToError(x, valueError, `In type "${meta.typeName || "Dictionary"}", found a value of an unexpected type:`);
    }));

  descriptor.meta.silent = true;

  return recurse(descriptor);
}

function _array({contents, meta}, recurse) {
  const contentsValidator = recurse(contents);
  return x => {
    if(!x || !Array.isArray(x)) return {
      found: x,
      message: `Expected a value of type "${meta.typeName}" but found: ${JSON.stringify(x)}`
    };

    const [error, index] = firstTruthyWithIndex(x, contentsValidator);
    if (error) return addToError(x, error, `In type "${meta.typeName || "Array"}" at index ${index}:`);
  };
}

function intersection({parents, meta}, recurse) {
  const validators = parents.map(recurse);

  return x => {
    const error = firstTruthy(validators, validator => validator(x));
    if (error) return meta.silent ? error : addToError(x, error, `In type "${meta.typeName || "Intersection"}":`);
  };
}

// We need to evaluate this lazily, because this may be a forward reference,
// meaning that getCompiledTarget may throw an error until compilation is complete
function reference({getCompiledTarget}) {
  return x => getCompiledTarget()(x);
}

function compilePrimitive(tester, typeName) {
  return ({meta}) =>
    x => tester(x) ? null : { found: x, message: `Expected a value of type "${meta.typeName || typeName}" but found: ${JSON.stringify(x)}` };
}

const primitives = mapObject({
  string: x => typeof x === "string",
  number: x => !isNaN(x) && typeof x === "number",
  boolean: x => typeof x === "boolean",
  function: x => typeof x === "function",
  object: x => (typeof x === "object") && !Array.isArray(x) && (x !== null),
  any: () => true
}, compilePrimitive);

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

