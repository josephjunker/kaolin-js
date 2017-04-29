
import {mapObject, firstTruthy, arrayDifference, mergeObjects, anyPassing, firstTruthyWithIndex} from "./utils";
import {core} from "./core-combinators";

function laxStruct ({fields, meta}, recurse, compiled) {
  const compiledFields = mapObject(fields, recurse);

  const descriptor = core.intersection(
    core.object(),
    compiled(x => {

      const fieldsToCheck = Object.keys(compiledFields),
            results = {};
      for (let i = 0; i < fieldsToCheck.length; i++) {
        const fieldName = fieldsToCheck[i],
              {found, failure} = compiledFields[fieldName](x[fieldName]);
        if (failure) return { failure: true };
        results[fieldName] = found;
      }

      return { found: results };
    }));

  return recurse(descriptor);
}

function strictStruct ({fields, meta}, recurse, compiled) {
  let laxStructDescriptor = core.laxStruct(fields);

  let descriptor = core.intersection(
    laxStructDescriptor,
    compiled(x => {
      const extraKey = Object.keys(x).find(key => !fields[key]);
      const results = extraKey ? { failure: true } : { found: x };

      return results;
    }));

  return recurse(descriptor);
}

function literal({value}) {
  return x => x === value ? { found: x } : { failure: true };
}

function optional({contents, meta}, recurse) {
  const validateContents = recurse(contents);

  return x => {
    if (x === null || x === undefined) return { found: x };

    const {failure, found} = validateContents(x);
    if (failure) return { failure: true };
    return { found };
  };
}

function alternatives({options, meta}, recurse) {
  const compiledOptions = options.map(recurse);

  return x => {
    for (let i = 0; i < compiledOptions.length; i++) {
      const { failure, found } = compiledOptions[i](x);
      if (!failure) return { found };
    }

    return { failure: true };
  };
}

function dictionary({keys, values, meta}, recurse, compiled) {

  const keyValidator = recurse(keys),
        valueValidator = recurse(values);

  let descriptor = core.intersection(
    core.object(),
    compiled(x => {

      const result = {},
            keys = Object.keys(x);

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const { found: foundKey, failure } = keyValidator(key);

        if (failure) return { failure };

        const { found: foundValue, failure: valueFailure } = valueValidator(x[key]);

        if (valueFailure) return { failure: valueFailure };

        result[foundKey] = foundValue;
      }

      return { found: result };
    }));

  return recurse(descriptor);
}

function _array({contents, meta}, recurse) {
  const contentsValidator = recurse(contents);
  return x => {
    if (!x || !Array.isArray(x)) return { failure: true };

    const results = [];
    for (let i = 0; i < x.length; i++) {
      const { failure, found } = contentsValidator(x[i]);
      if (failure) return { failure: true };
      results[i] = found;
    }

    return { found: results };
  };
}

function intersection({parents, meta}, recurse) {
  const validators = parents.map(recurse);

  return x => {
    let i = 0,
        result = x;

    while (i < validators.length) {
      const { found, failure } = validators[i](result);

      if (failure) return { failure: true };

      result = found;
      i++;
    }

    return { found: result };
  };
}

function refined({base, condition}, recurse) {
  return x => {
    const { found, failure } = recurse(base)(x);

    if (failure) return { failure };

    if (condition(found)) return { found };

    return { failure: true };
  };
}

function reference({getCompiledTarget, referenceName}, typeConverters, getInterpreterForType) {

  const check = x => {

    const { failure, found } = getCompiledTarget()(x);

    if (!failure) return {found};

    const possibilities = typeConverters.paths[referenceName];

    if (!possibilities) return {failure: true};

    const converted = firstTruthy(
      possibilities,
      path => {
        let i = 0,
            transformed = x;

        while (i + 1 < path.length) {
          let from = path[i],
              to = path[i + 1];

          let { failure, found } = getInterpreterForType(from)(transformed);

          if (failure) return null;

          transformed = typeConverters.from[from].to[to](transformed);
          i++;
        }

        // A transformation may only convert one outer layer of a data structure, leaving inner layers in need
        // of conversions. We recurse to allow these partial-transformations
        return check(transformed);
      });

    return converted || { failure: true };
  };

  return check;
}

function compilePrimitive(tester, typeName) {
  return () => x => tester(x) ? { found: x } : { failure: true };
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
  reference,
  refined
});

