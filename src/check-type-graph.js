
import SchemaError from "./schema-error";
import {verifyTreeIsWalkable} from "./verify-tree-is-walkable";
import * as walkTypeTree from "./walk-tree";

function checkForReferenceCycle(types) {
  function followReferences(tree, types, visited=[]) {
    if (tree.name !== "reference") return;
    if (visited.indexOf(tree.referenceName)) return visited;
    return followReferences(types[tree.referenceName], types, visited.concat(tree.referenceName));
  }

  Object.keys(types).forEach(typeName => {
    const typeCycle = followReferences(types[typeName], types);
    if (typeCycle)
      throw new SchemaError(`Found a reference cycle consisting of types: [${typeCycle.join(", ")}]`, typeName);
  });
}

function checkReferenceValidities(types) {
  Object.keys(types).forEach(typeName => {
    walkTypeTree.forEach(types[typeName], ({name, referenceName}) => {
      if (name !== "reference") return;

      if (!types[referenceName])
        throw new SchemaError(`Found a reference to the type "${typeName}", but no definition for that type`);
    });
  });
}

function checkThatEntriesAreTrees(types) {
  Object.keys(types).forEach(typeName => {
    const tree = types[typeName];

    if (typeof tree === "function")
      throw new SchemaError("Found a function in the type graph. Did you forget to call the creator for a primitive, " +
            "like passing 'string' instead of 'string()'?", typeName);

    verifyTreeIsWalkable(tree, typeName);
  });
}

export default (types) => {
  checkThatEntriesAreTrees(types);
  checkReferenceValidities(types);
  checkForReferenceCycle(types);
};

