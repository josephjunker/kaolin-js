
import {oneArgument, mapObject} from "./utils";

function hasAndReturnsTypeName(name) {
  function x () { return name; }
  x.getTypeName = () => name;
  return x;
}

function computesType(typeObtainer) {
  return function (...args) {
    return hasAndReturnsTypeName(typeObtainer(...args));
  };
}

function runsDeepOrShallow(typeDescriptor) {
  return {
    shallow: typeDescriptor(internalType => internalType.getTypeName()),
    deep: typeDescriptor(internalType => internalType())
  };
}

const _string = hasAndReturnsTypeName("string");
const _number = hasAndReturnsTypeName("number");
const _boolean = hasAndReturnsTypeName("boolean");
const _function = hasAndReturnsTypeName("function");
const _object = hasAndReturnsTypeName("object");
const any = hasAndReturnsTypeName("any");

const literal = computesType(value => `${JSON.stringify(value)}`);

const customValidator = oneArgument(hasAndReturnsTypeName);

const _array = runsDeepOrShallow(accessNested => {
  return computesType(containedType => `[${accessNested(containedType)}]`);
});

const laxStruct = struct({ isStrict: false });
const strictStruct = struct({ isStrict: true });

function struct({isStrict}) {
  return runsDeepOrShallow(accessNested => (name, fields) => {
    function x () {
      let fieldList = Object.keys(fields)
        .map(fieldName => `  ${fieldName}: ${accessNested(fields[fieldName])}`);

      if (!isStrict) fieldList.push("  * // May contain additional fields");

      return "{\n" + fieldList.join(",\n") + "\n}";
    }

    x.getTypeName = () => name;

    return x;
  });
}

const dictionary = runsDeepOrShallow(accessNested => {
  return computesType((keys, values) => `Dictionary<${accessNested(keys)}, ${accessNested(values)}>`);
});

const optional = runsDeepOrShallow(accessNested => {
  return computesType(x => `optional(${accessNested(x)})`);
});

const alternatives = runsDeepOrShallow(accessNested => {
  return computesType((...alternatives) => alternatives.map(accessNested).join(" | "));
});

function alias(name, fn) {
  function wrapper(...args) {
    return fn(...args);
  }

  wrapper.getTypeName = () => name;

  return wrapper;
}

const refine = oneArgument(hasAndReturnsTypeName);

const intersection = runsDeepOrShallow(accessNested => {
  return computesType((...types) => types.map(accessNested).join(" & "));
});

const shallow = {
  _string,
  _number,
  _boolean,
  _function,
  _object,
  any,
  literal,
  customValidator,
  alias,
  refine,
  _array: _array.shallow,
  laxStruct: laxStruct.shallow,
  strictStruct: strictStruct.shallow,
  dictionary: dictionary.shallow,
  optional: optional.shallow,
  alternatives: alternatives.shallow,
  intersection: intersection.shallow
};

const deep = {
  _string,
  _number,
  _boolean,
  _function,
  _object,
  any,
  literal,
  customValidator,
  alias,
  refine,
  _array: _array.deep,
  laxStruct: laxStruct.deep,
  strictStruct: strictStruct.deep,
  dictionary: dictionary.deep,
  optional: optional.deep,
  alternatives: alternatives.deep,
  intersection: intersection.deep
};

function getDepthAwareCombinators(maxDepth) {
  let currentDepth = 0;

  function wrapInDepthCheck(fnName) {
    return (...args) => { currentDepth++; return (currentDepth === maxDepth) ?
      shallow[fnName](...args) :
      deep[fnName](...args);
    };
  }

  return mapObject(deep, wrapInDepthCheck);
}

export {
  shallow,
  deep,
  getDepthAwareCombinators
};

