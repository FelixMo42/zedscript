import { AstLeaf, AstNode, err, is_ast_leaf } from "./parse.ts";

export class Context {
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
            err(`undefinded variable ${ident.text}`, ident)
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
            err(`undefinded variable "${ident.text}"`, ident)
        )
    }

    set_type(ident: AstLeaf | string, type: Type) {
        if (typeof ident === "string") this.types.set(ident, type)
        else this.types.set(ident.text, type)
    }

    check(n: AstNode): Type {
        if (is_ast_leaf(n)) {
            return this.get_type(n)
        } else {
            const [func, ...args] = n
            const result = this.check(func)
            if (typeof result != "function") err("dont call me", n)
            return result(this, args, n)
        }
    }

    exec(n: AstNode): Atom {
        if (is_ast_leaf(n)) {
            return this.get(n)
        } else {
            const [func, ...args] = n
            const result = this.exec(func)
            if (result.type != "func") err("dont call me", n)
            return result.value(this, ...args)
        }
    }
}

export class Module {
    ctx: Context

    constructor(ctx: Context) {
        this.ctx = ctx
    }
}

export function check(ast: AstNode[]) {
    const ctx = new Context()

    // add it core plugins
    op_module(ctx)
    control_flow_module(ctx)

    ctx.set("#fn", atom("func", (_ctx, _args, area) => err("invalid place to define a function", area)))

    // validate function shape
    const defs = ast.map((part) => {
        // unwrap def, and make sure it's the right shape
        if (is_ast_leaf(part)) err("invalid function def", part)
        if (is_ast_leaf(part[1])) err("invalid function def", part)
        if (part[1].length < 3) err(`invalid function def`, part)
        const [name, [_def_type, params_expr, return_type_expr, ...body]] = part

        // validate function name
        if (!is_ast_leaf(name)) err("invalid functon name", name)
        
        // validate params shape
        if (is_ast_leaf(params_expr)) err("invalid function params", params_expr)
        const params = params_expr.map(param => {
            if (is_ast_leaf(param)) err("invalid function param", param)
            if (param.length != 2) err("invalid function param", param)
            const [name, expr] = param

            if (!is_ast_leaf(name)) err("invalid param name", name)
            return { name: name.text, type: "unknown" as Type, expr }
        })

        return {
            name: name.text,
            params,
            return_type: "unknown" as Type,
            return_type_expr,
            body
        }
    })

    // set up runner
    for (const def of defs) {
        ctx.set(def.name, atom("func", (ctx, ...args) => {
            const exec_ctx = new Context(ctx)

            exec_ctx.set("#return", atom("func", (ctx, a) => {
                throw new Error("RETURN", { cause: ctx.exec(a) })
            }))

            args.forEach((arg, i) => {
                const atom = ctx.exec(arg)
                // TODO: validate the params are of the right type?
                exec_ctx.set(def.params[i].name, atom)
            })

            try {
                def.body.forEach(expr => exec_ctx.exec(expr))
            } catch (error) {
                const e = error as Error
                if (e.message === "RETURN") return e.cause as Atom
                else throw e
            }

            err("didn't return anything", def.body)
        }))
    }

    // figure out function types
    for (const def of defs) {
        def.return_type = as("type", ctx.exec(def.return_type_expr))
        
        def.params.map((param) => {
            param.type = as("type", ctx.exec(param.expr))
        })

        ctx.set_type(def.name, (ctx, args, area) => {
            if (args.length !== def.params.length) err("wrong number of args", area)
            args.forEach((arg, i) =>  assert_type_eq(ctx, ctx.check(arg), def.params[i].type, arg))
            return def.return_type
        })
    }

    // validate body types
    for (const def of defs) {
        // create the type context
        const func_ctx = new Context(ctx)

        // add params to it
        def.params.forEach(param =>  func_ctx.set_type(param.name, param.type))

        // set up return keyword for this context
        func_ctx.set_type("#return", (ctx, args, area) => {
            if (args.length !== 1) err("== 1 return value", area)
            assert_type_eq(ctx, ctx.check(args[0]), def.return_type, area)
            return "never"
        })

        // test all the parts
        for (const expr of def.body) {
            func_ctx.check(expr)
        }
    }

    return new Module(ctx)
}

/* TYPES */

export type Type = (
    | ((c: Context, args: AstNode[], area: AstNode) => Type)
    | Atom["type"]
    | "unknown"
    | "never"
)

export type Atom = (
    | { type: "int" , value: number    }
    | { type: "bool", value: boolean   }
    | { type: "type", value: Type      }
    | { type: "code", value: AstNode   }
    | { type: "func", value: AtomFn    }
    | { type: "void", value: undefined }
)

type AtomFn = (c: Context, ...args: AstNode[]) => Atom

export function atom<T extends Atom["type"], V = Extract<Atom, { type: T }>["value"]>(type: T, value: V): Atom {
    return { type, value } as Atom
}

export function as<T extends Atom["type"], V = Extract<Atom, { type: T }>["value"]>(type: T, atom: Atom): V {
    if (atom.type === type) return atom.value as V
    throw new Error(`expected ${type}, got ${atom.type}`)
}

export function assert_type_eq(_c: Context, a: Type, b: Type, area: AstNode, message=`${a} != ${b}`) {
    if (a != b) err(message, area)
    return a
}

/* CORE MODULES */

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
            if (args.length != 2) err("invalid num params", args)
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
        } else if (b != undefined) {
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
