import assert from "node:assert";
import { readFile } from "node:fs/promises";
import { assert_is_number, assert_type_eq, bool, const_types, f32, f64, format_type, i32, i64, is_imaginary, none, size_of, str, type, Type, type_of, type_to_wasm, unknown } from "./types.ts";
import { e } from "./parser.ts";
import { isDeepStrictEqual } from "node:util";

export type Expr = string | Value | Expr[]

interface Builtin {
    name        : string
    return_type : ((args: Type[]) => Type)
    body        : (f: FuncInstance, a: Expr[], t: Type[]) => string
}

class StdLib {
    funcs   = new Map<string, Builtin>()
    globals = new Map<string, {
        name: string,
        type: Type,
        value: string,
    }>()

    fn(
        name: string,
        return_type: Type | ((args: Type[]) => Type),
        body: (f: FuncInstance, a: Expr[], t: Type[]) => string,
    ) {
        this.funcs.set(name, {
            name,
            return_type: (typeof return_type === "function")
                ? return_type
                : () => return_type,
            body
        }) 
        return this
    }

    g(
        name: string,
        type: Type,
        value: string,
    ) {
        this.globals.set(name, {
            name, type, value
        }) 
        return this
    }
}

const std = new StdLib()

function opt([a, b]: Type[]) {
    assert_type_eq(a, b, `Attempting to do ops ${JSON.stringify(a)} & ${JSON.stringify(b)}!`)
    assert_is_number(a, `You can only do ops on numbers, not ${a.kind}!`)
    return a
}

function op(code: string) {
    return (f: FuncInstance, a: Expr[], t: Type[]) => {
        if (code.includes(".")) return `${to_wat_args(f, a)} ${code}`
        return `${to_wat_args(f, a)} ${type_to_wasm(t[0])}.${code}`
    }
}

std
.fn("@block", (params) => {
    for (const param of params) {
        assert_type_eq(param, none, "!!!")
    }
    return none
}, (f, a) => `${to_wat_args(f, a)}`)

.fn("+", opt, op(`add`))
.fn("-", opt, op(`sub`))
.fn("*", opt, op(`mul`))
.fn("/", opt, op(`div`))

.fn("floor", f64, (f, a) => `${to_wat_args(f, a)} f64.floor`)
.fn("sqrt", ([t]) => t, op("sqrt"))

.fn("i32.trunc_f64_s", i32, op("i32.trunc_f64_s"))
.fn("i32.store", none, (f, a) => `${to_wat_args(f, a)} i32.store`)
.fn("i32.load", i32, (f, a) => `${to_wat_args(f, a)} i32.load`)
.fn("f64.store", none, (f, a) => `${to_wat_args(f, a)} f64.store`)
.fn("f64.load", f64, (f, a) => `${to_wat_args(f, a)} f64.load`)

.fn("==", bool, (f, a) => `${to_wat_args(f, a)} f64.eq`)
.fn(">=", bool, (f, a) => `${to_wat_args(f, a)} f64.ge`)
.fn("<=", bool, (f, a) => `${to_wat_args(f, a)} f64.le`)
.fn("!=", bool, (f, a) => `${to_wat_args(f, a)} f64.ne`)

