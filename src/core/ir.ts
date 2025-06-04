import { Block } from "@src/core/graph.ts";
import { toJS } from "@src/backends/js/index.ts";
import { stackify } from "@src/core/stackifier.ts";
import { FileNode } from "@out/types.ts";
import { remove_unused_vars } from "@src/core/remove_unused_vars.ts";

export type Expr = Expr[] | string | number

export class FuncDef {
    name: string
    params: string[]
    body: Block

    constructor(name: string, params: string[], body: Block) {
        this.name = name
        this.params = params
        this.body = body
    }

    toJS() {
        let body = stackify(this.body)
            body = remove_unused_vars(body)

        return toJS(["@def", this.name, this.params, body])
    }
}

export function build(ast: FileNode): Expr[] {
    return ast
        .items
        .filter(item => item.kind === "FUNC_NODE")
        .map((func) => ["@def", func.name,
            func.params.map(param => param.name),
            func.body.map(buildStatment)
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
        return ["@while", buildExpr(s.cond), s.body.map(buildStatment)]
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
