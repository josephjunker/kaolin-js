# Kaolin-js
Tools for validating, documenting, and combining data schemas for JavaScript

## Installation
`npm install schema-combinators`

## Overview

This library provides a set of combinators (functions that can easily be composed) for describing data schemas. The rules for combining validator functions are flexible, and custom validators may be used, meaning that any schema that you can validate using custom code can be expressed using this tool. Once created, a schema can be converted into multiple forms; currently this means that either validation functions or textual documentation can be created from a schema.

Here are some examples of defining types in this system:

```javascript
import {core, createScope} from "schema-combinators";

const scope = createScope();

const blogPostMetadata = scope.newType(
  "blogPostMetadata",
  core.dictionary(core.string(), core.alternatives(core.string(), core.number())));

const blogPost = scope.newType("blogPost", core.laxStruct({
  author: core.string(),
  title: core.string(),
  paragraphs: core.array(core.string()),
  metadata: core.optional(blogPostMetadata)
});

const user = scope.newType("user", core.strictStruct({
  username: core.string(),
  blogPosts: core.array(blogPost)
});
```

Now we can compile this scope:

```javascript
import {compileValidators, compileDocumentation} from "schema-combinators";

const validators = compileValidators(scope),
      documentation = compileDocumentation(scope);
```

`validators` will be an object whose keys are the names passed to `newType` above ("blogPostMetadata", "blogPost", and "user") and whose values are validation functions. Validation functions take a single value, and return `null` or `undefined` if the value conforms to the schema, or an object describing the error if there is a validation error.

`documentation` will be an object with the same keys as `validators`, but whose values are strings.
`blogPostMetadata`: `Dictionary<string, string | number>`
`blogPost`:
```
{
  author: string,
  title: string,
  paragraphs: [string],
  metadata: optional(blogPostMetadata)
} // May contain additional fields
```
`user`:
```
{
  username: string,
  blogPosts: [blogPosts]
}
```

## Schema Components
The contents of `core` are a set of functions, each of which returns a type descriptor. These descriptors may be combined or passed in to `scope.newType`.

### string()
Returns a typeDescriptor which allows strings.

#### examples
```javascript
scope.newType("username", core.string());
```

### boolean()
Returns a typeDescriptor which allows booleans.

#### examples
```javascript
scope.newType("isEnabled", core.boolean());
```

### number()
Returns a typeDescriptor which allows numbers.

#### examples
```javascript
scope.newType("score", core.number());
```

### function()
Returns a typeDescriptor which allows functions.

#### examples
```javascript
scope.newType("func", core.function());
```

### object()
Returns a typeDescriptor which allows objects.

#### examples
```javascript
scope.newType("anyObject", core.object());
```

### any()
Returns a typeDescriptor which allows any value.

#### examples
```javascript
scope.newType("anyThing", core.any());
```

### literal(value)
Returns a typeDescriptor which allows a specific literal value.  Validation functions will compare their provided value to this value using `===` when determining if their argument conforms to the schema.

#### arguments
* `value` - a primitive value that can be compared via `===`

#### examples
```javascript
scope.newType("theNumber4", core.literal(4));
scope.newType("theStringFoo", core.literal("foo"));
scope.newType("false", core.literal(false));
```

### array(contents)
Returns a typeDescriptor which allows an array of the given type.

#### arguments
* `contents` - a typeDescriptor

#### examples
```javascript
scope.newType("arrayOfNumbers", core.array(core.number()));
scope.newType("arrayOfStrings", core.array(core.string()));
scope.newType("arrayOfArrayOfStrings", core.array(core.array(core.string())));
```

### laxStruct(fields)
Returns a typeDescriptor which allows objects containing the specified fields. A lax struct validator will accept objects that have more fields than those specified in the typeDescriptor.

#### arguments
* `fields` - an object whose keys are field names and values are typeDescriptors

#### examples
```javascript
scope.newType("playerInfo", core.laxStruct({
  playerName: core.string(),
  playerScore: core.number()
});
```

### strictStruct(fields)
Returns a typeDescriptor which allows objects containing the specified fields. A strict struct validator will reject objects that have more fields than those specified in the typeDescriptor.

#### arguments
* `fields` - an object whose keys are field names and values are typeDescriptors

#### examples
```javascript
scope.newType("playerInfo", core.strictStruct({
  playerName: core.string(),
  playerScore: core.number()
});
```

### dictionary(keys, values)
Returns a typeDescriptor which allows objects whose keys and values are of the specified types.

#### arguments
* `keys` - a typeDescriptor for the allowed type of the dictionary's keys. Although JavaScript only allows strings as the keys for objects, [custom types](#customlabel-args) and [intersection](#intersectionparents) can be used to only allow strings which match specific validators
* `values` - a typeDescriptor for the allowed type of the dictionary's values