.fn("=", none, (f, a) => {
    if (typeof a[0] === "string" && f.locals.has(a[0])) {
        return `${to_wat_args(f, a.slice(1))} local.set $${a[0]}`
    }

    if (Array.isArray(a[0])) {
        const struct = get_type(f, a[0][0])
        const field = a[0][1]

        assert(typeof field === "object" && !Array.isArray(field) && field.type.kind === "str")
        assert(struct.kind == "struct")

        let target_offset = 0
        for (const [name, type] of Object.entries(struct.fields)) {
            if (name === field.value as string) {
                break
            } else {
                target_offset += size_of(type)
            }
        }

        const ptr = `${to_wat(f, a[0][0])} i32.const ${target_offset} i32.add`
        const value_type = type_to_wasm(struct.fields[field.value as string])

        return `${ptr} ${to_wat(f, a[1])} ${value_type}.store`
    }

    throw new Error(`Can't set ${JSON.stringify(a[0])}!`)
})
.fn("if", ([c, a, b]) => {
    assert_type_eq(c, bool, `If cond must be a bool, got ${c.kind}!`)
    if (b === undefined) {
        assert_type_eq(a, none, "You can not return a value out of an if statment with no else branch!")
    } else {
        assert_type_eq(a, b, "Both branchs of an if loop must return the same type!")
    }

    return a
}, (f, a, t) => `
    ${to_wat(f, a[0])}
    if ${t[1] != none ? `(result ${type_to_wasm(t[1])})` : ""}
        ${to_wat(f, a[1])}
        ${a[2] ? `else ${to_wat(f, a[2])}` : ''}
    end
`)
.fn("loop", none, (f, a) => `
    (block $loop (loop
        ${to_wat_args(f, a)}
    br 0))
`)
.fn("br", none, () => `br $loop`)
.fn("return", none, (f, a) => `${to_wat_args(f, a)} return`)
.fn("print", none, (f, a) => `${to_wat_args(f, a)} call $print`)

.fn("size_of", f64, (_f, _a, t) => {
    assert(t[0].kind === "type")
    return `f64.const ${size_of(t[0].type)}`
})

.fn("struct", (t) => type_of({
    kind: "struct",
    fields: Object.fromEntries(
        group(t, 2).map(([name, type]) => {
            assert(type.kind === "type", "!!!")
            assert(name.kind === "consts" && name.value.type.kind === "str", "!!!")
            return [name.value.value, type.type]
        })
    )
}), () => ``)

.fn("deref", i32, (f, a) => to_wat_args(f, a))
.fn("asref", ([_a, b]) => {
    assert(b.kind === "type", `can't cast to ${JSON.stringify(b)}`)
    return b.type
}, (f, a) => to_wat(f, a[0]))

.g("true" , bool, "i32.const 1")
.g("false", bool, "i32.const 0")

for (const t of const_types) {
    std.g(t.kind, type_of(t), "")
}

function group<T>(arr: T[], size: number): T[][] {
    const groups = []

    for (let i = 0; i < arr.length; i+=size) {
        const group = []
        for (let j = 0; j < size; j++) {
            group.push(arr[i + j])
        }
        groups.push(group)
    }

    return groups
} 

function to_wat_args(f: FuncInstance, args: Expr[]) {
    return args.map(a => to_wat(f, a)).join(" ")
}

function to_wat(f: FuncInstance, expr: Expr): string {
    if (typeof expr === "string") {
        if (f.locals.has(expr)) return `local.get $${expr}`
        if (f.parent.module.const.has(expr)) return ``
        if (std.globals.has(expr)) return std.globals.get(expr)!.value
        throw new Error(`Error with ident ${expr}!`)
    }
    
    if (!Array.isArray(expr)) {
        if (expr.type.kind === "i32") return `i32.const ${expr.value}`
        if (expr.type.kind === "i64") return `i64.const ${expr.value}`
        if (expr.type.kind === "f32") return `f32.const ${expr.value}`
        if (expr.type.kind === "f64") return `f64.const ${expr.value}`
        throw new Error(`Unimplemented value to wasm, ${JSON.stringify(expr)}!`)
    }

    const [func, ...args] = expr

    if (typeof func == "string") {
        if (std.funcs.has(func)) {
            return std.funcs.get(func)!.body(
                f,
                args,
                args.map(arg => get_type(f, arg))
            )
        }

        if (f.parent.module.funcs.has(func)) {
            if (is_imaginary(f.parent.module.funcs.get(func)!.return_type(args
                    .map(arg => get_type(f, arg))))) {
                        return to_wat_args(f, args)
                    }

            const call = [
                func,
                ...args
                    .map(arg => get_type(f, arg))
                    .map(type => {
                        if (type.kind === "consts") return type.value.type
                        return type
                    })
                    .map(format_type)
            ].join(":")

            return `${to_wat_args(f, args)} call $${call}`
        }
    }

    const func_type = get_type(f, func)

    if (func_type.kind === "struct") {
        const [field] = args

        assert(typeof field === "object" && !Array.isArray(field) && field.type.kind === "str")

        let target_offset = 0
        
        for (const [name, type] of Object.entries(func_type.fields)) {
            if (name === field.value as string) {
                break
            } else {
                target_offset += size_of(type)
            }
        }

        const ptr = `${to_wat(f, func)} i32.const ${target_offset} i32.add`

        const value_type = type_to_wasm(func_type.fields[field.value as string])

        return `${ptr} ${value_type}.load`
    }

    throw new Error(`Can't call ${e}!`)
}

