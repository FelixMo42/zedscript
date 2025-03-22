// deno-lint-ignore-file ban-types

import type { Fn } from "./build.ts";
import type { ExprNode } from "./parse.ts";

export type Value = number | string | boolean | Function | Value[]

interface Ctx {
    get(name: string): Value | undefined
    set(name: string, value: Value): void
    sub(): Ctx
}

function Ctx(parent: Ctx) {
    const vars = new Map()

    return {
        get(name: string) {
            return vars.get(name) ?? parent.get(name)
        },
        set(name: string, value: Value) {
            vars.set(name, value)
        },
        sub() {
            return Ctx(this)
        }
    }
}

function builtin_ctx(): Ctx {
    const vars = new Map<string, Value>()

    vars.set("true", true)
    vars.set("false", false)
    vars.set("max", Math.max)

    return {
        get(name: string) {
            return vars.get(name)
        },
        set(_name: string, _value: Value) {
            throw new Error("CAN NOT SET BUILTINS!")
        },
        sub() {
            return Ctx(this)
        }
    }
}

export function runit(fns: Fn[], func_name = "main") {
    const ctx = builtin_ctx().sub()

    for (const fn of fns) {
        ctx.set(fn.name, (...args: Value[]) => {
            const func_ctx = ctx.sub()

            for (let i = 0; i < args.length; i++) {
                func_ctx.set(fn.params[i].name, args[i])
            }

            return run_func(fn, func_ctx)
        })
    }

    return run_func(fns.find(({ name }) => name === func_name)!, ctx.sub())
}

function run_func(n: Fn, ctx: Ctx) {
    let block = 0
    while (true) {
        for (const stmt of n.blocks[block++]) {
            if (stmt.kind === "ASSIGNMENT_NODE") {
                ctx.set(stmt.name, run_expr(stmt.value, ctx))
            }

            if (stmt.kind === "RETURN_NODE") {
                return run_expr(stmt.value, ctx)
            }

            if (stmt.kind === "BRANCH") {
                if (run_expr(stmt.cond, ctx)) {
                    block = stmt.a
                } else {
                    block = stmt.b
                }

                break
            }

            if (stmt.kind === "JUMP") {
                block = stmt.target
                break
            }
        }
    }
}

function run_expr(n: ExprNode, ctx: Ctx): Value {
    if (n.kind === "CALL_NODE") {
        const func = (run_expr(n.func, ctx) as Function)
        return func(...n.args.map(arg => run_expr(arg, ctx)))
    }

    if (n.kind === "TERNARY_NODE") {
        if (run_expr(n.cond, ctx) === true) {
            return run_expr(n.a, ctx)
        } else {
            return run_expr(n.b, ctx)
        }
    }

    if (n.kind === "ARRAY_NODE") {
        return n.value.map(n => run_expr(n, ctx))
    }

    if (n.kind === "NUMBER_NODE" || n.kind === "STRING_NODE") {
        return n.value
    }

    if (n.kind === "IDENT_NODE") {
        const value = ctx.get(n.value)
        if (value === undefined) {
            throw new Error(`Attempt to use unassigned var "${n.value}!"`)
        }
        return value
    }

    if (n.kind === "OP_NODE") {
        if (n.op === "+") return (run_expr(n.a, ctx) as number) + (run_expr(n.b, ctx) as number)
        if (n.op === "-") return (run_expr(n.a, ctx) as number) - (run_expr(n.b, ctx) as number)
        if (n.op === "*") return (run_expr(n.a, ctx) as number) * (run_expr(n.b, ctx) as number)
        if (n.op === "/") return (run_expr(n.a, ctx) as number) / (run_expr(n.b, ctx) as number)

        if (n.op === ">") return (run_expr(n.a, ctx) as number) > (run_expr(n.b, ctx) as number)
        if (n.op === "<") return (run_expr(n.a, ctx) as number) < (run_expr(n.b, ctx) as number)
        if (n.op === ">=") return (run_expr(n.a, ctx) as number) >= (run_expr(n.b, ctx) as number)
        if (n.op === "<=") return (run_expr(n.a, ctx) as number) <= (run_expr(n.b, ctx) as number)

        if (n.op === "==") return run_expr(n.a, ctx) == run_expr(n.b, ctx)
    }

    throw new Error("UNREACHABLE!!!!")
}
