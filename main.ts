import { AstLeaf, AstNode, error_handler, is_ast_leaf, parse, err } from "./lib/parse.ts";

type Type = (
    | ((c: Context, args: AstNode[], area: AstNode) => Type)
    | string
)

type Atom = (
    | { type: "type", value: Type   }
    | { type: "int" , value: number }
    | { type: "func", value: (c: Context, ...args: AstNode[]) => Atom }
    | { type: "bool", value: boolean }
)

function as<T extends Atom["type"], R = Extract<Atom, { type: T }>["value"]>(type: T, atom: Atom): R {
    if (atom.type === type) return atom.value as R
    throw new Error(`expected ${type}, got ${atom.type}`)
}

const dont_call_me = ((_c: Context, _a: AstNode[], b: AstNode) => err("don't call me", b))

class Context {
    types = new Map<string, Type>()
    atoms = new Map<string, Atom>()

    parent : Context | undefined

    constructor(parent?: Context) {
        this.parent = parent
    }

    get(ident: AstLeaf): Atom {
        if (ident.text.match(/^[\d]+$/g)) {
            return {
                type: "int",
                value: Number(ident.text)
            }
        }

        return (
            this.atoms.get(ident.text) ??
            this.parent?.get(ident) ??
            err(`undefinded variable`, ident)
        )
    }

    set(ident: AstLeaf | string, atom: Atom): void {
        if (typeof ident !== "string") return this.set(ident.text, atom)
        this.atoms.set(ident, atom)
        this.types.set(ident, atom.type)
    }

    get_type(ident: AstLeaf): Type {
        if (ident.text.match(/^[\d]+$/g)) {
            return "int"
        }

        return (
            this.types.get(ident.text) ??
            this.parent?.get_type(ident) ??
            err(`undefinded variable`, ident)
        )
    }

    set_type(ident: AstLeaf | string, type: Type) {
        if (typeof ident === "string") this.types.set(ident, type)
        else this.types.set(ident.text, type)
    }
}

function assert_type_eq(_c: Context, a: Type, b: Type, area: AstNode, message=`${a} != ${b}`) {
    if (a != b) err(message, area)
    return a
}

function exec(c: Context, n: AstNode): Atom {
    if (is_ast_leaf(n)) {
        return c.get(n)
    } else {
        const [func, ...args] = n
        const result = exec(c, func)
        if (result.type != "func") err("don't call me", n)
        return result.value(c, ...args)
    }
}

function as_type(atom: Atom, area: AstNode) {
    if (atom.type === "type") return atom.value
    err(`expected a type, got ${JSON.stringify(atom)}`, area)
}

function create_module_context() {
    const c = new Context()

    for (const op of ["+", "-"]) {
        c.set(op, { type: "func", value: (ctx, ...args) => {
            const a = exec(ctx, args[0]).value
            const b = exec(ctx, args[1]).value

            return {
                type: "int",
                value: eval(`${a} ${op} ${b}`) as number,
            }
        } })
        c.set_type(op, (c, args, area) => {
            if (args.length != 2) err("invalid num params", area)

            const a = $check(c, args[0])
            const b = $check(c, args[1])

            return assert_type_eq(c, a, b, area)
        })
    }

    for (const op of ["<=", "==", ">=", "!="]) {
        c.set(op, { type: "func", value: (ctx, ...args) => {
            const a = exec(ctx, args[0]).value
            const b = exec(ctx, args[1]).value

            return {
                type: "bool",
                value: eval(`${a} ${op} ${b}`) as boolean,
            }
        } })
        c.set_type(op, (c, args, area) => {
            if (args.length != 2) err("invalid num params", area)
            
            const a = $check(c, args[0])
            const b = $check(c, args[1])

            assert_type_eq(c, a, b, area)

            return "bool"
        })
    }

    c.set_type("#type_def", (c, type_def) => {
        if (!is_ast_leaf(type_def[0])) err("invalid type name", type_def)
        c.set(type_def[0], {
            type: "type",
            value: type_def[0].text
        })
        return type_def[0].text
    })
    
    c.set_type("#func_def", (c, func_def, a) => {
        const func_ctx = new Context(c)

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
            $check(func_ctx, type)
            func_ctx.set_type(name, as("type", exec(c, type)))
            return { name, type: func_ctx.get_type(name) }
        })

        $check(func_ctx, return_type_expr)

        const return_type = as_type(exec(c, return_type_expr), return_type_expr)

        func_ctx.set_type("#return", (c, args, area) => {
            if (args.length !== 1) err("== 1 return value", area)
            assert_type_eq(c, return_type, $check(c, args[0]), area, "incorrect return type")
            return dont_call_me
        })

        c.set(name, { type: "func", value: (c, ...args) => {
            const exec_ctx = new Context(c)

            exec_ctx.set("#return", { type: "func", value: (c, a) => {
                throw new Error("RETURN", { cause: exec(c, a) })
            } })

            args.forEach((arg, i) => {
                const atom = exec(c, arg)
                assert_type_eq(c, params[i].type, atom.type, arg)
                exec_ctx.set(params[i].name, atom)
            })

            try {
                body.forEach(expr => exec(exec_ctx, expr))
            } catch (e) {
                const error = e as Error

                if (error.message === "RETURN") {
                    return error.cause as Atom
                }

                throw error
            }

            err("didn't return anything", a)
        } })

        c.set_type(name, (c, args, area) => {
            if (args.length !== params.length) err("wrong number of args", area)
            // TODO: make sure they are the same!
            args.forEach(arg => $check(c, arg))
            return return_type
        })

        for (const expr of body) {
            $check(func_ctx, expr)
        }

        return "function"
    })

    c.set("#if", { type: "func", value: (ctx, c, a, b) => {
        if (as("bool", exec(ctx, c))) {
            return exec(ctx, a)
        } else {
            return exec(ctx, b)
        }
    } })
    c.set_type("#if", (c, if_def, area) => {
        if (![2, 3].includes(if_def.length)) err("2 | 3 if values", area)

        assert_type_eq(c, $check(c, if_def[0]), "bool", if_def[0])

        if (if_def[2] != undefined) { 
            const a = $check(c, if_def[1])
            const b = $check(c, if_def[2])
            return assert_type_eq(c, a, b, area)
        } else {
            return $check(c, if_def[1])
        }
    })

    return c
}

function main() {
    try {
        const src = SOURCE
        const ast = parse(src)
        const _mod = check(ast)
        console.log("\n√ all systems green\n")
    } catch (e) {
        error_handler(e as Error)
    }
}

function check(ast: AstNode[]) {
    const c = create_module_context()
    ast.forEach(n => $check(c, n))
    return c
}

function $check(c: Context, n: AstNode): Type {
    if (is_ast_leaf(n)) {
        return c.get_type(n)
    } else {
        const [func, ...args] = n
        const result = $check(c, func)
        if (typeof result != "function") err("don't call me", n)
        return result(c, args, n)
    }
}

const SOURCE = `
(#type_def int)
(#type_def str)
(#type_def type)

(#func_def fib ((n int)) int
    (#if (<= n 1) (#return n))
    (#return (+ (fib (- n 1)) (fib (- n 2))))
)

(#func_def maybe_int ((x int)) type
    (#return (#if (== x 42) int str))
)

(#func_def main ((x int) (y int)) (maybe_int 42) 
    (#return (+ x (fib y)))
)
`.trim()

main()
