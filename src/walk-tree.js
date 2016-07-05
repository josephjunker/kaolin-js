
import {schema} from "./core-combinators";
import {mapObject} from "./utils";

function makeNodeTraverser({childFields, objectFields, listField}) {
  let fns = [];

  if (childFields) fns.push((tree, fn) => childFields.forEach(fieldName => fn(tree[fieldName])));
  if (objectFields) fns.push((tree, fn) => objectFields.forEach(fieldName => mapObject(tree[fieldName], fn)));
  if (listField) fns.push((tree, fn) => tree[listField].forEach(fn));

  return (tree, fn) => {
    fns.forEach(traversalFunction => traversalFunction(tree, fn));
  };
}

const applyFunctionToChildren = mapObject(schema, makeNodeTraverser);

function forEach(tree, fn) {
  fn(tree);
  applyFunctionToChildren[tree.name](tree, fn);
}

export { forEach };

