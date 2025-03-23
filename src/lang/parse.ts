import type { TokenStream } from "./lexer.ts";

export interface ParamNode {
    kind: "PARAM_NODE",
    name: string,
    type: ExprNode,
}

export interface FuncNode {
    kind: "FUNC_NODE"
    name: string
    body: StatmentNode[]
    params: ParamNode[]
}

export type StatmentNode = ReturnNode | AssignmentNode | IfNode | WhileNode

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
    index: string
}

export type Op = "+" | "-" | "/" | "*" | "==" | ">" | "<" | ">=" | "<="

export interface OpNode {
    kind: "OP_NODE"
    op: Op
    a: ExprNode
    b: ExprNode
}

export interface ArrayNode {
    kind: "ARRAY_NODE"
    value: ExprNode[]
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

export function parse_file(tks: TokenStream): FuncNode[] {
    const funcs = []

    while (true) {
        const func = parse_func(tks)
        if (!func) break
        funcs.push(func)
    }

    return funcs
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
    return parse_op(tks, parse_call, parse_mul, ["*", "/"])
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

    if (tks.take(".")) {
        const index = tks.take("<ident>")!

        return {
            kind: "INDEX_NODE",
            value,
            index
        }
    }

    return value
}

function parse_value(tks: TokenStream): ExprNode | undefined {
    const save = tks.save()

    if (tks.take("[")) {
        const value = []

        while (!tks.peak("]")) {
            value.push(parse_expr(tks)!)
            tks.take(",")
        }

        tks.take("]")

        return {
            kind: "ARRAY_NODE",
            value
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
