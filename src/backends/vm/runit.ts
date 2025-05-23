// deno-lint-ignore-file ban-types

import type { Fn, Prog } from "./build.ts";
import { unreachable } from "jsr:@std/assert/unreachable";

export type Value = number | boolean | Function

interface Ctx {
    memory: number[]
    get(name: string | number): Value | undefined
    set(name: string, value: Value): void
    sub(): Ctx
}

function Ctx(parent: Ctx) {
    const vars = new Map()

    return {
        memory: parent.memory,
        get(name: string | number) {
            if (typeof name == "number") return name
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
    const memory: number[] = []
    const globals = new Map<string, Value>()

    globals.set("true", true)
    globals.set("false", false)

    globals.set("max", Math.max)
    globals.set("sqrt", Math.sqrt)

    globals.set("alloc", (size: number) => {
        const ptr = memory.length
        memory.length += size
        return ptr
    })

    globals.set("+", (a: number, b: number) => a + b)
    globals.set("-", (a: number, b: number) => a - b)
    globals.set("*", (a: number, b: number) => a * b)
    globals.set("/", (a: number, b: number) => a / b)
    globals.set("**", (a: number, b: number) => a ** b)

    globals.set("==", (a: number, b: number) => a == b)
    globals.set(">", (a: number, b: number) => a > b)
    globals.set("<", (a: number, b: number) => a < b)
    globals.set(">=", (a: number, b: number) => a >= b)
    globals.set("<=", (a: number, b: number) => a <= b)

    return {
        memory,
        get(name: string) {
            return globals.get(name)
        },
        set(_name: string, _value: Value) {
            throw new Error("CAN NOT SET BUILTINS!")
        },
        sub() {
            return Ctx(this)
        }
    }
}

export function runit(prog: Prog, func_name = "main") {
    const ctx = builtin_ctx().sub()

    for (const fn of prog.fns) {
        ctx.set(fn.name, (...args: Value[]) => {
            const func_ctx = ctx.sub()

            for (let i = 0; i < args.length; i++) {
                func_ctx.set(fn.params[i].name, args[i])
            }

            return run_func(fn, func_ctx)
        })
    }

    return run_func(prog.fns.find(({ name }) => name === func_name)!, ctx.sub())
}

function run_func(n: Fn, ctx: Ctx) {
    let block = 0
    while (true) {
        for (const op of n.blocks[block++]) {
            if (op.kind == "ASSIGN_OP") {
                ctx.set(op.result, ctx.get(op.value)!)
            } else if (op.kind == "RETURN_OP") {
                return ctx.get(op.value)
            } else if (op.kind == "CALLFN_OP") {
                ctx.set(op.result, (ctx.get(op.func) as Function)(
                    ...op.args.map(arg => ctx.get(arg))
                ))
            } else if (op.kind == "BRANCH_OP") {
                if (ctx.get(op.cond)) {
                    block = op.a
                } else {
                    block = op.b
                }
            } else if (op.kind === "JUMP_OP") {
                block = op.jump
            } else if (op.kind == "LOAD_OP") {
                ctx.set(op.result, ctx.memory[(ctx.get(op.local) as number) + (op.offset as number)])
            } else if (op.kind == "STORE_OP") {
                ctx.memory[(ctx.get(op.target) as number) + (op.offset as number)] = ctx.get(op.value) as number 
            } else {
                unreachable(`!!!!`)
            }
        }
    }
}
