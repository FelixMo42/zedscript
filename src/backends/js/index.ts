import { parse } from "@src/lang/parse.ts";
import { build, Expr } from "@src/core/ir.ts";
import { get_locals } from "@src/core/remove_unused_vars.ts";

export function stdlib() {
    return [
        `const max = Math.max`,
        `const sqrt = Math.sqrt`,
    ].join("\n") + "\n"
}

export function exec(src: string, ...params: (string | number)[]) {
    const lisp = build(parse(src))
    const code = stdlib() + lisp.map(toJS).join("\n")
    try {
        const main = eval(code + "main")
        return main(...params)
    } catch (_) {
        console.log(lisp, code)
    }
}

export function toJS(expr: Expr): string {
    if (typeof expr === "number") {
        return String(expr)
    } else if (typeof expr === "string") {
        return expr
    }

    const [func, ...params] = expr

    if (func === "@def") {
        return `function ${toJS(params[0])}(${(params[1] as Array<string>).join(", ")}) {${get_locals(expr).map(local => `let ${local};`).join("")}${params[2].map(toJS).join(";")}}`
    } else if (func === "@string") {
        return `"${params[0]}"`
    } else if (func === "@while") {
        if (params[2]) {
            return `${params[2]}: while (${toJS(params[0])}) {${params[1].map(toJS).join(";")}}`
        } else {
            return `while (${toJS(params[0])}) {${params[1].map(toJS).join(";")}}`
        }
    } else if (func === "@block") {
        if (params[1]) {
            return `${params[1]}: do {${params[0].map(toJS).join(";")}} while (0)`
        } else {
            return `do {${params[0].map(toJS).join(";")}} while (0)`
        }
    } else if (func === "@if") {
        if (params[2] && params[2].length > 0) {
            return `if (${toJS(params[0])}) {${
                (params[1] as Array<Expr>).map(toJS).join(";")
            }} else {${
                (params[2] as Array<Expr>).map(toJS).join(";")
            }}`
        } else {
            return `if (${toJS(params[0])}) {${
                (params[1] as Array<Expr>).map(toJS).join(";")
            }}`
        }
    } else if (func === "@return") {
        return `return ${toJS(params[0])}`
    } else if (func === "@set") {
        return `${toJS(params[0])} = ${toJS(params[1])}`
    } else if (func === "@array") {
        return `[${params.map(toJS).join(",")}]`
    } else if (func === "@field") {
        return `${toJS(params[0])}.${params[1]}`
    }  else if (func === "@index") {
        return `${toJS(params[0])}[${toJS(params[1])}]`
    } else if (func === "@ternary") {
        return `(${toJS(params[0])} ? ${toJS(params[1])} : ${toJS(params[2])})`
    } else if (func === "@struct") {
        return `{ ${(params as Array<[string, Expr]>).map(([key, val]) => `${key}:${toJS(val)}`).join(",")} }`
    } else if (func === "not") {
        return `!${params[0]}`
    }  else if (func === "continue") {
        return `continue ${params[0] ?? ""}`
    }  else if (func === "break") {
        return `break ${params[0] ?? ""}`
    }

    if (typeof func === "string" && func.startsWith("@")) {
        return `(${toJS(params[0])} ${func.slice(1)} ${toJS(params[1])})`
    }

    return `${toJS(func)}(${params.map(toJS).join(",")})`
}
