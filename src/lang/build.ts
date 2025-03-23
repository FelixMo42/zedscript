import type { AssignmentNode, ExprNode, FileNode, FuncNode, ParamNode, ReturnNode, StatmentNode, StructNode } from "./parse.ts";

export type Statment = Branch | Jump | AssignmentNode | ReturnNode;


 
class Builder {
    types: Struct[]
    blocks: Op[][] = []

    constructor(structs: Struct[]) {
        this.types = structs
    }

    new_block() {
        return this.blocks.push([]) - 1
    }

    push(block: number | [number], op: Op) {
        if (typeof block == "number") {
            this.blocks[block].push(op)
        } else {
            this.blocks[block[0]].push(op)
        }
    }
}

let id = 0

function getSSAN() {
    return "v" + String(id++)
}

export interface Jump {
    kind: "JUMP"
    target: number
}

export interface Branch {
    kind: "BRANCH"
    cond: ExprNode
    a: number
    b: number
}

export interface Fn {
    name: string
    blocks: Op[][]
    params: ParamNode[]
}

export type Op = {
    kind: "CALLFN_OP"
    name: string
    func: string
    args: (string | number)[]
} | {
    kind: "ASSIGN_OP"
    name: string
    value: string | number
} | {
    kind: "RETURN_OP"
    value: (string | number)
} | {
    kind: "BRANCH_OP"
    cond: (string | number)
    a: number
    b: number
} | {
    kind: "JUMPTO_OP"
    jump: number
}

function build_expr(
    c: Builder,
    block: [number],
    ast: ExprNode
): string | number {
    if (ast.kind === "IDENT_NODE") {
        return ast.value
    } else if (ast.kind === "NUMBER_NODE") {
        return ast.value
    } else if (ast.kind === "ARRAY_NODE") {
        const name = getSSAN()
        c.push(block, {
            kind: "CALLFN_OP",
            name,
            func: "alloc",
            args: [ast.items.length]
        })
        for (const [i, item] of ast.items.entries()) {
            const v = build_expr(c, block, item.value)
            c.push(block, {
                kind: "CALLFN_OP",
                name: "_",
                func: "set",
                args: [name, i, v]
            })
        }
        return name
    } else if (ast.kind === "OP_NODE") {
        const a = build_expr(c, block, ast.a)
        const b = build_expr(c, block, ast.b)
        const name = getSSAN()
        c.push(block, {
            kind: "CALLFN_OP",
            name,
            func: ast.op,
            args: [a, b] 
        })
        return name
    } else if (ast.kind === "TERNARY_NODE") {
        const name = getSSAN()

        const new_block = c.new_block()
        const a = build_block(c, new_block, [{
            kind: "ASSIGNMENT_NODE",
            name,
            value: ast.a
        }])
        const b = build_block(c, new_block, [{
            kind: "ASSIGNMENT_NODE",
            name,
            value: ast.b
        }])

        c.push(block, {
            kind: "BRANCH_OP",
            cond: build_expr(c, [block[0]], ast.cond),
            a, b
        })
    
        block[0] = new_block
    
        return name
    } else if (ast.kind === "CALL_NODE") {
        const name = getSSAN()

        if (ast.func.kind != "IDENT_NODE") {
            throw new Error("Can only call ident node!")
        }

        const func = ast.func.value

        c.push(block, {
            kind: "CALLFN_OP",
            name,
            func,
            args: ast.args.map(arg => build_expr(c, block, arg))
        })
        return name
    } else if (ast.kind === "INDEX_NODE") {
        const name = getSSAN()
        const value = build_expr(c, block, ast.value)

        let index = ast.index

        if (typeof index == "object") {
            index = build_expr(c, block, index) 
        }

        if (typeof index == "string") {
            // TODO
        }

        c.push(block, {
            kind: "CALLFN_OP",
            name,
            func: "get",
            args: [value, index]
        })
        return name
    } else {
        throw new Error(`Unimplement feature ${ast.kind}!`)
    }
}

function build_block(
    c: Builder,
    after: number,
    ast: StatmentNode[]
) {
    const start_block = c.new_block()
    let block = start_block

    for (const stmt of ast) {
        if (stmt.kind == "WHILE_NODE") {
            const cond_block = c.new_block()
            const after_block = c.new_block()
            const body = build_block(c, cond_block, stmt.body)

            c.push(block, {
                kind: "JUMPTO_OP",
                jump: cond_block,
            })

            c.push(cond_block, {
                kind: "BRANCH_OP",
                cond: build_expr(c, [cond_block], stmt.cond),
                a: body, b: after_block
            })

            block = after_block
        }

        if (stmt.kind == "ASSIGNMENT_NODE") {
            const ptr = [block] as [number]
            const value = build_expr(c, ptr, stmt.value)
            c.push(ptr, {
                kind: "ASSIGN_OP",
                name: stmt.name,
                value: value
            })
            block = ptr[0]
        }

        if (stmt.kind == "DISCARD_NODE") {
            const ptr = [block] as [number]
            build_expr(c, ptr, stmt.value)
            block = ptr[0]
        }

        if (stmt.kind == "IF_NODE") {
            const new_block = c.new_block()

            const a = build_block(c, new_block, stmt.a)
            const b = build_block(c, new_block, stmt.b)

            c.push(block, {
                kind: "BRANCH_OP",
                cond: build_expr(c, [block], stmt.cond),
                a, b
            })

            block = new_block
        }

        if (stmt.kind == "RETURN_NODE") {
            const ptr = [block] as [number]

            const value = build_expr(c, ptr, stmt.value)

            c.push(ptr, {
                kind: "RETURN_OP",
                value: value,
            })

            return start_block
        }
    }

    c.push(block, {
        kind: "JUMPTO_OP",
        jump: after
    })

    return start_block
}

function build_fn(ast: FuncNode, structs: Struct[]): Fn {
    const b = new Builder(structs)

    build_block(b, Number.POSITIVE_INFINITY, ast.body)
    
    return {
        name: ast.name,
        params: ast.params,
        blocks: b.blocks,
    }
}

export interface Struct {
    name: string
    fields: {
        name: string
        type: string
    }[]
}

export interface Prog {
    structs: Struct[]
    fns: Fn[]
}

function build_struct(ast: StructNode): Struct {
    return {
        name: ast.name,
        fields: ast.fields.map((field) => {
            if (field.type.kind !== "IDENT_NODE") {
                throw new Error("Unrecognized field type!")
            }

            return {
                name: field.name,
                type: field.type.value
            }
        })
    }
}

export function build(file: FileNode): Prog {
    const structs = file
        .filter(node => node.kind == "STRUCT_NODE")
        .map(struct_node => build_struct(struct_node))

    const fns = file
        .filter(node => node.kind == "FUNC_NODE")
        .map(func_node => build_fn(func_node, structs))

    return { fns, structs }
}
