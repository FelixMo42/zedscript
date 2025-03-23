// deno-lint-ignore-file ban-types

import type { Fn } from "./build.ts";

export type Value = number | boolean | Function

interface Ctx {
    get(name: string | number): Value | undefined
    set(name: string, value: Value): void
    sub(): Ctx
}

function Ctx(parent: Ctx) {
    const vars = new Map()

    return {
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
    const vars = new Map<string, Value>()

    vars.set("true", true)
    vars.set("false", false)

    vars.set("max", Math.max)
    vars.set("sqrt", Math.sqrt)

    const stack: number[] = []
    vars.set("set", (ptr: number, i: number, v: number) => stack[ptr + i] = v)
    vars.set("get", (ptr: number, i: number) => stack[ptr + i])
    vars.set("alloc", (size: number) => {
        const ptr = stack.length
        stack.length += size
        return ptr
    })

    vars.set("+", (a: number, b: number) => a + b)
    vars.set("-", (a: number, b: number) => a - b)
    vars.set("*", (a: number, b: number) => a * b)
    vars.set("/", (a: number, b: number) => a / b)

    vars.set("==", (a: number, b: number) => a == b)
    vars.set(">", (a: number, b: number) => a > b)
    vars.set("<", (a: number, b: number) => a < b)
    vars.set(">=", (a: number, b: number) => a >= b)
    vars.set("<=", (a: number, b: number) => a <= b)

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
        for (const op of n.blocks[block++]) {
            if (op.kind == "ASSIGN_OP") {
                ctx.set(op.name, ctx.get(op.value)!)
            }
            if (op.kind == "RETURN_OP") {
                return ctx.get(op.value)
            }
            if (op.kind == "CALLFN_OP") {
                ctx.set(op.name, (ctx.get(op.func) as Function)(
                    ...op.args.map(arg => ctx.get(arg))
                ))
            }
            if (op.kind == "BRANCH_OP") {
                if (ctx.get(op.cond)) {
                    block = op.a
                } else {
                    block = op.b
                }
            }
            if (op.kind === "JUMPTO_OP") {
                block = op.jump
            }
        }
    }
}
