import { p3 } from "../parser/exp.ts";
import { p } from "../parser/dsl.ts";
import { lexer, type TokenStream } from "./lexer.ts";

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

// STATMENTS //

function parse_stmt(tks: TokenStream): StatmentNode | undefined {
    return p<StatmentNode>`
        while_node      = "while" cond:${parse_expr} "{" body:${parse_stmt}* "}"
        return_node     = "return" value:parse_expr

        if_node = "if" cond:${parse_expr} "{" a:parse_stmt* "}" "else" "{" b:parse_stmt* "}"
        if_node = "if" cond:parse_expr "{" a:parse_stmt* "}" "else" b:${(tks) => [parse_stmt(tks)!]}
        if_node = "if" cond:parse_expr "{" a:parse_stmt* "}"

        assignment_node = name:parse_expr "=" value:parse_expr
        discard_node    = name:parse_expr
    `(tks, (n) => ({ b: [], ...n }))
}

// INDEX_NODEESSIONS //

export function parse_expr(tks: TokenStream): ExprNode | undefined  {
    return parse_ternary(tks)
}

function parse_ops(tks: TokenStream) {
    return parse_op_util(parse_value, [
        ["==", ">", "<", ">=", "<="],
        ["+", "-"],
        ["*", "/"],
        ["**"]
    ])(tks)
}

const parse_ternary = p3<ExprNode>("ternary_node")`
    ternary_node = a:${parse_ops} "if" cond:${parse_expr} "else" b:${parse_expr}
    ternary_node = :${parse_ops}
`

const parse_arg = p3<ArgNode>("arg_node")`
    arg_node = name:ident ":" value:${parse_expr}
`

export function parse_value(tks: TokenStream): ExprNode | undefined {
    return p<ExprNode>`
        index_node  = value:${parse_value} "[" index:parse_expr "]"
        field_node  = value:${parse_value} "." field:ident
        call_node   = func:${parse_value} "(" args:parse_expr, ")"

        object_node = "{" items:${parse_arg}, "}"
        array_node  = "[" items:parse_expr, "]"

        ident_node  = value:ident
        number_node = value:number

        todo_fix_me = "(" :${parse_expr} ")"
    `(tks, parse_value)
}

// TOP LEVEL //

const parse_file = p3<FileNode>("file_node")`
    file_node = items:top_level_decl_node*

    top_level_decl_node = :func_node
    top_level_decl_node = :struct_node

    struct_node =
        "struct" name:ident "{"
            fields:param_node*
        "}"

    func_node =
        "fn" name:ident "(" params:param_node, ")" return_type:type_node "{"
            body:${parse_stmt}*
        "}"

    param_node = name:ident type:type_node

    type_node = name:ident "<" args:type_node, ">"
    type_node = name:ident
`

export function parse(src: string) {
    return parse_file(lexer(src))!
}

function parse_op_util(sub: (tks: TokenStream) => ExprNode | undefined, ops: Op[][]): (tks: TokenStream) => ExprNode | undefined {
    const s = ops.length > 1 ? parse_op_util(sub, ops.slice(1)) : sub

    return function self(tks: TokenStream): ExprNode | undefined {
        const a = s(tks)
        if (!a) return undefined
        const save = tks.save()

        for (const op of ops[0]) {
            if (tks.take(op)) {
                const b = self(tks)!
                return { kind: "OP_NODE", op, a, b }
            }
        }

        tks.load(save)
        return a
    }
}
