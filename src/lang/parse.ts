import { p } from "../parser/dsl.ts";
import type { TokenStream } from "./lexer.ts";

export type FileNode = {
    kind: "FILE_NODE",
    items: (FuncNode | StructNode)[]
}

export interface ParamNode {
    kind: "PARAM_NODE",
    name: string,
    type: TypeNode,
}

export interface ArgNode {
    kind: "ARG_NODE",
    name?: string,
    value: ExprNode,
}

export interface FuncNode {
    kind: "FUNC_NODE"
    name: string
    return_type?: TypeNode
    body: StatmentNode[]
    params: ParamNode[]
}

export interface StructNode {
    kind: "STRUCT_NODE"
    name: string
    fields: ParamNode[]
}

export type StatmentNode = ReturnNode | AssignmentNode | DiscardNode | IfNode | WhileNode

export interface IfNode {
    kind: "IF_NODE"
    cond: ExprNode,
    a: StatmentNode[]
    b: StatmentNode[]
}

export interface WhileNode {
    kind: "WHILE_NODE"
    cond: ExprNode,
    body: StatmentNode[]
}

export interface AssignmentNode {
    kind: "ASSIGNMENT_NODE"
    name: ExprNode,
    value: ExprNode
}

export interface DiscardNode {
    kind: "DISCARD_NODE"
    value: ExprNode
}

export interface ReturnNode {
    kind: "RETURN_NODE"
    value: ExprNode
}

export type ExprNode = ArrayNode | ObjectNode | IndexNode | NumberNode | StringNode | IdentNode | OpNode | TernaryNode | CallNode | FieldNode

export interface CallNode {
    kind: "CALL_NODE",
    func: ExprNode,
    args: ExprNode[],
}

export interface IndexNode {
    kind: "INDEX_NODE"
    value: ExprNode
    index: ExprNode
}

export interface FieldNode {
    kind: "FIELD_NODE"
    value: ExprNode
    field: string
}

export type Op = "+" | "-" | "/" | "*" | "==" | ">" | "<" | ">=" | "<=" | "**"

export interface OpNode {
    kind: "OP_NODE"
    op: Op
    a: ExprNode
    b: ExprNode
}

export interface ArrayNode {
    kind: "ARRAY_NODE"
    items: ExprNode[]
}

export interface ObjectNode {
    kind: "OBJECT_NODE"
    items: ArgNode[]
}

export interface StringNode {
    kind: "STRING_NODE"
    value: string
}

export interface NumberNode {
    kind: "NUMBER_NODE"
    value: number
}

export interface IdentNode {
    kind: "IDENT_NODE"
    value: string
}

export interface TernaryNode {
    kind: "TERNARY_NODE",
    cond: ExprNode,
    a: ExprNode,
    b: ExprNode,
}

export interface TypeNode {
    kind: "TYPE_NODE",
    name: string,
    args: TypeNode[]
}

// TOP LEVEL //

const parse_file = p<FileNode>`
    file_node = items:${(t) => parse_func(t) ?? parse_struct(t)}*
`

const parse_param_node = p<ParamNode>`
    param_node = name:ident type:${parse_type}
`

const parse_struct = p<StructNode>`
    struct_node = "struct" name:ident "{"
        fields:${parse_param_node}*
    "}"
`

function parse_type(tks: TokenStream): TypeNode | undefined {
    return p<TypeNode>`
        type_node = name:ident "<" args:${parse_type}, ">"
        type_node = name:ident
    `(tks, (node) => ({ args: [], ...node }))
}

const parse_func = p<FuncNode>`
    func_node = "fn" name:ident "(" params:${parse_param_node}, ")" return_type:${parse_type} "{"
        body:${parse_stmt}*
    "}"
`

// STATMENTS //

function parse_stmt(tks: TokenStream): StatmentNode | undefined {
    return (
        parse_if(tks) ??
        p<StatmentNode>`
            while_node      = "while" cond:${parse_expr} "{" body:parse_stmt* "}"
            return_node     = "return" value:parse_expr
            assignment_node = name:parse_expr "=" value:parse_expr
            discard_node    = name:parse_expr
        `(tks)
    )
}

function parse_if(tks: TokenStream): StatmentNode | undefined {
    return p<IfNode>`
        if_node = "if" cond:${parse_expr} "{"
            a:parse_stmt*
        "}" "else" "{"
            b:parse_stmt*
        "}"

        if_node = "if" cond:parse_expr "{"
            a:parse_stmt*
        "}" "else" b:${(tks) => [parse_if(tks)!]}
    
        if_node = "if" cond:parse_expr "{"
            a:parse_stmt*
        "}"
    `(tks, (n) => ({ b: [], ...n }))
}

// INDEX_NODEESSIONS //

export function parse_expr(tks: TokenStream): ExprNode | undefined  {
    return parse_ternary(tks)
}

function parse_ternary(tks: TokenStream): ExprNode | undefined  {
    return p<ExprNode>`
        ternary_node = a:${parse_eq} "if" cond:parse_expr "else" b:parse_expr
    `(tks) ?? parse_eq(tks)
}

function parse_eq(tks: TokenStream): ExprNode | undefined  {
    return parse_op(tks, parse_add, parse_eq, ["==", ">", "<", ">=", "<="])
}

function parse_add(tks: TokenStream): ExprNode | undefined  {
    return parse_op(tks, parse_mul, parse_add, ["+", "-"])
}

function parse_mul(tks: TokenStream): ExprNode | undefined  {
    return parse_op(tks, parse_ex, parse_mul, ["*", "/"])
}

function parse_ex(tks: TokenStream): ExprNode | undefined  {
    return parse_op(tks, parse_value, parse_ex, ["**"])
}

function parse_arg(tks: TokenStream): ArgNode | undefined {
    return p<ArgNode>`
        arg_node = name:ident ":" value:parse_expr
    `(tks)
}

export function parse_value(tks: TokenStream): ExprNode | undefined {
    return p<ExprNode>`
        index_node  = value:${parse_value} "[" index:parse_expr "]"
        field_node  = value:${parse_value} "." field:ident
        call_node   = func:${parse_value} "(" args:parse_expr, ")"

        object_node = "{" items:${parse_arg}, "}"
        array_node  = "[" items:parse_expr, "]"

        ident_node  = value:ident
        number_node = value:number
    `(tks, parse_value) ??
    p<ExprNode>`
        todo_fix_me = "(" expr:${parse_expr} ")"
    `(tks, (n) => n.expr)
}

// UTIL //

function parse_op(tks: TokenStream, sub: (tks: TokenStream) => ExprNode | undefined, eqv: (tks: TokenStream) => ExprNode | undefined, ops: Op[]): ExprNode | undefined {
    const a = sub(tks)
    if (!a) return undefined
    const save = tks.save()

    for (const op of ops) {
        if (tks.take(op)) {
            return {
                kind: "OP_NODE",
                op,
                a,
                b: eqv(tks)!
            }
        }
    }

    tks.load(save)
    return a
}

export function parse(tks: TokenStream) {
    return parse_file(tks)!
}