function get_type(f: FuncInstance, e: Expr): Type {    
    assert(e !== undefined, "!!!")

    if (typeof e === "string") {
        if (f.locals.has(e)) {
            return f.locals.get(e)!
        } else if (f.parent.module.const.has(e)) {
            return type_of(f.parent.module.const.get(e)!)
        } else if (std.globals.has(e)) {
            return std.globals.get(e)!.type
        } else {
            throw new Error(`Unresolved ident ${e}!`)   
        }
    }
    if (!Array.isArray(e)) return {
        kind: "consts",
        value: e
    }

    const [func, ...args] = e

    if (typeof func == "string") {
        if (f.parent.module.funcs.has(func)) {
            return f.parent.module.funcs.get(func)!.return_type(args.map(a => get_type(f, a)))
        }

        if (std.funcs.has(func)) {
            return std.funcs.get(func)!.return_type(args.map(a => get_type(f, a)))
        }
    }

    const obj = get_type(f, func)

    if (obj.kind === "struct") {
        const [field] = args
        assert(typeof field === "object" && !Array.isArray(field) && field.type.kind === "str")
        return obj.fields[field.value as string]
    }

    throw new Error(`Can't figure out type for ${e}`)
}

function get_locals(f: FuncInstance, expr=f.parent.body) {
    if (Array.isArray(expr)) {
        if (expr[0] === "=") {
            if (typeof expr[1] !== 'string') {
                assert_type_eq(get_type(f, expr[1]), get_type(f, expr[2]))
                return
            }

            const t = get_type(f, expr[2])

            if (f.locals.has(expr[1])) {
                assert_type_eq(f.locals.get(expr[1])!, t, `You can't reset a variable type! Was ${f.locals.get(expr[1])!.kind}, got ${t.kind}`)
            } else {
                f.locals.set(expr[1], t)
            }
        }

        expr.forEach(c => get_locals(f, c))
    }
}

function get_return_type(f: FuncInstance): Type {
    const types = get_return_types(f).values().toArray()

    if (types.length == 0) return none

    for (const type of types) {
        assert_type_eq(type, types[0], "multiple return types are not supported!")
    }

    return types[0]

    function get_return_types(f: FuncInstance, expr=f.parent.body, return_types=new Set<Type>()) {
        if (Array.isArray(expr) && expr[0] === "return") {
            return_types.add(get_type(f, expr[1]))
        } else if (Array.isArray(expr)) {
            expr.forEach((e) => get_return_types(f, e, return_types))
        }

        return return_types
    }
}

class FuncInstance {
    parent : Func
    params : Type[]
    return = unknown()
    locals = new Map<string, Type>

    constructor(parent: Func, params: Type[]) {
        this.parent = parent
        this.params = params
    }

    init_types() {
        for (let i = 0; i < this.parent.params.length; i++) {
            this.locals.set(this.parent.params[i], this.params[i])
        }

        get_locals(this)

        this.return = get_return_type(this)

        assert_type_eq(get_type(this, this.parent.body), none)
    }

