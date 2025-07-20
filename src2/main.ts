import { error_handler, is_ast_leaf, parse, err } from ".././lib/parse.ts";
import { check, Context } from "./context.ts";
import { as, assert_type_eq, atom, Atom } from "./types.ts";

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
        ctx.set_type(op, (c, args, area) => {
            if (args.length != 2) err("invalid num params", area)

            const a = ctx.check(args[0])
            const b = ctx.check(args[1])

            return assert_type_eq(c, a, b, area)
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

function core_module(ctx: Context) {
    ctx.set_type("#func_def", (ctx, func_def, a) => {
        const func_ctx = new Context(ctx)

        const [
            name,
            params_expr,
            return_type_expr,
            ...body
        ] = func_def

        if (!is_ast_leaf(name)) err("invalid functon name", name)
        if (is_ast_leaf(params_expr)) err("invalid params", params_expr)

        const params = params_expr.map((param) => {
            if (is_ast_leaf(param)) err("invalid params", param)
            if (param.length != 2) err("invalid params", param)
            const [name, type] = param
            if (!is_ast_leaf(name)) err("invalid param name", name)
            assert_type_eq(ctx, func_ctx.check(type), "type", type)
            func_ctx.set_type(name, as("type", ctx.exec(type)))
            return { name, type: func_ctx.get_type(name) }
        })

        func_ctx.check(return_type_expr)

        const return_type = as("type", ctx.exec(return_type_expr))

        func_ctx.set_type("#return", (ctx, args, area) => {
            if (args.length !== 1) err("== 1 return value", area)
            assert_type_eq(ctx, return_type, ctx.check(args[0]), area, "incorrect return type")
            return "never"
        })

        ctx.set(name, atom("func", (ctx, ...args) => {
            const exec_ctx = new Context(ctx)

            exec_ctx.set("#return", atom("func", (ctx, a) => {
                throw new Error("RETURN", { cause: ctx.exec(a) })
            }))

            args.forEach((arg, i) => {
                const atom = ctx.exec(arg)
                assert_type_eq(ctx, params[i].type, atom.type, arg)
                exec_ctx.set(params[i].name, atom)
            })

            try {
                body.forEach(expr => exec_ctx.exec(expr))
            } catch (e) {
                const error = e as Error

                if (error.message === "RETURN") {
                    return error.cause as Atom
                }

                throw error
            }

            err("didn't return anything", a)
        }))

        ctx.set_type(name, (ctx, args, area) => {
            if (args.length !== params.length) err("wrong number of args", area)
            // TODO: make sure they are the same!
            args.forEach(arg => ctx.check(arg))
            return return_type
        })

        for (const expr of body) {
            func_ctx.check(expr)
        }

        return "func"
    })

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
            core_module,
            op_module,
            ast
        ])
        console.log("\n√ all systems green\n")
    } catch (e) {
        error_handler(e as Error)
    }
}

const SOURCE = `
(#func_def fib3 ((n int)) int
    (#if (<= n 1) (#return n))
    (#return (+ (fib2 (- n 1)) (fib (- n 2))))
)

(#func_def fib ((n int)) int
    (#if (<= n 1) (#return n))
    (#return (+ (fib2 (- n 1)) (fib3 (- n 2))))
)

(#func_def fib2 ((n int)) int
    (#if (<= n 1) (#return n))
    (#return (+ (fib2 (- n 1)) (fib (- n 2))))
)

(#func_def maybe_int ((x int)) type
    (#return (#if (== x 42) int str))
)

(#func_def main ((x int) (y int)) (maybe_int 42) 
    (#return (+ x (fib y)))
)
`.trim()

main()
