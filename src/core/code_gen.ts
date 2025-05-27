export type Type =
    | ["@int"]
    | ["@bool"]
    | ["@string"]
    | ["@fn", [string, Type][], Type]
    | ["@array", Type]
    | ["@struct", [string, Type][]]
    | ["@union", Type[]]
    | [string]

export const TYPES = new Map<string, Type>()

export function is_array(t: Type) {
    return t[0] === "@array"
}

export function as_struct(t: Type): ["@struct", [string, Type][]] {
    if (t[0] == "@struct" && t.length === 2) return t
    return ["@struct", []]
}

export function unwrap_type(t: Type): Type[] {
    if (t[0] === "@array") return [...unwrap_type(t[1]!)]
    if (t[0] === "@union") return t[1]!
    return [t]
}

export function merge(a: Type, b: Type): Type {
    if (is_array(a) || is_array(b)) {
        return ["@array", ["@union", unique([...unwrap_type(a), ...unwrap_type(b)])]]
    } else {
        return ["@union", unique([...unwrap_type(a), ...unwrap_type(b)])]
    }
}

function typeToJS(type: Type): string {
    if (type[0] === "@array") {
        return `Array<${typeToJS(type[1]!)}>`
    } else if (type[0] === "@int") {
        return `number`
    } else if (type[0] === "@bool") {
        return `bool`
    } else if (type[0] === "@string") {
        return `string`
    } else if (type[0] === "@struct") {
        const fields = type[1]!
            .map(([key, val]) => `${key}: ${typeToJS(val)}`)
            .join(",")

        return `{${fields}}`
    } else if (type[0] === "@union") {
        return type[1]!.map(typeToJS).join(" | ")
    } else if (type[0] === "@fn") {
        throw new Error("unimplemented")
    } else {
        return snakeToPascal(type[0])
    }    
}

export function typesToJS(): string {
    return TYPES
        .entries()
        .map(([name, sig] )=> [snakeToPascal(name), typeToJS(sig)])
        .map(([name, sig]) => `export type ${name} = ${sig}`)
        .toArray()
        .join("\n")
}

export function snakeToPascal(snake: string) {
    return snake
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('')
}

export function unique<T>(arr: T[]): T[] {
    return new Set<T>(arr).values().toArray()
}