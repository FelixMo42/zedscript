import { ExprNode, FileNode, StatmentNode } from "@out/types.ts";
import { parse } from "@src/lang/parse.ts";

export type Expr = Expr[] | string | number

function build(ast: FileNode): Expr[] {
    return ast
        .items
        .filter(item => item.kind === "FUNC_NODE")
        .map((func) => ["@def", func.name,
            func.params.map(param => param.name),
            ...func.body.map(buildStatment)
        ])
}

function buildStatment(s: StatmentNode): Expr {
    if (s.kind === "ASSIGNMENT_NODE") {
        return ["@set", buildExpr(s.name), buildExpr(s.value)]
    } else if (s.kind === "RETURN_NODE") {
        return ["@return", buildExpr(s.value)]
    } else if (s.kind === "DISCARD_NODE") {
        return buildExpr(s.value)
    } else if (s.kind === "IF_NODE") {
        return ["@if", buildExpr(s.cond), s.a.map(buildStatment), s.b.map(buildStatment)]
    } else if (s.kind === "WHILE_NODE") {
        return ["@while", buildExpr(s.cond), ...s.body.map(buildStatment)]
    }

    throw new Error("BUILD_STATMENT?!?")
}

function buildExpr(s: ExprNode): Expr {
    if (s.kind === "NUMBER_NODE") {
        return Number(s.value)
    } else if ("op" in s) {
        return [`@${s.op}`, buildExpr(s.a), buildExpr(s.b)]
    } else if (s.kind === "IDENT_NODE") {
        return s.value
    } else if (s.kind === "ARRAY_NODE") {
        return ["@array", ...s.items.map(buildExpr)]
    } else if (s.kind === "CALL_NODE") {
        return [buildExpr(s.func), ...s.args.map(buildExpr)]
    } else if (s.kind === "FIELD_NODE") {
        return ["@field", buildExpr(s.value), s.field]
    } else if (s.kind === "INDEX_NODE") {
        return ["@index", buildExpr(s.value), buildExpr(s.index)]
    } else if (s.kind === "OBJECT_NODE") {
        return ["@struct", ...s.items.map(item => [item.name!, buildExpr(item.value)])]
    } else if (s.kind === "STRING_NODE") {
        return s.value
    } else if (s.kind === "TERNARY_NODE") {
        return ["@ternary", buildExpr(s.cond), buildExpr(s.a), buildExpr(s.b)]
    }

    throw new Error("EXPR_STATMENT?!?: " + JSON.stringify(s, null, 2))
}

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

function getListOfLocals(expr: Expr, locals: string[]=[]): string[] {
    if (!Array.isArray(expr)) return locals

    if (expr[0] == "@set") {
        if (!locals.includes(expr[1] as string)) {
            locals.push(expr[1] as string)
        }
    }

    expr.forEach((part) => getListOfLocals(part, locals))

    if (expr[0] == "@def") {
        locals = locals.filter(local => !(expr[2] as string[]).includes(local))
    }

    return locals
}

export function toJS(expr: Expr): string {
    if (typeof expr === "number") {
        return String(expr)
    } else if (typeof expr === "string") {
        return expr
    }

    const [func, ...params] = expr

    if (func === "@def") {
        return `function ${toJS(params[0])}(${(params[1] as Array<string>).join(", ")}) {${getListOfLocals(expr).map(local => `let ${local};`).join("")}${params.slice(2).map(toJS).join(";")}}`
    } else if (func === "@while") {
        return `while (${toJS(params[0])}) {${params.slice(1).map(toJS).join(";")}}`
    } else if (func === "@if") {
        return `if (${toJS(params[0])}) {${(params[1] as Array<Expr>).map(toJS).join(";")}} else {${(params[2] as Array<Expr>).map(toJS).join(";")}}`
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
        return `{ ${(params as Array<[string, Expr]>).map(([key, val]) => `${key}:${val}`).join(",")} }`
    }

    if (typeof func === "string" && func.startsWith("@")) {
        return `(${toJS(params[0])} ${func.slice(1)} ${toJS(params[1])})`
    }

    return `${toJS(func)}(${params.map(toJS).join(",")})`
}
