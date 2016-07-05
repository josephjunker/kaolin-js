
import {schema, TypeNode} from "./core-combinators";
import {firstTruthy} from "./utils";
import SchemaError from "./schema-error";

function detectErrorsInNode(node) {
  if (!node || typeof node !== "object") return "Found a non-object in the type graph";
  if (!node.name) return "Found a type graph node with no 'name' field";
  if (!node.meta) return "Found a type graph node with no 'meta' field";

  const nodeSchema = schema[node.name];

  const fieldError = firstTruthy(
    nodeSchema.plainFields || [],
    fieldName => node.hasOwnProperty(fieldName) ? null : `Found a ${node.name} node with no "${fieldName}" field`);

  const childError = firstTruthy(
    nodeSchema.childFields || [],
    fieldName => node[fieldName] ? null : `Found a ${node.name} node with no "${fieldName}" field`);

  const listError = nodeSchema.listField ?
    (Array.isArray(node[nodeSchema.listField]) ? null : `Found a ${node.name} node without an array "${nodeSchema.listField}" field`) :
    null;

  const objectError = firstTruthy(
    nodeSchema.objectFields || [],
    fieldName =>
      node[fieldName] && typeof node[fieldName] === "object" ?
        null :
        `Found a ${node.name} node without an array "${fieldName}" field`);

  return fieldError || childError || listError || objectError;
}

function verifyTreeIsWalkable(tree, typeName) {
  const checkRecursively = (node, path, inCustomType) => {

    // Custom types may take arguments other than type nodes, so we filter those out from validation
    if (inCustomType && !(node instanceof TypeNode)) return;

    const error = detectErrorsInNode(tree);
    if (error) return { error, path };

    const nodeSchema = schema[node.name];
    if (!nodeSchema)
      return {
        error: `Found a node with an invalid name: "${node.name}".\nAllowed node types are: [${Object.keys(schema).join(", ")}]`,
        path
      };

    if (nodeSchema.childFields) {
      const childError = firstTruthy(
        nodeSchema.childFields,
        fieldName => checkRecursively(
          node[fieldName],
          path.concat(`In a node of type ${node.name}, in field "${fieldName}"`),
          node.name === "custom"
        ));

      if (childError) return childError;
    }

    if (nodeSchema.objectFields) {
      const objectError = firstTruthy(
        nodeSchema.objectFields,
        fieldName =>
          firstTruthy(
            Object.keys(node[fieldName]),
            subFieldName => {
              const pathMessage = `In a node of type ${node.name}, in field "${fieldName}.${subFieldName}"`;
              const subField = node[fieldName][subFieldName];
              return checkRecursively(subField, path.concat(pathMessage), node.name === "custom");
            }));

      if (objectError) return objectError;
    }

    if (nodeSchema.listField) {
      const fieldName = nodeSchema.listField,
            list = node[fieldName],
            listError = list
              .map((item, index) =>
                checkRecursively(
                  item,
                  path.concat(`In a node of type ${node.name}, in field "${fieldName}", at index ${index}`),
                  node.name === "custom"
                ))
              .filter(Boolean)[0];

      if (listError) return listError;
    }
  };

  const error = checkRecursively(tree, [], false);
  if (error) {
    const errorMessage = error.path.join("\n") + "\n" + error.error;
    throw new SchemaError(errorMessage, typeName);
  }
}

export { verifyTreeIsWalkable };

