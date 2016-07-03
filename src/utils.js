
function oneArgument(fn) { return x => fn(x); }

function mapObject(obj, fn) {
  return Object.keys(obj)
    .map(key => ({ key, value: fn(obj[key], key)}))
    .reduce((acc, {key, value}) => { acc[key] = value; return acc; }, {});
}

function mergeObjects(...objs) {
  return objs.reduce((acc, obj) => {
    Object.keys(obj).forEach(key => { acc[key] = obj[key]; });
    return acc;
  }, {});
}

function zip(arr1, arr2) {
  let result = [];

  for (let i = 0; (i < arr1.length) && (i < arr2.length); i++) {
    result[i] = [arr1[i], arr2[i]];
  }

  return result;
}

function firstTruthy(array, mapper) {
  for (let i = 0; i < array.length; i++) {
    let result = mapper(array[i]);
    if (result) return result;
  }
}

function anyPassing(array, predicate) {
  for (let i = 0; i < array.length; i++) {
    let result = predicate(array[i]);
    if (result) return true;
  }
  return false;
}

function firstTruthyWithIndex(array, mapper) {
  for (let i = 0; i < array.length; i++) {
    let result = mapper(array[i]);
    if (result) return [result, i];
  }

  return [];
}

function arrayDifference(arr1, arr2) {
  return arr1
    .filter(x => arr2.indexOf(x) === -1)
    .concat(arr2.filter(x => arr1.indexOf(x) === -1));
}

function arrayIntersection(arr1, arr2) {
  return arr1.filter(x => arr2.indexOf(x) !== -1);
}

function clone(obj) {
  return mapObject(obj, x => x);
}

function cloneDeep(obj) {
  let seen = [],
      created = [];

  function recursive(x) {
    const visited = seen.indexOf(x);
    if (visited !== -1) return created[visited];

    if (Array.isArray(x)) {
      let newArray = [];

      seen.push(x);
      created.push(newArray);

      return x.map(recursive);
    } else if (typeof x === "object") {

      if (x === null) return null;

      let newObj = {};

      seen.push(x);
      created.push(newObj);

      Object.keys(x).forEach(key => {
        newObj[key] = recursive(x[key]);
      });

      return newObj;
    }

    return x;
  }

  return recursive(obj);
}

export {
  oneArgument,
  mapObject,
  mergeObjects,
  firstTruthy,
  anyPassing,
  firstTruthyWithIndex,
  arrayDifference,
  clone,
  cloneDeep,
  arrayIntersection,
  zip
};

