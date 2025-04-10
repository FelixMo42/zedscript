import { format, log_types } from "../util/format.ts";
import { FuncSSA, Module, StatmentSSA } from "./lower.ts";
import { global_types } from "./lib.ts";
import { ExprNode, StatmentNode, TypeNode } from "./parse.ts";

/// Common

export type Types = Map<string | ExprNode, TypeNode>

export const IntType: TypeNode = Type("int")
export const VoidType: TypeNode = Type("void")
export const BoolType: TypeNode = Type("bool")

export function Type(name: string, ...args: TypeNode[]): TypeNode {
    if (typeof name === "object") {
        return name
    }

    return { kind: "TYPE_NODE", name, args }
}

function eq(a: object, b: object) {
    return JSON.stringify(a) === JSON.stringify(b)
}

/// Global

export function build_module_types(file: Module): Types {
    const types = new Map<string, TypeNode>()

    for (const [name, type] of global_types) {
        types.set(name, type)
    }

    file.items.forEach((n) => {
        if (n.kind === "FUNC_SSA") {
            types.set(n.name, Type("Fn",
                Type("Tuple", ...n.params.map((p) => p.type)),
                n.return,
            ))
        } else if (n.kind === "STRUCT_NODE") {
            types.set(n.name, Type("@struct",
                ...n.fields.values().map(field =>
                    Type(field.name, field.type)
                )
            ))

            for (const f of n.fields.values()) {
                types.set(`${n.name}::${f.name}`, f.type)
            }
        } else {
            throw new Error("Unsupported top level node!")
        }
    })

    return types
}

/// Locals

interface Ctx {
    unknowns: number
    func: FuncSSA
    tmap: Types
}


function newUnknow(c: Ctx) {
    return Type(`Unknown::${c.unknowns++}`)
}

export function isUnknow(t: TypeNode) {
    return t.name.startsWith("Unknown::")
}

function set_type(c: Ctx, n: ExprNode | StatmentNode | TypeNode, t: TypeNode) {
    if (n.kind === "TYPE_NODE") {
        if (isUnknow(n)) {
            c.tmap.set(format(n), t)
        }
        
        if (isUnknow(t)) {
            c.tmap.set(format(t), n)
        }

        if (!isUnknow(n) && !isUnknow(t)) {
            if (!eq(n, t)) {
                throw new Error("Type missmatch!")
            }
        }
    } else if (n.kind === "NUMBER_NODE") {
        if (!eq(t, IntType)) {
            throw new Error("Type missmatch!")
        }
    } else if (n.kind === "IDENT_NODE") {
        const type = c.tmap.get(n.value)

        if (!type) {
            c.tmap.set(n.value, t)
            return
        } else if (isUnknow(type)) {
            c.tmap.set(format(type), t)
        } else if (!eq(type, t)) {
            throw new Error(`Type missmatch: ${format(t)} != ${format(type)}`)
        }
    } else if (n.kind === "CALL_NODE") {
        const type_signature = get_type(c, n.func)

        if (type_signature.name != "Fn" && type_signature.args.length !== 2) {
            throw new Error("Uncallable!")
        }

        if (!eq(t, type_signature.args[1])) {
            throw new Error(`Type missmatch: ${format(t)} != ${format(type_signature.args[1])}`)
        }
    } else if (n.kind === "OBJECT_NODE") {
        c.tmap.set(n, t)
    } else if (n.kind === "OP_NODE") {
        // this is waiting for an ssa refactor
    } else if (n.kind === "FIELD_NODE") {
        // todo: type check!
    } else if (n.kind === "TERNARY_NODE") {
        // blah
    } else if (n.kind === "ARRAY_NODE") {
        // todo: array types!
        // this is gonna involve abstruct types
    } else {
        throw new Error(`set_type::implement::${n.kind}`)
    }
}

function get_type(c: Ctx, n: ExprNode | StatmentSSA | undefined, e?: TypeNode): TypeNode {
    if (n == undefined) return newUnknow(c)

    if (n.kind === "NUMBER_NODE") {
        return IntType
    } else if (n.kind === "IDENT_NODE") {
        if (c.tmap.has(n.value)) {
            return c.tmap.get(n.value)!
        }

        if (e) {
            c.tmap.set(n.value, e)
            return e
        } else {
            const t = newUnknow(c)
            c.tmap.set(n.value, t)
            return t
        }     

    } else if (n.kind === "ASSIGNMENT_NODE") {
        const a = get_type(c, n.value)
        const b = get_type(c, n.name, a)

        if (isUnknow(a) && !isUnknow(b)) {
            set_type(c, a, b)
        }

        return a
    } else if (n.kind === "OBJECT_NODE") {
        if (c.tmap.has(n)) {
            return c.tmap.get(n)!
        }

        if (e) {
            c.tmap.set(n, e)
            return e
        } else {
            const t = newUnknow(c)
            set_type(c, n, t)
            return t
        }
    } else if (n.kind === "RETURN_NODE") {
        if (c.func.return) {
            set_type(c, n.value, c.func.return)
            get_type(c, n.value)
            return c.func.return
        } else {
            return get_type(c, n.value)
        }
    } else if (n.kind === "CALL_NODE") {
        const type_signature = get_type(c, n.func)

        if (type_signature.name != "Fn" && type_signature.args.length !== 2) {
            throw new Error("Uncallable!")
        }

        for (let i = 0; i < n.args.length; i++) {
            set_type(c, n.args[i], type_signature.args[0].args[i])
        }

        return type_signature.args[1]
    } else if (n.kind === "OP_NODE") {
        const type_signature = c.tmap.get(n.op)!

        if (type_signature.name != "Fn" && type_signature.args.length !== 2) {
            throw new Error("Uncallable!")
        }

        return type_signature.args[1]
    } else if (n.kind === "FIELD_NODE") {
        const a = get_type(c, n.value)
        return c.tmap.get(`${a.name}::${n.field}`)!
    } else if (n.kind === "TERNARY_NODE") {
        const b = get_type(c, n.b, e)
        return get_type(c, n.a, b)
    } else if (n.kind === "ARRAY_NODE") {
        const item_type = get_type(c, n.items[0])

        for (const item of n.items.slice(1)) {
            set_type(c, item, item_type)
        }

        return Type("array", item_type)
    } else if (n.kind === "JUMP_OP") {
        return VoidType
    } else if (n.kind === "BRANCH_SSA") {
        return VoidType
    } else if (n.kind === "INDEX_NODE") {
        return get_type(c, n.value).args[0]
    } else {
        throw new Error("?????: " + n.kind)
    }
}

function collapseUnknowns(t: Types) {
    for (let [key, value] of t.entries()) {
        while (isUnknow(value)) {
            const temp = t.get(format(value))

            if (!temp) {
                log_types(t)
                throw new Error(`Unknown type for ${format(key)}!`)
            }

            value = temp
        }

        t.set(key, value)
    }
}

export function check(globals: Types, func: FuncSSA) {
    const ctx: Ctx = {
        unknowns: 0,
        func,
        tmap: new Map()
    }

    for (const [name, value] of globals) {
        ctx.tmap.set(name, value)
    }

    for (const c of func.params) {
        ctx.tmap.set(c.name, c.type)
    }

    for (const block of func.blocks) {
        for (const stmt of block) {
            get_type(ctx, stmt)
        }
    }

    collapseUnknowns(ctx.tmap)

    return ctx.tmap
}
