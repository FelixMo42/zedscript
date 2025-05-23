import type { AssignmentNode, ExprNode, FileNode, FuncNode, IdentNode, ParamNode, ReturnNode, StatmentNode, StructNode, TypeNode } from "../../lang/parse.ts";
import { Type } from "./types.ts";

/// TYPES

export interface Module {
    kind: "MODULE"
    items: (StructNode | FuncSSA)[]
}

export interface FuncSSA {
    kind: "FUNC_SSA"
    name: string
    return: TypeNode
    params: ParamNode[]
    blocks: StatmentSSA[][]
}

export type StatmentSSA
    = AssignmentNode
    | ReturnNode
    | {
        kind: "BRANCH_SSA"
        cond: ExprNode
        a: number
        b: number
    }
    | {
        kind: "JUMP_OP"
        jump: number
    }

/// BUILDER

interface Local {
    kind: "LOCAL"
    id: number
}

class Builder {
    locals: Local[] = []
    blocks: StatmentSSA[][] = []

    new_local(): IdentNode {
        const local: Local = {
            kind: "LOCAL",
            id: this.locals.length
        }
    
        this.locals.push(local)

        return {
            kind: "IDENT_NODE",
            value: `%${local.id}`,
        }
    }

    new_local_with_expr(block: [number], n: ExprNode): IdentNode {
        const local = this.new_local()
    
        this.push(block, {
            kind: "ASSIGNMENT_NODE",
            name: local,
            value: n,
        })

        return local
    }

    new_block() {
        return [this.blocks.push([]) - 1] as [number]
    }

    push(block: number | [number], stmt: StatmentSSA) {
        if (typeof block == "number") {
            this.blocks[block].push(stmt)
        } else {
            this.blocks[block[0]].push(stmt)
        }
    }
}

function build_expr(c: Builder, block: [number], n: ExprNode): ExprNode {
    if (n.kind === "IDENT_NODE") {
        return n
    } else if (n.kind === "NUMBER_NODE") {
        return n
    } else if (n.kind === "CALL_NODE") {
        return c.new_local_with_expr(block, {
            ...n,
            args: n.args.map((arg) => build_expr(c, block, arg))
        })
    } else if (n.kind === "OBJECT_NODE") {
        return c.new_local_with_expr(block, {
            ...n,
            items: n.items.map((arg) => ({
                ...arg,
                value: build_expr(c, block, arg.value)
            }))
        })
    } else if (n.kind === "ARRAY_NODE") {
        return c.new_local_with_expr(block, {
            ...n,
            items: n.items.map((arg) => build_expr(c, block, arg))
        })
    } else if (n.kind === "INDEX_NODE") {
        return c.new_local_with_expr(block, {
            ...n,
            index: build_expr(c, block, n.index),
            value: build_expr(c, block, n.value),
        })
    } else if (n.kind === "OP_NODE") {
        return c.new_local_with_expr(block, {
            kind: "CALL_NODE",
            func: { kind: "IDENT_NODE", value: n.op },
            args: [
                build_expr(c, block, n.a),
                build_expr(c, block, n.b),
            ]
        })
    } else if (n.kind === "TERNARY_NODE") {
        const local = c.new_local()

        buildStmt(c, block, {
            kind: "IF_NODE",
            cond: build_expr(c, block, n.cond),
            a: [{
                kind: "ASSIGNMENT_NODE",
                name: local,
                value: n.a
            }],
            b: [{
                kind: "ASSIGNMENT_NODE",
                name: local,
                value: n.b
            }]
        })

        return local
    } else {
        return c.new_local_with_expr(block, Object.fromEntries(
            Object.entries(n).map(([key, value]) => {
                if (typeof value === "object") {
                   return [key, build_expr(c, block, value)]
                }
                return [key, value]
            })
        ) as ExprNode)
    }
}

function build_block(c: Builder, exit_block: [number], n: StatmentNode[]) {
    const start_block = c.new_block()[0]
    const block = [start_block] as [number]

    for (const stmt of n) {
        buildStmt(c, block, stmt)
    }

    c.push(block, {
        kind: "JUMP_OP",
        jump: exit_block[0]
    })

    return start_block
}

function buildStmt(c: Builder, block: [number], n: StatmentNode) {
    if (n.kind === "ASSIGNMENT_NODE") {
        c.push(block, {
            kind: "ASSIGNMENT_NODE",
            name: n.name,
            value: build_expr(c, block, n.value)
        })
    } else if (n.kind === "RETURN_NODE") {
        c.push(block, {
            kind: "RETURN_NODE",
            value: build_expr(c, block, n.value)
        })
    } else if (n.kind === "WHILE_NODE") {
        const cond_block = c.new_block()
        const exit_block = c.new_block()
        const body_block = build_block(c, cond_block, n.body)

        // move into the condition block
        c.push(block, {
            kind: "JUMP_OP",
            jump: cond_block[0],
        })
        c.push(cond_block, {
            kind: "BRANCH_SSA",
            cond: build_expr(c, cond_block, n.cond),
            a: body_block,
            b: exit_block[0]
        })

        // and exit into the exit block
        block[0] = exit_block[0]
    } else if (n.kind === "IF_NODE") {
        const local = c.new_local()
        const exit_block = c.new_block()

        const a = build_block(c, exit_block, n.a)
        const b = build_block(c, exit_block, n.b)

        c.push(block, {
            kind: "BRANCH_SSA",
            cond: build_expr(c, [block[0]], n.cond),
            a, b
        })
    
        block[0] = exit_block[0]    
        return local
    } else {
        throw new Error(`Unimpmement ${n.kind}!`)
    }
}

function funcToSSA(func: FuncNode): FuncSSA {
    const c = new Builder()

    const block = c.new_block()
    for (const stms of func.body) {
        buildStmt(c, block, stms)
    }

    return {
        kind: "FUNC_SSA",
        name: func.name,
        return: func.return_type ?? Type("void"),
        params: func.params,
        blocks: c.blocks
    }
}

export function lower(file: FileNode): Module {
    return {
        kind: "MODULE",
        items: file.items.map(node => {
            if (node.kind === "FUNC_NODE") {
                return funcToSSA(node)
            } else if (node.kind === "STRUCT_NODE") {
                return node
            } else {
                throw new Error("unreachable")
            }
        })
    }
}
