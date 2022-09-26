import es, {
  parse,
  simpleTraverse,
  visitorKeys,
} from '@typescript-eslint/typescript-estree';

type Request = {
  kind?: string;
  name?: string;
}[];

type SubsecondThis = Subsecond & [key: SubsecondNode];

type Selector =
  | string
  | Record<string, string>
  | SubsecondNode[]
  | SubsecondNode;

interface Subsecond extends Iterable<SubsecondNode> {
  (this: SubsecondThis, selector?: Selector, context?: Subsecond): [
    key: SubsecondNode
  ];
  new (selector?: Selector, context?: Subsecond): Subsecond;
  init: init;
  constructor: typeof Subsecond;

  type(): string;

  text(): string;
  text(newText: string | ((oldText: string) => string)): Subsecond;

  name(): string;
  name(newName: string | ((oldName: string) => string)): Subsecond;

  attr(name: string): string | boolean | undefined;

  before(newNode: string): Subsecond;
  after(newNode: string): Subsecond;

  lines(): number;

  eq(index: number): Subsecond;
  length: number;

  each(
    callback: (element: Subsecond, i: number, original: Subsecond) => void
  ): Subsecond;
  map<T>(
    callback: (element: Subsecond, i: number, original: Subsecond) => T
  ): T[];
  filter(
    callback: (element: Subsecond, i: number, original: Subsecond) => boolean
  ): Subsecond;

  find(selector: Selector): Subsecond;
  parent(selector?: string | number): Subsecond;
  children(selector?: string): Subsecond;

  fileName(): string;
  esNodes(): es.TSESTree.Node[];
  toNewFile(fileName: string): Subsecond;
}

function Subsecond(selector?: Selector, context?: Subsecond): Subsecond {
  return new Subsecond.fn.init(selector, context);
}

Subsecond.fn = Subsecond.prototype = {
  constructor: Subsecond,

  find(selector) {
    // TODO I think context needs to get passed here...
    return Subsecond(selector, this);
  },

  type(this: SubsecondThis) {
    return this[0].esNode.type;
  },

  text(this: SubsecondThis, newText) {
    if (newText === undefined) {
      let allText = '';
      for (const ssNode of this) {
        allText += SubsecondInternals.getSSNodeText(ssNode);
      }
      return allText;
    }

    if (typeof newText === 'function') {
      for (const ssNode of this) {
        SubsecondInternals.replaceNodeWithText(
          ssNode,
          newText(SubsecondInternals.getSSNodeText(ssNode))
        );
      }
      return this;
    }

    // anything else is a direct setter
    for (const ssNode of this) {
      SubsecondInternals.replaceNodeWithText(ssNode, newText);
    }

    return this;
  },

  name(this: SubsecondThis, newName) {
    if (newName === undefined) {
      let allNames = '';
      for (const ssNode of this) {
        const nameIdentifier = SubsecondInternals.getSSNodeName(ssNode);
        allNames += SubsecondInternals.getSSNodeText(nameIdentifier);
      }
      return allNames;
    }

    if (typeof newName === 'function') {
      for (const ssNode of this) {
        const nameIdentifier = SubsecondInternals.getSSNodeName(ssNode);
        if (nameIdentifier != null) {
          SubsecondInternals.replaceNodeWithText(
            nameIdentifier,
            newName(SubsecondInternals.getSSNodeText(nameIdentifier))
          );
        }
      }
      return this;
    }

    // anything else is a direct setter
    for (const ssNode of this) {
      const nameIdentifier = SubsecondInternals.getSSNodeName(ssNode);
      if (nameIdentifier != null) {
        SubsecondInternals.replaceNodeWithText(nameIdentifier, newName);
      }
    }

    return this;
  },

  attr(this: SubsecondThis, name: string) {
    return (this[0].esNode as any)[name];
  },

  before(newNode) {
    for (const ssNode of this) {
      SubsecondInternals.insertNodeAt(ssNode, newNode, 'before');
    }

    return this;
  },

  after(newNode) {
    for (const ssNode of this) {
      SubsecondInternals.insertNodeAt(ssNode, newNode, 'after');
    }

    return this;
  },

  parent(selector) {
    const parentResults: SubsecondNode[] = [];
    if (selector === undefined) {
      for (const ssNode of this) {
        const parent = ssNode.esNode.parent ?? ssNode.esNode;
        parentResults.push({
          esNode: parent,
          fileName: ssNode.fileName,
        });
      }
      return Subsecond(parentResults);
    }

    // go back a specific number of generations
    if (typeof selector === 'number') {
      const parentResults: SubsecondNode[] = [];
      for (const ssNode of this) {
        let ancestor = ssNode.esNode;
        for (let i = 0; i < selector; i++) {
          ancestor = ancestor.parent ?? ancestor;
        }

        parentResults.push({
          esNode: ancestor,
          fileName: ssNode.fileName,
        });
      }
      return Subsecond(parentResults);
    }

    // TODO implement
    if (typeof selector === 'string') {
      const requests = SubsecondInternals.translateSelector(selector);
    }

    return this;
  },

  children(selector) {
    let ssNodeChildren: SubsecondNode[] = [];
    for (const ssNode of this) {
      for (const key of visitorKeys[ssNode.esNode.type] ?? []) {
        const children = (ssNode.esNode as any)[key];
        if (Array.isArray(children)) {
          ssNodeChildren.push(
            ...children.map((child) => ({
              esNode: child,
              fileName: ssNode.fileName,
            }))
          );
        } else if (children != null) {
          ssNodeChildren.push({
            esNode: children,
            fileName: ssNode.fileName,
          });
        }
      }
    }

    if (selector !== undefined) {
      const requests = SubsecondInternals.translateSelector(selector);
      ssNodeChildren = ssNodeChildren.filter((child) =>
        SubsecondInternals.applyRequests(requests, child.esNode, child.fileName)
      );
    }

    return Subsecond(ssNodeChildren);
  },

  fileName(this: SubsecondThis) {
    return this[0].fileName;
  },

  esNodes(this: SubsecondThis) {
    const esNodeList: es.TSESTree.Node[] = [];
    for (const ssNode of this) {
      esNodeList.push(ssNode.esNode);
    }
    return esNodeList;
  },

  toNewFile(this: SubsecondThis, fileName: string) {
    const text = this.text();
    const newSourceFile = parse(text, { range: true });
    Subsecond.sourceFiles[fileName] = newSourceFile;
    Subsecond.sourceTexts[fileName] = text;

    this.text('');

    return Subsecond({ fileName, esNode: Subsecond.sourceFiles[fileName] });
  },

  lines(this: SubsecondThis) {
    const lines: number[] = [];
    for (const ssNode of this) {
      const nodeLines = SubsecondInternals.getLinesOfSSNode(ssNode);
      for (let i = nodeLines[0]; i <= nodeLines[1]; i++) {
        lines.push(i);
      }
    }
    return new Set(lines).size;
  },

  eq(this: SubsecondThis, index) {
    return Subsecond(this[index]);
  },

  each(callback) {
    let i = 0;
    for (const ssNode of this) {
      callback(Subsecond(ssNode), i++, this);
    }
    return this;
  },

  map(callback) {
    const results: unknown[] = [];
    let i = 0;
    for (const ssNode of this) {
      results.push(callback(Subsecond(ssNode), i++, this));
    }
    return results;
  },

  filter(callback) {
    const filtered: SubsecondNode[] = [];
    let i = 0;
    for (const ssNode of this) {
      if (callback(Subsecond(ssNode), i++, this)) {
        filtered.push(ssNode);
      }
    }
    return Subsecond(filtered);
  },
} as Subsecond;

