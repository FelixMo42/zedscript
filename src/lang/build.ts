import type { AssignmentNode, ExprNode, FuncNode, ReturnNode, StatmentNode } from "./parse.ts";

export type Statment = Branch | Jump | AssignmentNode | ReturnNode;

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
    blocks: Statment[][]
    params: string[]
}

function build_block(
    blocks: Statment[][],
    after: number,
    ast: StatmentNode[]
) {
    const start_block = blocks.push([]) - 1
    let block = start_block

    for (const stmt of ast) {
        if (stmt.kind == "ASSIGNMENT_NODE") {
            blocks[block].push(stmt)
        }

        if (stmt.kind == "IF_NODE") {
            const new_block = blocks.push([]) - 1
            const a = build_block(blocks, new_block, stmt.a)
            const b = build_block(blocks, new_block, stmt.b)

            blocks[block].push({
                kind: "BRANCH",
                cond: stmt.cond,
                a, b
            })

            block = new_block
        }

        if (stmt.kind == "RETURN_NODE") {
            blocks[block].push(stmt)
            return start_block
        }
    }

    blocks[block].push({
        kind: "JUMP",
        target: after
    })

    return start_block
}

function build_fn(ast: FuncNode): Fn {
    const blocks = [] as Statment[][]
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

// open ended up questions
// jira


