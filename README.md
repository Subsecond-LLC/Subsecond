# Subsecond

A jQuery like syntax for typescript codemod.
Try it out: [Subsecond Playground](https://playground.subsecond.app/)

## An Example

Let's say you have a function `registerCar` that takes 4 parameters: make, model, color, and year. It's been decided to switch this function to take a single parameter which is an object with each of the four previous parameters as keys. `registerCar` could potentially be in your codebase hundreds of times. Manually would be annoying, regex get way too complicated.

```ts
// Before:
registerCar('Honda', 'CR-V', 'silver', 2004);

// After:
registerCar({
  make: 'Honda',
  model: 'CR-V',
  color: 'silver',
  year: 2004,
});
```

Enter Subsecond! This problem can be solved in 10 lines of code:

```ts
S('CallExpression.registerCar').each((registerCar) => {
  const carParams = registerCar.children().map((child) => child.text());

  registerCar.text(`
    registerCar({
      make: ${carParams[1]},
      model: ${carParams[2]},
      color: ${carParams[3]},
      year: ${carParams[4]},
    })
  `);
});
```

## Why?

JavaScript was originally created as a scripting language to do simple manipulations on the DOM node tree. Core JavaScript in the early days was difficult to use, so jQuery emerged as the de facto way to write JavaScript.

Later, as web technology advanced, the goal of JavaScript changed. Now the goal was not to just manipulate the DOM, but to define it fully. React and JSX is the big winner in this new era.

It is very common to look back at jQuery as not able to meet the demands of modern web development, and therefore outdated. I think the opposite is true, **jQuery is the best way we have found so far to make transformations to a node tree.**

Even today in 2022, jQuery is used in [77.3%](https://w3techs.com/technologies/overview/javascript_library) of the top 10 million most visited websites. It is really good at what it sets out to do.

Zooming back out, Abstract Syntax Trees (ASTs) are a way to describe code in a machine readable way in a syntax that looks at least a little bit simmilar to the DOM of an HTML wepage. jscodeshift is a very cool tool, but it is really confusing and heavy to use.

Codemod is currently at the same point as early JavaScript. It can do some cool stuff, but its confusing and hard to use and learn. Subsecond aims to turn codemod into a easy to understand tool to add to your toolbox.

## Selectors

Currently support for selectors is limited, but it will grow soon.
Use https://astexplorer.net/ set to `@typescript-eslint/parser` to figure out what everything is named.

### The empty selector: `S()`

Selects the root nodes of all files currently loaded.

### Just ESTree selector: `S('FunctionDeclaration')`

Selects all nodes of this type across all files

### ESTree with name: `S('FunctionDeclaration.testFunction')`

Selects all nodes with both the type and name

### Comma Separator: `S('FunctionDeclaration, CallExpression')`

Select all `FunctionDeclaration` nodes and `CallExpression` nodes.

### Space Separator: `S('ExpressionStatement Literal')`

Select only `Literal` nodes that have some ancestor `ExpressionStatement` node.

// TODO: more complicated selector syntax

## Documentation

### `S.load(files: Record<string, string>): void`

Load typescript files into the Subsecond object.

```ts
Subsecond.load({ 'index.ts': "console.log('Hello World!');" });
```

### `S.print(): Record<string, string>`

returns the modified files.

```ts
Subsecond.print();
// { 'index.ts': "console.log('Hello World!')" }
```

### `S(selector?: string, context?: Subsecond): Subsecond`

Select a list of nodes using the selector syntax above.

### `type(): string`

Returns the [estree spec](https://github.com/estree/estree) type of currently selected node.

### `text(): string`

```ts
S('CallExpression').text();
// console.log('Hello World!')
```

### `text(newText: string | ((oldText: string) => string)): Subsecond`

```ts
S('CallExpression').text("console.log('something else!')");
```

### `name(): string`

return the names of all currently selected nodes.

```ts
S('CallExpression').name();
// console.log
```

### `name(newName: string | ((oldName: string) => string)): Subsecond`

Change the names of all currently selected nodes.

```ts
S('CallExpression').name((oldName) => oldName.split('').reverse().join(''));
// gol.elosnoc('Hello World!');
```

### `attr(name: string): string | boolean | undefined;`

Get any attribute exposed from `@typescript-eslint/typescript-estree` on a selected node.

```ts
// check { fn: function() {} } vs. { fn() {} }
S('Property').attr('method');
```

### `before(newNode: string): Subsecond`

Insert an element directly before each currently selected node.

```ts
S('Program').children().eq(0).before("import S from 'subsecond';\n");
```

### `after(newNode: string): Subsecond`

Insert an element directly after each currently selected node.

### `lines(): number`

The total number of lines taken up by selected nodes. Nodes with overlapping lines are only counted once.

### `eq(index: number): Subsecond`

Select a specific numbered index.

### `length: number`

```ts
S('CallExpression').length;
// 1
```

### `each(callback: (element: Subsecond, i: number, original: Subsecond) => void): Subsecond`

Define a callback function to be executed on each selected node individually.

```ts
S('Identifier').each((id) => console.log(id.text()));
// console
// log
```

### `map<T>(callback: (element Subsecond, i: number, original: Subsecond) => T): T[]`

Transform each selected node and return all results in an array.

```ts
S('Identifier').map((id) => id.text());
// ['console', 'log']
```

### `filter(callback: (element: Subsecond, i: number, original: Subsecond) => boolean): Subsecond`

Define a callback function that returns true or false for if the node should be in the resulting array.

```ts
S('Identifier').filter((id) => id.text().length > 2);
```

### `find(selector: string): Subsecond`

Query selector on an array of previously selected nodes.

```ts
S('VariableDeclaration').find('Property');
```

### `parent(selector?: string | number): Subsecond`

Select the parent node of each of the currently selected nodes

```ts
// Go back one generation
S('Property').parent();

// Go back 3 generations
S('Property').parent(3);

// Go back generations until a selector is true
S('Property').parent('VariableDeclaration');
```

`children(selector?: string): Subsecond`
Selects only the immidate next generation children for each currently selected node.

```ts
// select all children
S('CallExpression').children();

// select only specific children
S('CallExpression').children('Literal');
```

### `fileName(): string`

Get the fileName associated with the currently selected node.

### `esNodes(): es.TSESTree.Node[]`

Eject out of Subsecond to the current underlying array of nodes from `@typescript-eslint/typescript-estree`.

### `toNewFile(fileName: string): Subsecond`

Move currently selected nodes to a new file.

```ts
// move all function declarations longer than 10 lines to their own files
S('FunctionDeclaration')
  .filter((fn) => fn.lines() > 10)
  .each((fn) => fn.toNewFile(`${fn.name()}.ts`));
```
