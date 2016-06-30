
function struct({meta, fields}, recurse) {
  let fieldList = Object.keys(fields)
    .map(fieldName => `  ${fieldName}: ${recurse(fields[fieldName])}`);

  return `{\n${fieldList.join("\n")}\n}`;
}

const interpreters = {
  laxStruct: (tree, recurse) => struct(tree, recurse) + "// May contain additional fields",
  strictStruct: struct,
  literal: ({value}) => JSON.stringify(value),
  optional: ({contents}, recurse) => `optional(${recurse(contents)})`,
  alternatives: ({options}, recurse) => options.map(recurse).join(" | "),
  dictionary: ({keys, values}, recurse) => `Dictionary<${recurse(keys)}, ${recurse(values)}>`,
  array: ({contents}, recurse) => `[${recurse(contents)}]`,
  intersection: ({parents}, recurse) => parents.map(recurse).join(" & "),
  reference: ({referenceName}) => referenceName,
  string: () => "string",
  number: () => "number",
  boolean: () => "boolean",
  function: () => "function",
  object: () => "object",
  any: () => "any"
};

export default interpreters;

