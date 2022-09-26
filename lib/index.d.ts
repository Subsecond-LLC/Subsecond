import es from '@typescript-eslint/typescript-estree';
declare type SubsecondThis = Subsecond & [key: SubsecondNode];
declare type Selector = string | Record<string, string> | SubsecondNode[] | SubsecondNode;
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
    each(callback: (element: Subsecond, i: number, original: Subsecond) => void): Subsecond;
    map<T>(callback: (element: Subsecond, i: number, original: Subsecond) => T): T[];
    filter(callback: (element: Subsecond, i: number, original: Subsecond) => boolean): Subsecond;
    find(selector: Selector): Subsecond;
    parent(selector?: string | number): Subsecond;
    children(selector?: string): Subsecond;
    fileName(): string;
    esNodes(): es.TSESTree.Node[];
    toNewFile(fileName: string): Subsecond;
}
declare function Subsecond(selector?: Selector, context?: Subsecond): Subsecond;
declare namespace Subsecond {
    var fn: Subsecond;
    var prototype: Subsecond;
    var sourceTexts: Record<string, string>;
    var sourceFiles: Record<string, es.AST<{
        range: true;
    }>>;
    var load: (this: typeof Subsecond, files: Record<string, string>) => typeof Subsecond;
    var print: () => Record<string, string>;
}
declare type SubsecondNode = {
    esNode: es.TSESTree.Node;
    fileName: string;
};
interface init {
    (this: SubsecondThis, selector?: Selector, context?: Subsecond): void;
}
declare var init: any;
declare const S: typeof Subsecond;
export { Subsecond };
export default S;
