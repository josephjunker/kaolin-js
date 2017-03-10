
import {core} from "./core-combinators";
import {clone, flatMap, filterObject, mapObject, mergeObjects} from "./utils";
import findShortestPathTree from "./shortest-path-tree";

export default () => {
  let types = {},
      metadata = {},
      typeConverters = {
        existingConversions: {},
        bySource: {},
        byDestination: {}
      },
      typeConverterCache = null;

  return {
    newType: (name, definition, meta) => {
      if (types[name]) throw new Error(`Cannot redefine the existing type ${name}`);
      types[name] = clone(definition);
      metadata[name] = clone(meta) || {};
      return core.reference(name);
    },
    newTypeConverter: (sourceType, destinationType, fn) => {
      const {existingConversions} = typeConverters;
      if (existingConversions[sourceType] && existingConversions[sourceType][destinationType])
        throw new Error(`A conversion already exists from type ${sourceType} to type ${destinationType}`);

      typeConverters.bySource[sourceType] = typeConverters.bySource[sourceType] || {};
      typeConverters.bySource[sourceType][destinationType] = fn;

      typeConverters.byDestination[destinationType] = typeConverters.byDestination[destinationType] || {};
      typeConverters.byDestination[destinationType][sourceType] = fn;

      existingConversions[sourceType] = existingConversions[sourceType] || {};
      existingConversions[sourceType][destinationType] = true;

      typeConverterCache = null;
    },
    getTypes: () => clone(types),
    getMetadata: () => clone(metadata),
    getTypeConverters: () => {
      if (typeConverterCache) return typeConverterCache;

      typeConverterCache = compileTypeConversions(typeConverters, types);
      return typeConverterCache;
    }
  };
};

function compileTypeConversions(typeConverters, types) {

  const links = flatMap(Object.keys(typeConverters.bySource),
                        source => Object.keys(typeConverters.bySource[source])
                                    .map(dest => [dest, source])),
        nodes = Object.keys(mergeObjects(types, core)),
        pathsToTypesByTarget = filterObject(
          nodes.reduce((acc, type) => {
            acc[type] = findShortestPathTree(nodes, links, type);
            return acc;
          }, {}),
          x => Boolean(x.length));

  return {
    paths: pathsToTypesByTarget,
    from: mapObject(typeConverters.bySource, destToFnMapping => ({ to: destToFnMapping }))
  };
}

