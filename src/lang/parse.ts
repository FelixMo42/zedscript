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

export function parse_file(tks: TokenStream): FileNode {
    const items = []

    while (true) {
        const node = parse_func(tks) ?? parse_struct(tks)
        if (!node) break
        items.push(node)
    }

    return {
        kind: "FILE_NODE",
        items
    }
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
                type: parse_type(tks)!,
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

export function parse_type(tks: TokenStream): TypeNode | undefined {
    const save = tks.save()
    
    if (tks.take("(")) {
        const args = []

        while (!tks.take(")")) {
            args.push(parse_type(tks)!)
            tks.take(",")
        }

        return {
            kind: "TYPE_NODE",
            name: "Tuple",
            args,
        }
    }

    const name = tks.take("<ident>")
    if (name) {
        const args = []

        if (tks.take("<")) {
            while (!tks.take(">")) {
                args.push(parse_type(tks)!)
                tks.take(",")
            }
        }
        
        return {
            kind: "TYPE_NODE",
            name,
            args,
        }
    }

    tks.load(save)
    return undefined
}

export function parse_func(tks: TokenStream): FuncNode | undefined {
    const save = tks.save()

    if (tks.take("fn")) {
        const name = tks.take("<ident>")!

        // params
        tks.take("(")
        const params: ParamNode[] = []
        while (!tks.peak(")")) {
            params.push({
                kind: "PARAM_NODE",
                name: tks.take("<ident>")!,
                type: parse_type(tks)!,
            })
            tks.take(",")
        }
        tks.take(")")

        // return type
        const return_type = parse_type(tks)

        // body
        tks.take("{")
        const body = parse_stmts(tks)
        tks.take("}")

        // returns
        return { kind: "FUNC_NODE", name, return_type, body, params }
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

    if (tks.take("return")) {
        return {
            kind: "RETURN_NODE",
            value: parse_expr(tks)!
        }
    }

    const expr = parse_expr(tks)
    

    if (expr && tks.take("=")) {
        return {
            kind: "ASSIGNMENT_NODE",
            name: expr,
            value: parse_expr(tks)!
        }
    }

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

// INDEX_NODEESSIONS //

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
    return parse_op(tks, parse_index, parse_ex, ["**"])
}

function parse_index(tks: TokenStream): ExprNode | undefined {
    const value = parse_call(tks)!
    if (!value) return undefined

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
        const field = tks.take("<ident>")!

        return {
            kind: "FIELD_NODE",
            value,
            field,
        }
    }

    return value
}

function parse_call(tks: TokenStream): ExprNode | undefined {
    const value = parse_value(tks)!

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

    if (tks.take("{")) {
        const items: ArgNode[] = []

        while (!tks.peak("}")) {
            const name = parse_arg_name(tks)
            items.push({
                kind: "ARG_NODE",
                name,
                value: parse_expr(tks)!
            })
            tks.take(",")
        }

        tks.take("}")

        return {
            kind: "OBJECT_NODE",
            items
        }
    }

    if (tks.take("[")) {
        const items: ExprNode[] = []

        while (!tks.peak("]")) {
            items.push(parse_expr(tks)!)
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