    to_wat(): string {
        if (is_imaginary(this.return)) return ""

        const name = [
            this.parent.name,
            ...this.params.map(format_type)
        ].join(":")

        return `
            (func $${name}
                ${this.parent.params
                    .filter(p => size_of(this.locals.get(p)!) > 0)
                    .map(p => `(param $${p} ${type_to_wasm(this.locals.get(p)!)})`).join("")
                }
                
                ${this.return == none ? "" :
                    `(result ${type_to_wasm(this.return)})`
                }

                ${this.locals
                    .entries()
                    .filter(([name]) => !this.parent.params.includes(name))
                    .map(([name, type]) => `(local $${name} ${type_to_wasm(type)})`)
                    .toArray()
                    .join("")
                }

                ${to_wat(this, this.parent.body)}
            )
            (export "${name}" (func $${name}))
        `
    }
}

class Func {
    name     : string
    params   : string[]
    body     : Expr
    module   : Module
    versions = [] as FuncInstance[]

    constructor(
        name   : string,
        params : string[],
        body   : Expr,
        module : Module,
    ) {
        this.name   = name
        this.params = params
        this.body   = body
        this.module = module
    }

    return_type(args: Type[]) {
        args = args.map((type) => {
            if (type.kind === "consts") return type.value.type
            return type
        })

        assert(args.length === this.params.length, "Wrong number of arguments!")
    
        for (const version of this.versions) {
            if (version.params.every((t, i) => isDeepStrictEqual(t, args[i]))) {
                return version.return
            }
        }

        const version = new FuncInstance(this, args)
        this.versions.push(version)
        version.init_types()
        return version.return
    }

    to_wat(): string {
        return this.versions.map(version => version.to_wat()).join("")
    }
}

export type Value = (
    | { type: type, value: Type }
    | { type: typeof i32, value: number }
    | { type: typeof i64, value: number }
    | { type: typeof f32, value: number }
    | { type: typeof f64, value: number }
    | { type: typeof str, value: string }
)

function exect(expr: Expr): Value {
    if (typeof expr === "string") {
        if (std.globals.has(expr)) return {
            type: type_of(std.globals.get(expr)!.type),
            value: std.globals.get(expr)!.type
        }
    }

    throw new Error("OP not supported in VM!")
}

class Module {
    funcs  = new Map<string, Func>()
    const = new Map<string, Type>()

    add_func(decl: Expr[]) {
        const [ name, params, ...body ] = decl

        if (typeof name != "string") throw new Error("???")
        if (!Array.isArray(params)) throw new Error("???")

        this.funcs.set(name, new Func(
            name,
            params.map(name => {
                if (typeof name != "string") throw new Error(`That's not a variable name, thats a ${JSON.stringify(name)}!`)
                return name
            }),
            ["@block", ...body],
            this
        ))
    }

    add_struct(decl: Expr[]) {
        const [ name, ...items ] = decl
        assert(typeof name === "string", "!!!")

        const fields = {} as { [key: string]: Type }

        for (let i = 0; i < items.length; i+=2) {
            const name = items[i]
            const type = exect(items[i + 1])

            assert(typeof name === "object" && !Array.isArray(name) && name.type.kind === "str")
            assert(type.type.kind === "type", `field must be a type, not ${type.type.kind}!`)

            fields[name.value as string] = (type.value as type).type
        }

        this.const.set(name, { kind: "struct", fields })
    }

    add_file(s: string) {
        const parts = e(s)

        for (const part of parts) {
            if (!Array.isArray(part)) throw new Error("???")
            const [sig, ...decl] = part

            if (sig === "fn") this.add_func(decl)
            if (sig === "def") this.add_struct(decl)
        }

        return this
    }

    to_wat() {
        this.funcs.forEach(func => {
            if (func.params.length === 0) {
                func.return_type([])
            }
        })

        return `(module
            (import "env" "print" (func $print (param f64)))
            (memory (export "memory") 1)

            ${this.funcs
                .values()
                .map(func => func.to_wat())
                .toArray()
                .join("")
            }
        )`
    }
}

async function main() {
    const module = new Module()
        .add_file(await readFile("./src/test.zs", "utf-8"))

    console.log(module.to_wat())
}

main()
