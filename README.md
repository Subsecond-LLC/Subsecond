# Subsecond

A jQuery like syntax for typescript codemod.

Try it out: [Subsecond Playground](https://playground.subsecond.app/)

Read the [Documentation](https://playground.subsecond.app/docs)

# Getting Started

## 1. Start a new project

> A new directory

```bash
> mkdir subsecond-example
> cd subsecond-example
```

> Initialize an npm project

```bash
> npm init
```

## 2. Install the library

> npm

```bash
> npm install subsecond
```

> yarn

```bash
> yarn add subsecond
```

## 3. Start writing code

> index.js

```ts
import S from 'subsecond';

S.load({ 'example.js': "console.log('Hello World!');" });

S('Identifier.log').text('error');

console.log(S.print());
```

> Running this with `node index.js` results in:

```json
{
  "example.js": "console.error('Hello World');"
}
```

All Subsecond scripts follow the same basic structure:

1. `S.load()` all of the code we want to modify.
2. `S()` selectors and modification functions like `.text()` and `.before()`.
3. `S.print()` at the end to output our finished product.

# A full example

```ts
import S from 'subsecond';

const registerCarJS = `
registerCar("Honda", "CR-V", "silver", 2004);
`;

S.load({ 'registerCar.js': registerCarJS });

S('CallExpression.registerCar').each((registerCar) => {
  const carParams = registerCar.children().map((child) => child.text());

  // carParams[0] is the function name itself "registerCar", so skip it.
  registerCar.text(`
    registerCar({
      make: ${carParams[1]},
      model: ${carParams[2]},
      color: ${carParams[3]},
      year: ${carParams[4]},
    })
  `);
});

console.log(S.print()['registerCar.js']);
```

> Running this subsecond script results in the following output:

```ts
registerCar({
  make: 'Honda',
  model: 'CR-V',
  color: 'silver',
  year: 2004,
});
```

Let's say you have a function `registerCar` that takes 4 parameters:

- Make
- Model
- Color
- Year

It's been decided to switch this function to take a single parameter which is an object with each of the four previous parameters as keys.

`registerCar` could potentially be in your codebase hundreds of times. Manually would be annoying, regex get way too complicated.

This is how Subsecond can be used to fix this problem.

# Why?

JavaScript was originally created as a scripting language to do simple manipulations on the DOM node tree. Core JavaScript in the early days was difficult to use, so jQuery emerged as the de facto way to write JavaScript.

Later, as web technology advanced, the goal of JavaScript changed. Now the goal was not to just manipulate the DOM, but to define it fully. React and JSX is the big winner in this new era.

It is very common to look back at jQuery as not able to meet the demands of modern web development, and therefore outdated. I think the opposite is true, **jQuery is the best way we have found so far to make transformations to a node tree.**

Even today in 2022, jQuery is used in [77.3%](https://w3techs.com/technologies/overview/javascript_library) of the top 10 million most visited websites. It is really good at what it sets out to do.

Zooming back out, Abstract Syntax Trees (ASTs) are a way to describe code in a machine readable way in a syntax that looks at least a little bit simmilar to the DOM of an HTML wepage. jscodeshift is a very cool tool, but it is really confusing and heavy to use.

Codemod is currently at the same point as early JavaScript. It can do some cool stuff, but its confusing and hard to use and learn. Subsecond aims to turn codemod into a easy to understand tool to add to your toolbox.

# Documentation

Read the [full documentation](https://playground.subsecond.app/docs)
