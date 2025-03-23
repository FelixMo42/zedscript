import type { TokenStream } from "./lexer.ts";

export type FileNode = (FuncNode | StructNode)[]

export interface ParamNode {
    kind: "PARAM_NODE",
    name: string,
    type: ExprNode,
}

export interface ArgNode {
    kind: "ARG_NODE",
    name?: string,
    value: ExprNode,
}

export interface FuncNode {
    kind: "FUNC_NODE"
    name: string
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
    name: string,
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

export type ExprNode = ArrayNode | IndexNode | NumberNode | StringNode | IdentNode | OpNode | TernaryNode | CallNode

export interface CallNode {
    kind: "CALL_NODE",
    func: ExprNode,
    args: ExprNode[],
}

export interface IndexNode {
    kind: "INDEX_NODE"
    value: ExprNode
    index: string | number | ExprNode
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

// TOP LEVEL //

export function parse_file(tks: TokenStream): FileNode {
    const funcs = []

    while (true) {
        const node = parse_func(tks) ?? parse_struct(tks)
        if (!node) break
        funcs.push(node)
    }

    return funcs
}

export function parse_struct(tks: TokenStream): StructNode | undefined {
    const save = tks.save()

    if (tks.take("struct")) { 
        const name = tks.take("<ident>")!
        tks.take("{")
        const fields: ParamNode[] = []
        while (tks.peak("<ident>")) {
            fields.push({
                kind: "PARAM_NODE",
                name: tks.take("<ident>")!,
                type: parse_expr(tks)!,
            })
        }
        tks.take("}")

        return {
            kind: "STRUCT_NODE",
            name,
            fields
        }
    }

    tks.load(save)
    return undefined
}

export function parse_func(tks: TokenStream): FuncNode | undefined {
    const save = tks.save()

    if (tks.take("fn")) {
        const name = tks.next()

        // params
        tks.take("(")
        const params: ParamNode[] = []
        while (!tks.peak(")")) {
            params.push({
                kind: "PARAM_NODE",
                name: tks.take("<ident>")!,
                type: parse_expr(tks)!,
            })
            tks.take(",")
        }
        tks.take(")")

        // body
        tks.take("{")
        const body = parse_stmts(tks)
        tks.take("}")

        // returns
        return { kind: "FUNC_NODE", name, body, params }
    }
    
    tks.load(save)
    return undefined
}

// STATMENTS //

function parse_stmts(tks: TokenStream): StatmentNode[] {
    const stmts = []
    while (true) {
        const stmt = parse_stmt(tks)!
        if (!stmt) break
        stmts.push(stmt)
    }
    return stmts
}

function parse_stmt(tks: TokenStream): StatmentNode | undefined {
    const save = tks.save()

    const if_node = parse_if(tks)
    if (if_node) return if_node

    const while_node = parse_while(tks)
    if (while_node) return while_node

    const name = tks.take("<ident>")
    if (name && tks.take("=")) {
        return {
            kind: "ASSIGNMENT_NODE",
            name,
            value: parse_expr(tks)!
        }
    }
    tks.load(save)

    if (tks.take("return")) {
        return {
            kind: "RETURN_NODE",
            value: parse_expr(tks)!
        }
    }

    const expr = parse_expr(tks)
    if (expr) return {
        kind: "DISCARD_NODE",
        value: expr
    }

    tks.load(save)
    return undefined
}

function parse_if(tks: TokenStream): StatmentNode | undefined {
    if (tks.take("if")) {
        const cond = parse_expr(tks)!
        tks.take("{")
        const a = parse_stmts(tks)
        tks.take("}")
        let b: StatmentNode[] = []

        if (tks.take("else")) {
            if (tks.peak("if")) {
                b = [parse_if(tks)!]
            } else {
                tks.take("{")
                b = parse_stmts(tks)
                tks.take("}") 
            }            
        }

        return {
            kind: "IF_NODE",
            cond,
            a,
            b
        }
    }
}

function parse_while(tks: TokenStream): StatmentNode | undefined {
    if (tks.take("while")) {
        const cond = parse_expr(tks)!
        tks.take("{")
        const body = parse_stmts(tks)
        tks.take("}")

        return {
            kind: "WHILE_NODE",
            cond,
            body,
        }
    }
}

// EXPRESSIONS //

function parse_expr(tks: TokenStream): ExprNode | undefined  {
    return parse_ternary(tks)
}

function parse_ternary(tks: TokenStream): ExprNode | undefined  {
    const a = parse_eq(tks)!

    if (tks.take("if")) {
        const cond = parse_expr(tks)!
        tks.take("else")
        const b = parse_expr(tks)!
        return {
            kind: "TERNARY_NODE",
            cond,
            a,
            b
        }
    }

    return a
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
    return parse_op(tks, parse_call, parse_ex, ["**"])
}

function parse_call(tks: TokenStream): ExprNode | undefined {
    const value = parse_index(tks)!

    if (tks.take("(")) {
        const args = []
        while (!tks.peak(")")) {
            args.push(parse_expr(tks)!)
            tks.take(",")
        }
        tks.take(")")

        return {
            kind: "CALL_NODE",
            func: value,
            args,
        }
    }

    return value
}

function parse_index(tks: TokenStream): ExprNode | undefined {
    const value = parse_value(tks)!

    if (tks.take("[")) {
        const index = parse_expr(tks)!
        tks.take("]")

        return {
            kind: "INDEX_NODE",
            value,
            index
        }
    }

    if (tks.take(".")) {
        const index = tks.take("<ident>") ?? Number(tks.take("<number>")!)

        return {
            kind: "INDEX_NODE",
            value,
            index
        }
    }

    return value
}

function parse_arg_name(tks: TokenStream): string | undefined {
    const save = tks.save()

    const name = tks.take("<ident>")
    if (name && tks.take(":")) {
        return name
    }

    tks.load(save)
    return undefined
}

function parse_value(tks: TokenStream): ExprNode | undefined {
    const save = tks.save()

    if (tks.take("[")) {
        const items: ArgNode[] = []

        while (!tks.peak("]")) {
            const name = parse_arg_name(tks)
            items.push({
                kind: "ARG_NODE",
                name,
                value: parse_expr(tks)!
            })
            tks.take(",")
        }

        tks.take("]")

        return {
            kind: "ARRAY_NODE",
            items
        }
    }

    const num = tks.take("<number>")
    if (num) {
        return {
            kind: "NUMBER_NODE",
            value: Number(num)
        }
    }

    const text = tks.take("<string>")
    if (text) {
        return {
            kind: "STRING_NODE",
            value: text
        }
    }

    const ident = tks.take("<ident>")
    if (ident) {
        return {
            kind: "IDENT_NODE",
            value: ident
        }
    }

    if (tks.take("(")) {
        const expr = parse_expr(tks)
        tks.take(")")
        return expr
    }

    tks.load(save)
    return undefined
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
    return parse_file(tks)
}
