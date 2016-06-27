
import {mergeObjects, arrayIntersection} from "./utils";

const markAsCompiled = (compiledValue) => ({ name: "compiled", compiledValue });

function compile(tree, typeDefinitions, compiledTypes, interpreters) {
  var name = tree.name;

  if (name === "compiled") return tree.compiledValue;

  if (name === "reference") {
    if (!typeDefinitions[tree.referenceName])
      throw `Found a forward reference to the type "${reference}" but no definition for that type`;

    tree.getCompiledTarget = () => compiledTypes[tree.referenceName];

    return interpreters.reference(tree);
  }

  if (name === "customPrimitive" || name === "customCollection") {
    const customInterpreter = interpreters.custom[tree.label];
    if (!customInterpreter)
      throw `Found a reference to the custom type ${tree.label} but no custom interpreter for this type`;

    return customInterpreter(tree);
  }

  const recurse = (subtree) => compile(subtree, typeDefinitions, compiledTypes, interpreters),
        interpreter = interpreters[name];

  if (!interpreter) throw `Found a reference to the type ${name} but no interpreter for this type`;

  return interpreter(tree, recurse, markAsCompiled);
}

export default function (typeDefinitions, interpreters, customInterpreters) {

  const allInterpreters = mergeObjects(interpreters, { custom: customInterpreters });

  let compiledDefinitions = {};

  Object.keys(typeDefinitions)
    .forEach(typeName => {
      compiledDefinitions[typeName] = compile(typeDefinitions[typeName], typeDefinitions, compiledDefinitions, allInterpreters);
    });

  return compiledDefinitions;
}

