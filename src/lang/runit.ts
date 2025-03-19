import type { ExprNode, FuncNode } from "./parse.ts";

export type Value = number | boolean

interface Ctx {
    vars: Map<string, Value>
}

function builtin_vars() {
    const map = new Map<string, Value>()
    map.set("true", true)
    map.set("false", false)
    return map
}

export function runit(ast: FuncNode) {
    return run_func(ast)
}

function run_func(ast: FuncNode) {
    const ctx = {
        vars: builtin_vars()
    }

    for (const stmt of ast.body) {
        if (stmt.kind === "ASSIGNMENT_NODE") {
            ctx.vars.set(stmt.name, run_expr(stmt.value, ctx))
        }

        if (stmt.kind === "RETURN_NODE") {
            return run_expr(stmt.value, ctx)
        }
    }
}

function run_expr(ast: ExprNode, ctx: Ctx): Value {
    if (ast.kind === "TERNARY_NODE") {
        if (run_expr(ast.cond, ctx) === true) {
            return run_expr(ast.a, ctx)
        } else {
            return run_expr(ast.b, ctx)
        }
    }

    if (ast.kind === "NUMBER_NODE") {
        return ast.value
    }

    if (ast.kind === "IDENT_NODE") {
        if (!ctx.vars.has(ast.value)) {
            throw new Error(`Attempt to use unassigned var ${ast.value}!`)
        } else {
            return ctx.vars.get(ast.value)!
        }
    }

    if (ast.kind === "OP_NODE") {
        if (ast.op === "+") return (run_expr(ast.a, ctx) as number) + (run_expr(ast.b, ctx) as number)
        if (ast.op === "-") return (run_expr(ast.a, ctx) as number) - (run_expr(ast.b, ctx) as number)
        if (ast.op === "*") return (run_expr(ast.a, ctx) as number) * (run_expr(ast.b, ctx) as number)
        if (ast.op === "/") return (run_expr(ast.a, ctx) as number) / (run_expr(ast.b, ctx) as number)

        if (ast.op === ">") return (run_expr(ast.a, ctx) as number) > (run_expr(ast.b, ctx) as number)
        if (ast.op === "<") return (run_expr(ast.a, ctx) as number) < (run_expr(ast.b, ctx) as number)
        if (ast.op === ">=") return (run_expr(ast.a, ctx) as number) >= (run_expr(ast.b, ctx) as number)
        if (ast.op === "<=") return (run_expr(ast.a, ctx) as number) <= (run_expr(ast.b, ctx) as number)

        if (ast.op === "==") return run_expr(ast.a, ctx) == run_expr(ast.b, ctx)
    }

    throw new Error("UNREACHABLE!!!!")
}
