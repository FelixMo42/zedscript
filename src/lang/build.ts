import type { AssignmentNode, ExprNode, FuncNode, ParamNode, ReturnNode, StatmentNode } from "./parse.ts";

export type Statment = Branch | Jump | AssignmentNode | ReturnNode;

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
    blocks: Op[][],
    block: [number],
    ast: ExprNode
): string | number {
    if (ast.kind === "IDENT_NODE") {
        return ast.value
    } else if (ast.kind === "NUMBER_NODE") {
        return ast.value
    } else if (ast.kind === "OP_NODE") {
        const a = build_expr(blocks, block, ast.a)
        const b = build_expr(blocks, block, ast.b)
        const name = getSSAN()
        blocks[block[0]].push({
            kind: "CALLFN_OP",
            name,
            func: ast.op,
            args: [a, b] 
        })
        return name
    } else if (ast.kind === "TERNARY_NODE") {
        const name = getSSAN()

        const new_block = blocks.push([]) - 1
        const a = build_block(blocks, new_block, [{
            kind: "ASSIGNMENT_NODE",
            name,
            value: ast.a
        }])
        const b = build_block(blocks, new_block, [{
            kind: "ASSIGNMENT_NODE",
            name,
            value: ast.b
        }])

        blocks[block[0]].push({
            kind: "BRANCH_OP",
            cond: build_expr(blocks, [block[0]], ast.cond),
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

        blocks[block[0]].push({
            kind: "CALLFN_OP",
            name,
            func,
            args: ast.args.map(arg => build_expr(blocks, block, arg))
        })
        return name
    } else {
        throw new Error(`Unimplement feature ${ast.kind}!`)
    }
}

function build_block(
    blocks: Op[][],
    after: number,
    ast: StatmentNode[]
) {
    const start_block = blocks.push([]) - 1
    let block = start_block

    for (const stmt of ast) {
        if (stmt.kind == "WHILE_NODE") {
            const cond_block = blocks.push([]) - 1
            const after_block = blocks.push([]) - 1
            const body = build_block(blocks, cond_block, stmt.body)

            blocks[block].push({
                kind: "JUMPTO_OP",
                jump: cond_block,
            })

            blocks[cond_block].push({
                kind: "BRANCH_OP",
                cond: build_expr(blocks, [cond_block], stmt.cond),
                a: body, b: after_block
            })

            block = after_block
        }

        if (stmt.kind == "ASSIGNMENT_NODE") {
            const ptr = [block] as [number]
            const value = build_expr(blocks, ptr, stmt.value)
            blocks[ptr[0]].push({
                kind: "ASSIGN_OP",
                name: stmt.name,
                value: value
            })
            block = ptr[0]
        }

        if (stmt.kind == "DISCARD_NODE") {
            const ptr = [block] as [number]
            build_expr(blocks, ptr, stmt.value)
            block = ptr[0]
        }

        if (stmt.kind == "IF_NODE") {
            const new_block = blocks.push([]) - 1
            const a = build_block(blocks, new_block, stmt.a)
            const b = build_block(blocks, new_block, stmt.b)

            blocks[block].push({
                kind: "BRANCH_OP",
                cond: build_expr(blocks, [block], stmt.cond),
                a, b
            })

            block = new_block
        }

        if (stmt.kind == "RETURN_NODE") {
            const ptr = [block] as [number]

            const value = build_expr(blocks, ptr, stmt.value)

            blocks[ptr[0]].push({
                kind: "RETURN_OP",
                value: value,
            })

            return start_block
        }
    }

    blocks[block].push({
        kind: "JUMPTO_OP",
        jump: after
    })

    return start_block
}

function build_fn(ast: FuncNode): Fn {
    const blocks = [] as Op[][]
    build_block(blocks, Number.POSITIVE_INFINITY, ast.body)
    return {
        name: ast.name,
        params: ast.params,
        blocks
    }
}

export function build(ast: FuncNode[]): Fn[] {
    return ast.map(func_node => build_fn(func_node))
}
