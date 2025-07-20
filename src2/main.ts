import { error_handler, parse, err } from ".././lib/parse.ts";
import { check, Context } from "./context.ts";
import { as, assert_type_eq, atom } from "./types.ts";

function op_module(ctx: Context) {
    // define types
    for (const type of ["int", "bool", "type"] as const) {
        ctx.set(type, atom("type", type))
    }

    // define operators
    for (const op of ["+", "-"]) {
        ctx.set(op, atom("func", (ctx, ...args) => {
            const a = ctx.exec(args[0]).value
            const b = ctx.exec(args[1]).value

            return atom("int", eval(`${a} ${op} ${b}`))
        }))
        ctx.set_type(op, (ctx, args, area) => {
            if (args.length != 2) err("invalid num params", area)

            const a = ctx.check(args[0])
            const b = ctx.check(args[1])

            return assert_type_eq(ctx, a, b, area)
        })
    }

    // define comparators
    for (const op of ["<=", "==", ">=", "!="]) {
        ctx.set(op, atom("func", (ctx, ...args) => {
            const a = ctx.exec(args[0]).value
            const b = ctx.exec(args[1]).value

            return atom("bool", eval(`${a} ${op} ${b}`))
        }))
        ctx.set_type(op, (ctx, args, area) => {
            if (args.length != 2) err("invalid num params", area)
            
            const a = ctx.check(args[0])
            const b = ctx.check(args[1])

            assert_type_eq(ctx, a, b, area)

            return "bool"
        })
    }
}

function control_flow_module(ctx: Context) {
    ctx.set("#if", atom("func", (ctx, c, a, b) => {
        if (as("bool", ctx.exec(c))) {
            return ctx.exec(a)
        } else {
            return ctx.exec(b)
        }
    }))
    ctx.set_type("#if", (ctx, if_def, area) => {
        if (![2, 3].includes(if_def.length)) err("2 | 3 if values", area)

        assert_type_eq(ctx, ctx.check(if_def[0]), "bool", if_def[0])

        if (if_def[2] != undefined) { 
            const a = ctx.check(if_def[1])
            const b = ctx.check(if_def[2])
            return assert_type_eq(ctx, a, b, area)
        } else {
            return ctx.check(if_def[1])
        }
    })
}

function main() {
    try {
        const src = SOURCE
        const ast = parse(src)
        const _mod = check([
            control_flow_module,
            op_module,
            ast
        ])
        console.log("\n√ all systems green\n")
    } catch (e) {
        error_handler(e as Error)
    }
}

const SOURCE = `
(fib3 (#fn ((n int)) int
    (#if (<= n 1) (#return n))
    (#return (+ (fib2 (- n 1)) (fib (- n 2))))
))

(fib (#fn ((n int)) int
    (#if (<= n 1) (#return n))
    (#return (+ (fib2 (- n 1)) (fib3 (- n 2))))
))

(fib2 (#fn ((n int)) int
    (#if (<= n 1) (#return n))
    (#return (+ (fib2 (- n 1)) (fib (- n 2))))
))

(main (#fn ((x int) (y int)) (maybe_int 42) 
    (#return (+ x (fib y)))
))

(maybe_int (#fn ((x int)) type
    (#return (#if (== x 42) int bool))
))
`.trim()

main()