type SubsecondNode = { esNode: es.TSESTree.Node; fileName: string };

const SubsecondInternals = {
  isNotNullish<T>(value: T): value is NonNullable<T> {
    return value !== null && value !== undefined;
  },

  applyRequests(
    requests: Request[],
    esNode: es.TSESTree.Node,
    fileName: string
  ) {
    return requests.some((request) => {
      const lastRequestPart = request[request.length - 1];

      if (
        lastRequestPart.kind === esNode.type &&
        (lastRequestPart.name == null ||
          lastRequestPart.name ===
            SubsecondInternals.getSSNodeText(
              SubsecondInternals.getSSNodeName({ fileName, esNode })
            ))
      ) {
        // the top level request is matched, now we need to parse through parents to match everything else.
        let esNodeParent = esNode.parent;
        let currentRequestPartIndex = request.length - 2;
        while (esNodeParent != null) {
          if (currentRequestPartIndex === -1) return true;
          if (
            request[currentRequestPartIndex].kind === esNodeParent.type &&
            (request[currentRequestPartIndex].name == null ||
              request[currentRequestPartIndex].name ===
                SubsecondInternals.getSSNodeText(
                  SubsecondInternals.getSSNodeName({
                    fileName,
                    esNode: esNodeParent,
                  })
                ))
          ) {
            currentRequestPartIndex--;
          }
          esNodeParent = esNodeParent.parent;
        }
      }
    });
  },

  walk(requests: Request[], esNode: es.TSESTree.Node, fileName: string) {
    const results: SubsecondNode[] = [];
    simpleTraverse(
      esNode,
      {
        enter: (subNode) => {
          if (SubsecondInternals.applyRequests(requests, subNode, fileName)) {
            results.push({ esNode: subNode, fileName });
          }
        },
      },
      true
    );

    return results;
  },

  translateSelector(selector: string): Request[] {
    return selector.split(',').map((request) => {
      const requestParts = request.trim().split(' ');
      return requestParts.map((requestPart) => {
        const trimmedPart = requestPart.trim();
        if (trimmedPart.includes('.')) {
          const splitTrimmedRequest = request.split('.');
          return {
            kind: splitTrimmedRequest[0],
            name: splitTrimmedRequest[1],
          };
        }
        return {
          kind: trimmedPart,
        };
      });
    });
  },

  getSSNodeText(ssNode: SubsecondNode | null) {
    if (
      ssNode == null ||
      ssNode.esNode.range[0] === -1 ||
      ssNode.esNode.range[1] === -1
    ) {
      return '';
    }

    return Subsecond.sourceTexts[ssNode.fileName].slice(
      ssNode.esNode.range[0],
      ssNode.esNode.range[1]
    );
  },

  getLinesOfSSNode(ssNode: SubsecondNode) {
    let linesBefore = 0;
    for (const char of Subsecond.sourceTexts[ssNode.fileName].slice(
      0,
      ssNode.esNode.range[0]
    )) {
      if (char === '\n') linesBefore++;
    }

    let linesInside = 0;
    for (const char of Subsecond.sourceTexts[ssNode.fileName].slice(
      ssNode.esNode.range[0],
      ssNode.esNode.range[1]
    )) {
      if (char === '\n') linesInside++;
    }

    return [linesBefore, linesBefore + linesInside];
  },

  insertNodeAt(
    ssNode: SubsecondNode,
    text: string,
    position: 'before' | 'after'
  ) {
    // no replacement can occur on deallocated nodes
    if (ssNode.esNode.range[0] === -1 || ssNode.esNode.range[1] === -1) return;

    const insertPoint = ssNode.esNode.range[position === 'before' ? 0 : 1];

    Subsecond.sourceTexts[ssNode.fileName] =
      Subsecond.sourceTexts[ssNode.fileName].slice(0, insertPoint) +
      text +
      Subsecond.sourceTexts[ssNode.fileName].slice(insertPoint);

    // update all source positions
    simpleTraverse(Subsecond.sourceFiles[ssNode.fileName], {
      enter: (node) => {
        // before the change, no movement
        if (node.range[1] < insertPoint) return;
        // fully after the change, move both
        if (node.range[0] > insertPoint) {
          node.range[0] += text.length;
          node.range[1] += text.length;
          return;
        }
        // wraps the change, move the end
        node.range[1] += text.length;
      },
    });

    let newNodes: es.TSESTree.Node[];
    // needs a ({}) wrapper to differentiate between block mode
    if (ssNode.esNode.parent?.type === 'ObjectExpression') {
      const newNode = parse(`({${text}})`, { range: true });
      simpleTraverse(newNode, {
        enter: (node) => {
          node.range[0] += insertPoint - 2;
          node.range[1] += insertPoint - 2;
        },
      });

      // TODO Consider the multi element case...
      newNodes = (newNode.body[0] as any).expression.properties;
    } else {
      // default case for all others
      const newNode = parse(text, { range: true });
      simpleTraverse(newNode, {
        enter: (node) => {
          node.range[0] += insertPoint;
          node.range[1] += insertPoint;
        },
      });

      newNodes = newNode.body;
    }

    // search for the position within the parent and replace in place
    const parentType = ssNode.esNode.parent?.type;
    if (parentType == null) throw new Error("Node's parent not found.");
    for (const key of visitorKeys[parentType] ?? []) {
      const children = (ssNode.esNode.parent as any)[key];
      if (Array.isArray(children)) {
        for (const childIndex in children) {
          if (Object.is(children[childIndex], ssNode.esNode)) {
            ((ssNode.esNode.parent as any)[key] as es.TSESTree.Node[]).splice(
              parseInt(childIndex) + (position === 'before' ? 0 : 1),
              0,
              ...newNodes
            );
            return;
          }
        }
      }
    }

    throw new Error('Was not able to find node within parent');
  },

  replaceNodeWithText(ssNode: SubsecondNode, text: string) {
    // no replacement can occur on deallocated nodes
    if (ssNode.esNode.range[0] === -1 || ssNode.esNode.range[1] === -1) return;

    const start = ssNode.esNode.range[0];
    const end = ssNode.esNode.range[1];
    const delta = text.length - (end - start);

    Subsecond.sourceTexts[ssNode.fileName] =
      Subsecond.sourceTexts[ssNode.fileName].slice(0, start) +
      text +
      Subsecond.sourceTexts[ssNode.fileName].slice(end);

    // update all source positions
    simpleTraverse(Subsecond.sourceFiles[ssNode.fileName], {
      enter: (node) => {
        // before the change, no movement
        if (node.range[1] < start) return;
        // fully after the change, move both
        if (node.range[0] > end) {
          node.range[0] += delta;
          node.range[1] += delta;
          return;
        }
        // wraps the change, move the end
        node.range[1] += delta;
      },
    });

    // deallocate ranges for replaced node
    simpleTraverse(ssNode.esNode, {
      enter: (node) => {
        node.range = [-1, -1];
      },
    });

    let replacementNode: es.TSESTree.Node[];
    // needs a ({}) wrapper to differentiate between block mode
    if (ssNode.esNode.parent?.type === 'ObjectExpression') {
      const newNode = parse(`({${text}})`, { range: true });
      simpleTraverse(newNode, {
        enter: (node) => {
          node.range[0] += start - 2;
          node.range[1] += start - 2;
        },
      });

      // TODO Consider the multi element case...
      replacementNode = (newNode.body[0] as any).expression.properties;
    } else {
      // default case for all others
      const newNode = parse(text, { range: true });
      simpleTraverse(newNode, {
        enter: (node) => {
          node.range[0] += start;
          node.range[1] += start;
        },
      });

      replacementNode = newNode.body;
    }

    // search for the position within the parent and replace in place
    const parentType = ssNode.esNode.parent?.type;
    if (parentType == null) throw new Error("Node's parent not found.");
    for (const key of visitorKeys[parentType] ?? []) {
      const children = (ssNode.esNode.parent as any)[key];
      if (Array.isArray(children)) {
        for (const childIndex in children) {
          if (Object.is(children[childIndex], ssNode.esNode)) {
            if (replacementNode.length === 1) {
              (ssNode.esNode.parent as any)[key][childIndex] =
                replacementNode[0];
              return;
            }

            ((ssNode.esNode.parent as any)[key] as es.TSESTree.Node[]).splice(
              parseInt(childIndex),
              1,
              ...replacementNode
            );

            return;
          }
        }
      } else {
        if (Object.is(children, ssNode.esNode)) {
          (ssNode.esNode.parent as any)[key] =
            replacementNode.length === 1 ? replacementNode[0] : replacementNode;
          return;
        }
      }
    }

    throw new Error('Was not able to find node within parent');
  },

  getSSNodeName(ssNode: SubsecondNode): SubsecondNode | null {
    // running list of options for name-like properties
    const esNodeName =
      (ssNode.esNode as any).id ??
      (ssNode.esNode as any).key ??
      (ssNode.esNode as any).callee;

    if (esNodeName == null) return null;

    return {
      fileName: ssNode.fileName,
      esNode: esNodeName,
    };
  },
};
Subsecond.sourceTexts = {} as Record<string, string>;
Subsecond.sourceFiles = {} as Record<string, es.AST<{ range: true }>>;

