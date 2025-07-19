import { isDeepStrictEqual } from "node:util";
import assert from "node:assert";

export const unknown = (): Type => ({ kind: "unknown", opts: [] })

export const none = { kind: "none" } as const
export const bool = { kind: "bool" } as const

export const str = { kind: "str" } as const

export const i32 = { kind: "i32" } as const
export const i64 = { kind: "i64" } as const
export const f32 = { kind: "f32" } as const
export const f64 = { kind: "f64" } as const

export const type_of = (type: Type): type => ({ kind: "type", type })

export type type = { kind: "type", type: Type }

export const const_types = [
    none,
    bool,
    i32,
    i64,
    f64,
]

export type Type = (
    | typeof none
 
    | typeof i32
    | typeof i64
    | typeof f32
    | typeof f64

    | typeof str

    | typeof bool

    | { kind: "unknown", opts: TypeConstraint[] }
    | { kind: "struct", fields: { [key: string]: Type } }
    | type
)

type TypeConstraint = (
    | Type
    | ((t: Type) => boolean)
)

export function is_number(t: Type) {
    return ([
        i32,
        i64,
        f32,
        f64,
    ] as Type[]).includes(t)
}

export function is_imaginary(t: Type) {
    if (t.kind === "none") return true
    if (t.kind === "type") return true
    return false
}

export function size_of(t: Type) {
    if (is_imaginary(t)) return 0

    const wasm = type_to_wasm(t)

    return {
        "i32": 4,
        "i64": 8,
        "f32": 4,
        "f64": 8,
    }[wasm]
}

export function format_type(t: Type): string {
    if (t.kind === "type") return `type<${format_type(t.type)}>`
    if (t.kind === "struct") return `struct<${Object.entries(t.fields).map(([name, type]): string => `${format_type(type)}${name}`).join("::")}>`
    return t.kind
}

export function type_to_wasm(t: Type) {
    if (t == bool) return "i32"
    if (t == i32) return "i32"
    if (t == i64) return "i64"
    if (t == f32) return "f32"
    if (t == f64) return "f64"

    if (t.kind === "struct") return "i32"

    throw new Error(`Unimplemented for ${t.kind}!`)
}

export function assert_is_number(a: Type, message: string="Type is not a number!") {
    if (a.kind === "unknown") a.opts.push(is_number)
    else assert(is_number(a), message)
}

export function assert_type_eq(a: Type, b: Type, message: string="Types not equal!") {
    if (a.kind === "unknown") a.opts.push(b)
    if (b.kind === "unknown") b.opts.push(a) 

    if (a.kind !== "unknown" && b.kind !== "unknown") {
        assert(isDeepStrictEqual(a, b), message)
    }    
}