#### examples
```javascript
scope.newType("featureFlags", core.dictionary(core.string(), core.boolean()));
```

### optional(contents)
Returns a typeDescriptor which allows values of the given type, or null or undefined. If a field in a struct is marked optional, the struct will accept objects that are missing that field.

#### arguments
* `contents` - a typeDescriptor for the allowed type

#### examples
```javascript
scope.newType("possiblyNumber", core.optional(core.number()));
scope.newType("objectMaybeContainingString", core.strictStruct({
  string: core.optional(core.string())
});
```

### reference(typeName)
Returns a typeDescriptor which references another type. This can be used to implement recursive types or reference types that will be declared later.
```javascript
scope.newType("dictionaryOfNumberArrays", core.dictionary(core.string(), core.reference("numberArray")));
scope.newType("numberArray", core.array(core.number()));

scope.newType("numericTree", core.strictStruct({
  left: core.optional(core.reference("numericTree")),
  value: core.number(),
  right: core.optional(core.reference("numericTree"))
});
```

### custom(label, ...args)
Returns a typeDescriptor for a custom type. Custom types are validated with user-provided validators, as described in [using custom types](#using-custom-types)

#### arguments
* `label` - a string, the name of the custom type. A custom compiler with this name must be passed to `compileValidators` or `compileDocumentation`, as described in [using custom types](#using-custom-types)
* `...args` - a variable-length argument list of additional arguments to the custom type

#### examples
```javascript
scope.newType("stringNumberTuple", core.custom("tuple", core.string(), core.number()));
```

### intersection(...parents)
Returns a typeDescriptor for a type which matches all of the provided types. This lets you combine types to produce a more specific refinement.

#### arguments
* `...parents` - a variable-length argument list of typeDescriptors

#### examples
```javascript
const withNumber = scope.newType("structWithNumberField", core.laxStruct({
  number: core.number()
}));

const withString = core.laxStruct({ string: core.string() });

scope.newType("structWithNumberAndStringField", core.intersection(withNumber, withString));
```

### alternatives(...options)
Returns a typeDescriptor for a type which matches any of the provided typeDescriptors.

#### arguments
* `...options` - a variable-length argument list of typeDescriptors

#### examples
```javascript
scope.newType("arrayOfStringsOrNumbers", core.array(core.alternatives(core.number(), core.string())));

scope.newType("treeWithStringNodes", core.strictStruct({
  left: core.alternatives(core.reference("treeWithStringNodes"), core.number()),
  right: core.alternatives(core.reference("treeWithStringNodes"), core.number())
});
```

### enum(...members)
Returns a typeDescriptor for a type which is exactly equal to any of the provided values. Equivalent to calling `alternatives` with only `literal` values.

#### arguments
* `...members` - a variable-length argument list of values

#### examples
```javascript
scope.newType("alignment", core.enum("left", "right", "center"));

scope.newType("optionsFlags", core.enum(0, 1, "0", "1", "enabled", "disabled", true, false));
```

## Using custom types
Custom types may be added by providing handlers as an additional
argument to the compilation functions. A separate handler function must
be added for each output type. (i.e. one function for validation and one
function for documentation) The handlers must have the signature
`handlerFn(typeDescriptor, recurse)`, where `typeDescriptor` is the
object produced by a call to `core.custom(...)`, and where `recurse` is
a function which takes a typeDescriptor and returns the compiled form of
that type (i.e., it produces a validation function when compiling
validators, or a string when compiling documentation.

This is the schema for typeDescriptors that will be passed in to the handler function:
```javascript
strictStruct({
  meta: laxStruct({ typeName: optional(string()) }), // The name this type was given with scope.newType
  label: string(),
  args: array(any()) // The arguments that were passed to custom() after the type's label
})
```

When producing validators, the handler function should return another function. This function should take any value as an argument, and return null if that value is of the correct type, and an error description object if it is of the wrong type. In order for error messages to be helpful, the error description object needs to match this schema:
```javascript
strictStruct({
  message: string(),
  innerErr: optional(object()) // The error produced by another type that was passed as an argument, if any
})
```

This is an example of the full process of adding a custom type:

```javascript

import {core, createScope, compileDocumentation, compileValidators} from "schema-combinators";

function makeTupleValidator({args}, recurse) {
  var compiledArgs = args.map(recurse);

  return x => {
    if (!Array.isArray(x)) return {
      message: "expected an array, but found: " + JSON.stringify(x)
    };

    if (x.length !== args.length) return {
      message: "expected an array of length " + args.length + ", but found one of length: " + x.length
    };

    for (let i = 0; i < x.length; i++) {
      const err = compiledArgs[i](x[i]);
      if (err) return {
        message: "error at index " + i,
        innerError: err
      };
    }
  };
}

function makeTupleDocumentation({meta, args}, recurse) {
  return `tuple<${args.map(recurse).join(", ")}>`;
}

const scope = createScope();

scope.newType("stringBooleanNumber", core.custom("tuple", core.string(), core.boolean(), core.number()));

// The key in the object arguments on these lines must match the string argument to custom() above
const validators = compileValidators(scope, { tuple: makeTupleValidator }),
      documentation = compileDocumentation(scope, { tuple: makeTupleDocumentation });

const validate = validators.stringBooleanNumber;
console.log(validate(["foo", true, 1])); // Logs nothing
console.log(validate({})); // Logs an error
console.log(validate(["foo", true])); // Logs an error
console.log(validate(["foo", true, "bar"])); // Logs an error

console.log(documentation.stringBooleanNumber); // Logs "tuple<string, boolean, number>"
```

Custom types can be useful when combined with `intersection`, to make more specific primitive types. Here are some examples:
```javascript
function makeDivisibleByValidator({args}) {
  const factor = args[0];
  return x => (x % factor === 0) ? null : { message: "expected a number divisible by " + factor };
}

function makeDivisibleByDocumentation({args}) {
  const factor = args[0];
  return `divisibleBy(${factor})`;
}

function makeRegexValidator({args}) {
  const pattern = args[0];
  return x => pattern.test(x) ? null : { message: "did not match regex: " + pattern.toString() };
}

function makeRegexDocumentation({args}) {
  return args[0].toString();
}

const scope = createScope();

const divisibleBy = n => core.custom("divisibleBy", n);

const even = scope.newType("even", core.intersection(core.number(), divisibleBy(2)));
const divisibleByThree = scope.newType("byThree", core.intersection(core.number(), divisibleBy(3)));
const divisibleBySix = scope.newType("bySix", core.intersection(even, divisibleByThree));
const notOneOrFiveModSix = scope.newType("contrived", core.alternatives(even, divisibleByThree))

// Bad regex used for example purposes only
const phoneNumber = scope.newType("phoneNumber", core.intersection(core.string(), core.custom("regex", /\d\d\d-\d\d\d-\d\d\d\d/)));
const phoneBook = scope.newType("phoneBook", core.dictionary(phoneNumber, core.string()));

const validators = compileValidators(scope, {
  divisibleBy: makeDivisibleByValdator,
  regex: makeRegexValidator
});

const documentation = compileDocumentation(scope, {
  divisibleBy: makeDivisibleByValdator,
  regex: makeRegexValidator
});

// validators and documentation have keys "even", "byThree", "bySix", "contrived", "phoneNumber", and "phoneBook"
```

## Errors
As much as possible, this library aims to produce useful error messages. Passing invalid data to `newType` should give you a human-readable error, as should most cases of invalid type definitions. If you find cases where bad input results in errors that do not help with debugging, please open an issue.

Apart from programmer errors, validators produced by this library return a string when validation fails, providing a verbose description of the error that occurred. As an example, given this code:
```javascript
const stringArray = scope.newType("stringArray", core.array(core.string())),
      innerStruct = scope.newType("innerStruct", core.strictStruct({ strings: stringArray })),
      outerStruct = scope.newType("outerStruct", core.strictStruct({ struct: innerStruct })),
      validator = compileValidators(scope).outerStruct;

console.log(validator({ struct: { strings: ["a", "b", "c", 1] } }))
```
we will get this error message logged:
```
In type "outerStruct", in field "struct":
In type "innerStruct", in field "strings":
In type "stringArray" at index 3:
Expected a value of type "string" but found: 1
```

## Advanced usage: implementing additional compilers
There are uses for this schema data beyond the validators and string documentation provided here. For instance, they could be compiled into another documentation format. To do this, you can use the function found at `schemaCombinators.compilerTools.compile`. This function has the signature `compile(types, descriptorHandlers, customHandlers)`. `types` is the result of a call to `scope.getTypes()`, `descriptorHandlers` is an object whose keys are core type names and whose values are your custom compiler functions, and `customHandlers` is the same type of object described in [using custom types](#using-custom-types).

The custom compiler functions have the signature `compileType(typeDescriptor, recurse, markAsCompiled)`. `typeDescriptor` is the object created by calls to the functions in `core`, `recurse` is a function which compiles a typeDescriptor (to handle types that are nested) and `markAsCompiled` takes a value of your compiler's output type, and wraps it so it can be `recursed` over safely.

To write a custom compiler, a compiler function will have to be provided for each of the types listed in [Schema components](#schema-components). The files `src/validator-interpreters` and `src/documentation-interpreters` are good examples; they're implemented identically to how an external compiler would be. `src/compiler-facade` shows how type definitions can be checked and manipulated before compilation.

## LICENSE
MIT