Subsecond.load = function (
  this: typeof Subsecond,
  files: Record<string, string>
) {
  // TODO detect scriptkind and decide target somehow.
  this.sourceTexts = files;
  for (const fileName in files) {
    this.sourceFiles[fileName] = parse(files[fileName], {
      range: true,
    });
  }

  return this;
};

Subsecond.print = function () {
  return Subsecond.sourceTexts;
};

interface init {
  (this: SubsecondThis, selector?: Selector, context?: Subsecond): void;
}

var init;
init = Subsecond.fn.init = function (
  this: SubsecondThis,
  selector?: Selector,
  context?: Subsecond
): [key: SubsecondNode] {
  if (selector === undefined) {
    let i = 0;
    for (const fileName in Subsecond.sourceFiles) {
      this[i++] = { fileName, esNode: Subsecond.sourceFiles[fileName] };
    }
    (this.length as number) = i;
  }

  // duck type check of ssNode instanation method
  if (
    typeof selector === 'object' &&
    selector.hasOwnProperty('fileName') &&
    selector.hasOwnProperty('esNode')
  ) {
    this[0] = selector as SubsecondNode;
    this.length = 1;

    return this;
  }

  // an array of subsecond node objects.
  if (Array.isArray(selector)) {
    for (let i = 0; i < selector.length; i++) {
      this[i] = selector[i];
    }
    (this.length as number) = selector.length;

    return this;
  }

  if (typeof selector === 'string') {
    const requests = SubsecondInternals.translateSelector(selector);
    let nodes: SubsecondNode[] = [];

    const baseNodes =
      (context as SubsecondThis) ??
      Object.entries(Subsecond.sourceFiles).map(([fileName, esNode]) => ({
        fileName,
        esNode,
      }));

    for (const node of baseNodes) {
      nodes.push(
        ...SubsecondInternals.walk(requests, node.esNode, node.fileName)
      );
    }

    for (let i = 0; i < nodes.length; i++) {
      this[i] = nodes[i];
    }
    (this.length as number) = nodes.length;

    return this;
  }
};

init.prototype = Subsecond.fn;

module.exports = Subsecond;
module.exports.default = Subsecond;

Object.defineProperty(module.exports, '__esModule', { value: true });
