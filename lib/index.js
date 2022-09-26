"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subsecond = void 0;
const typescript_estree_1 = require("@typescript-eslint/typescript-estree");
function Subsecond(selector, context) {
    return new Subsecond.fn.init(selector, context);
}
exports.Subsecond = Subsecond;
Subsecond.fn = Subsecond.prototype = {
    constructor: Subsecond,
    find(selector) {
        // TODO I think context needs to get passed here...
        return Subsecond(selector, this);
    },
    type() {
        return this[0].esNode.type;
    },
    text(newText) {
        if (newText === undefined) {
            let allText = '';
            for (const ssNode of this) {
                allText += SubsecondInternals.getSSNodeText(ssNode);
            }
            return allText;
        }
        if (typeof newText === 'function') {
            for (const ssNode of this) {
                SubsecondInternals.replaceNodeWithText(ssNode, newText(SubsecondInternals.getSSNodeText(ssNode)));
            }
            return this;
        }
        // anything else is a direct setter
        for (const ssNode of this) {
            SubsecondInternals.replaceNodeWithText(ssNode, newText);
        }
        return this;
    },
    name(newName) {
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
                    SubsecondInternals.replaceNodeWithText(nameIdentifier, newName(SubsecondInternals.getSSNodeText(nameIdentifier)));
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
    attr(name) {
        return this[0].esNode[name];
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
        var _a, _b;
        const parentResults = [];
        if (selector === undefined) {
            for (const ssNode of this) {
                const parent = (_a = ssNode.esNode.parent) !== null && _a !== void 0 ? _a : ssNode.esNode;
                parentResults.push({
                    esNode: parent,
                    fileName: ssNode.fileName,
                });
            }
            return Subsecond(parentResults);
        }
        // go back a specific number of generations
        if (typeof selector === 'number') {
            const parentResults = [];
            for (const ssNode of this) {
                let ancestor = ssNode.esNode;
                for (let i = 0; i < selector; i++) {
                    ancestor = (_b = ancestor.parent) !== null && _b !== void 0 ? _b : ancestor;
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
        var _a;
        let ssNodeChildren = [];
        for (const ssNode of this) {
            for (const key of (_a = typescript_estree_1.visitorKeys[ssNode.esNode.type]) !== null && _a !== void 0 ? _a : []) {
                const children = ssNode.esNode[key];
                if (Array.isArray(children)) {
                    ssNodeChildren.push(...children.map((child) => ({
                        esNode: child,
                        fileName: ssNode.fileName,
                    })));
                }
                else if (children != null) {
                    ssNodeChildren.push({
                        esNode: children,
                        fileName: ssNode.fileName,
                    });
                }
            }
        }
        if (selector !== undefined) {
            const requests = SubsecondInternals.translateSelector(selector);
            ssNodeChildren = ssNodeChildren.filter((child) => SubsecondInternals.applyRequests(requests, child.esNode, child.fileName));
        }
        return Subsecond(ssNodeChildren);
    },
    fileName() {
        return this[0].fileName;
    },
    esNodes() {
        const esNodeList = [];
        for (const ssNode of this) {
            esNodeList.push(ssNode.esNode);
        }
        return esNodeList;
    },
    toNewFile(fileName) {
        const text = this.text();
        const newSourceFile = (0, typescript_estree_1.parse)(text, { range: true });
        Subsecond.sourceFiles[fileName] = newSourceFile;
        Subsecond.sourceTexts[fileName] = text;
        this.text('');
        return Subsecond({ fileName, esNode: Subsecond.sourceFiles[fileName] });
    },
    lines() {
        const lines = [];
        for (const ssNode of this) {
            const nodeLines = SubsecondInternals.getLinesOfSSNode(ssNode);
            for (let i = nodeLines[0]; i <= nodeLines[1]; i++) {
                lines.push(i);
            }
        }
        return new Set(lines).size;
    },
    eq(index) {
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
        const results = [];
        let i = 0;
        for (const ssNode of this) {
            results.push(callback(Subsecond(ssNode), i++, this));
        }
        return results;
    },
    filter(callback) {
        const filtered = [];
        let i = 0;
        for (const ssNode of this) {
            if (callback(Subsecond(ssNode), i++, this)) {
                filtered.push(ssNode);
            }
        }
        return Subsecond(filtered);
    },
};
const SubsecondInternals = {
    isNotNullish(value) {
        return value !== null && value !== undefined;
    },
    applyRequests(requests, esNode, fileName) {
        return requests.some((request) => {
            const lastRequestPart = request[request.length - 1];
            if (lastRequestPart.kind === esNode.type &&
                (lastRequestPart.name == null ||
                    lastRequestPart.name ===
                        SubsecondInternals.getSSNodeText(SubsecondInternals.getSSNodeName({ fileName, esNode })))) {
                // the top level request is matched, now we need to parse through parents to match everything else.
                let esNodeParent = esNode.parent;
                let currentRequestPartIndex = request.length - 2;
                while (esNodeParent != null) {
                    if (currentRequestPartIndex === -1)
                        return true;
                    if (request[currentRequestPartIndex].kind === esNodeParent.type &&
                        (request[currentRequestPartIndex].name == null ||
                            request[currentRequestPartIndex].name ===
                                SubsecondInternals.getSSNodeText(SubsecondInternals.getSSNodeName({
                                    fileName,
                                    esNode: esNodeParent,
                                })))) {
                        currentRequestPartIndex--;
                    }
                    esNodeParent = esNodeParent.parent;
                }
            }
        });
    },
    walk(requests, esNode, fileName) {
        const results = [];
        (0, typescript_estree_1.simpleTraverse)(esNode, {
            enter: (subNode) => {
                if (SubsecondInternals.applyRequests(requests, subNode, fileName)) {
                    results.push({ esNode: subNode, fileName });
                }
            },
        }, true);
        return results;
    },
    translateSelector(selector) {
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
    getSSNodeText(ssNode) {
        if (ssNode == null ||
            ssNode.esNode.range[0] === -1 ||
            ssNode.esNode.range[1] === -1) {
            return '';
        }
        return Subsecond.sourceTexts[ssNode.fileName].slice(ssNode.esNode.range[0], ssNode.esNode.range[1]);
    },
    getLinesOfSSNode(ssNode) {
        let linesBefore = 0;
        for (const char of Subsecond.sourceTexts[ssNode.fileName].slice(0, ssNode.esNode.range[0])) {
            if (char === '\n')
                linesBefore++;
        }
        let linesInside = 0;
        for (const char of Subsecond.sourceTexts[ssNode.fileName].slice(ssNode.esNode.range[0], ssNode.esNode.range[1])) {
            if (char === '\n')
                linesInside++;
        }
        return [linesBefore, linesBefore + linesInside];
    },
    insertNodeAt(ssNode, text, position) {
        var _a, _b, _c;
        // no replacement can occur on deallocated nodes
        if (ssNode.esNode.range[0] === -1 || ssNode.esNode.range[1] === -1)
            return;
        const insertPoint = ssNode.esNode.range[position === 'before' ? 0 : 1];
        Subsecond.sourceTexts[ssNode.fileName] =
            Subsecond.sourceTexts[ssNode.fileName].slice(0, insertPoint) +
                text +
                Subsecond.sourceTexts[ssNode.fileName].slice(insertPoint);
        // update all source positions
        (0, typescript_estree_1.simpleTraverse)(Subsecond.sourceFiles[ssNode.fileName], {
            enter: (node) => {
                // before the change, no movement
                if (node.range[1] < insertPoint)
                    return;
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
        let newNodes;
        // needs a ({}) wrapper to differentiate between block mode
        if (((_a = ssNode.esNode.parent) === null || _a === void 0 ? void 0 : _a.type) === 'ObjectExpression') {
            const newNode = (0, typescript_estree_1.parse)(`({${text}})`, { range: true });
            (0, typescript_estree_1.simpleTraverse)(newNode, {
                enter: (node) => {
                    node.range[0] += insertPoint - 2;
                    node.range[1] += insertPoint - 2;
                },
            });
            // TODO Consider the multi element case...
            newNodes = newNode.body[0].expression.properties;
        }
        else {
            // default case for all others
            const newNode = (0, typescript_estree_1.parse)(text, { range: true });
            (0, typescript_estree_1.simpleTraverse)(newNode, {
                enter: (node) => {
                    node.range[0] += insertPoint;
                    node.range[1] += insertPoint;
                },
            });
            newNodes = newNode.body;
        }
        // search for the position within the parent and replace in place
        const parentType = (_b = ssNode.esNode.parent) === null || _b === void 0 ? void 0 : _b.type;
        if (parentType == null)
            throw new Error("Node's parent not found.");
        for (const key of (_c = typescript_estree_1.visitorKeys[parentType]) !== null && _c !== void 0 ? _c : []) {
            const children = ssNode.esNode.parent[key];
            if (Array.isArray(children)) {
                for (const childIndex in children) {
                    if (Object.is(children[childIndex], ssNode.esNode)) {
                        ssNode.esNode.parent[key].splice(parseInt(childIndex) + (position === 'before' ? 0 : 1), 0, ...newNodes);
                        return;
                    }
                }
            }
        }
        throw new Error('Was not able to find node within parent');
    },
    replaceNodeWithText(ssNode, text) {
        var _a, _b, _c;
        // no replacement can occur on deallocated nodes
        if (ssNode.esNode.range[0] === -1 || ssNode.esNode.range[1] === -1)
            return;
        const start = ssNode.esNode.range[0];
        const end = ssNode.esNode.range[1];
        const delta = text.length - (end - start);
        Subsecond.sourceTexts[ssNode.fileName] =
            Subsecond.sourceTexts[ssNode.fileName].slice(0, start) +
                text +
                Subsecond.sourceTexts[ssNode.fileName].slice(end);
        // update all source positions
        (0, typescript_estree_1.simpleTraverse)(Subsecond.sourceFiles[ssNode.fileName], {
            enter: (node) => {
                // before the change, no movement
                if (node.range[1] < start)
                    return;
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
        (0, typescript_estree_1.simpleTraverse)(ssNode.esNode, {
            enter: (node) => {
                node.range = [-1, -1];
            },
        });
        let replacementNode;
        // needs a ({}) wrapper to differentiate between block mode
        if (((_a = ssNode.esNode.parent) === null || _a === void 0 ? void 0 : _a.type) === 'ObjectExpression') {
            const newNode = (0, typescript_estree_1.parse)(`({${text}})`, { range: true });
            (0, typescript_estree_1.simpleTraverse)(newNode, {
                enter: (node) => {
                    node.range[0] += start - 2;
                    node.range[1] += start - 2;
                },
            });
            // TODO Consider the multi element case...
            replacementNode = newNode.body[0].expression.properties;
        }
        else {
            // default case for all others
            const newNode = (0, typescript_estree_1.parse)(text, { range: true });
            (0, typescript_estree_1.simpleTraverse)(newNode, {
                enter: (node) => {
                    node.range[0] += start;
                    node.range[1] += start;
                },
            });
            replacementNode = newNode.body;
        }
        // search for the position within the parent and replace in place
        const parentType = (_b = ssNode.esNode.parent) === null || _b === void 0 ? void 0 : _b.type;
        if (parentType == null)
            throw new Error("Node's parent not found.");
        for (const key of (_c = typescript_estree_1.visitorKeys[parentType]) !== null && _c !== void 0 ? _c : []) {
            const children = ssNode.esNode.parent[key];
            if (Array.isArray(children)) {
                for (const childIndex in children) {
                    if (Object.is(children[childIndex], ssNode.esNode)) {
                        if (replacementNode.length === 1) {
                            ssNode.esNode.parent[key][childIndex] =
                                replacementNode[0];
                            return;
                        }
                        ssNode.esNode.parent[key].splice(parseInt(childIndex), 1, ...replacementNode);
                        return;
                    }
                }
            }
            else {
                if (Object.is(children, ssNode.esNode)) {
                    ssNode.esNode.parent[key] =
                        replacementNode.length === 1 ? replacementNode[0] : replacementNode;
                    return;
                }
            }
        }
        throw new Error('Was not able to find node within parent');
    },
    getSSNodeName(ssNode) {
        var _a, _b;
        // running list of options for name-like properties
        const esNodeName = (_b = (_a = ssNode.esNode.id) !== null && _a !== void 0 ? _a : ssNode.esNode.key) !== null && _b !== void 0 ? _b : ssNode.esNode.callee;
        if (esNodeName == null)
            return null;
        return {
            fileName: ssNode.fileName,
            esNode: esNodeName,
        };
    },
};
Subsecond.sourceTexts = {};
Subsecond.sourceFiles = {};
Subsecond.load = function (files) {
    // TODO detect scriptkind and decide target somehow.
    this.sourceTexts = files;
    for (const fileName in files) {
        this.sourceFiles[fileName] = (0, typescript_estree_1.parse)(files[fileName], {
            range: true,
        });
    }
    return this;
};
Subsecond.print = function () {
    return Subsecond.sourceTexts;
};
var init;
init = Subsecond.fn.init = function (selector, context) {
    var _a;
    if (selector === undefined) {
        let i = 0;
        for (const fileName in Subsecond.sourceFiles) {
            this[i++] = { fileName, esNode: Subsecond.sourceFiles[fileName] };
        }
        this.length = i;
    }
    // duck type check of ssNode instanation method
    if (typeof selector === 'object' &&
        selector.hasOwnProperty('fileName') &&
        selector.hasOwnProperty('esNode')) {
        this[0] = selector;
        this.length = 1;
        return this;
    }
    // an array of subsecond node objects.
    if (Array.isArray(selector)) {
        for (let i = 0; i < selector.length; i++) {
            this[i] = selector[i];
        }
        this.length = selector.length;
        return this;
    }
    if (typeof selector === 'string') {
        const requests = SubsecondInternals.translateSelector(selector);
        let nodes = [];
        const baseNodes = (_a = context) !== null && _a !== void 0 ? _a : Object.entries(Subsecond.sourceFiles).map(([fileName, esNode]) => ({
            fileName,
            esNode,
        }));
        for (const node of baseNodes) {
            nodes.push(...SubsecondInternals.walk(requests, node.esNode, node.fileName));
        }
        for (let i = 0; i < nodes.length; i++) {
            this[i] = nodes[i];
        }
        this.length = nodes.length;
        return this;
    }
};
init.prototype = Subsecond.fn;
const S = Subsecond;
exports.default = S;
