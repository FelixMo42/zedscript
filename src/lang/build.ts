import { format } from "../util/format.ts";
import { FuncSSA, Module } from "./lower.ts";
import type { ExprNode, ParamNode, StructNode, TypeNode } from "./parse.ts";
import { build_module_types, check, IntType, Types } from "./types.ts";

// TYPES

export interface Prog {
    kind: "PROG"
    structs: Struct[]
    fns: Fn[]
}

export interface Struct {
    name: string
    fields: {
        name: string
        type: TypeNode
    }[]
}

export interface Fn {
    kind: "FN"
    name: string
    blocks: Op[][]
    params: ParamNode[]
}

export type Op = {
    kind: "CALLFN_OP"
    result: string
    func: string
    args: (string | number)[]
} | {
    kind: "LOAD_OP"
    result: string
    local: string
    offset: string | number
} | {
    kind: "STORE_OP"
    target: string
    offset: string | number
    value: string | number
} | {
    kind: "ASSIGN_OP"
    result: string
    value: string | number
} | {
    kind: "RETURN_OP"
    value: (string | number)
} | {
    kind: "BRANCH_OP"
    cond: (string | number)
    a: number
    b: number
} | {
    kind: "JUMP_OP"
    jump: number
}

// BUILDER

type Typeable = string | number | ExprNode | TypeNode

class Builder {
    structs: Struct[]
    global: Types
    locals: Types

    constructor(structs: Struct[], global: Types) {
        this.structs = structs
        this.global = global
        this.locals = new Map()
    }

    get_type(value: Typeable): TypeNode {
        if (typeof value == "number") {
            return IntType
        } else if (typeof value == "object" && value.kind === "TYPE_NODE") {
            return value
        } else if (typeof value == "object" && value.kind === "IDENT_NODE") {
            return this.get_type(value.value)
        } else {
            return this.locals.get(value) ?? this.global.get(value)!
        }
    }

    get_type_field(value: Typeable, name: string): number {
        const type = this.get_type(value)
        const struct = this.structs.find(s => s.name === type.name)

        if (!struct) {
            throw new Error(`Can't find struct ${format(type)}`)
        }

        let index = 0
        for (const field of struct.fields) {
            if (field.name == name) break
            index += this.get_type_size(field.type)
        }
    
        return index
    }

    get_type_size(type: Typeable): number {
        if (type === undefined) {
            throw new Error("Can't get type size of undefined!")
        }

        if (typeof type == "number") {
            return 1
        }

        if (typeof type != "object" || type.kind != "TYPE_NODE") {
            const k = this.locals.get(type)!

            if (!k) {
                throw new Error(`Failed to get type of ${format(type)}!`)
            }

            return this.get_type_size(k)
        }

        if (type.name === "int") {
            return 1
        }

        const struct = this.structs.find(s => s.name === type.name)
        if (struct) {
            let size = 0
            for (const field of struct.fields) {
                size += this.get_type_size(field.type)
            }
            return size
        }

        throw new Error(`Can't get size of ${format(type)}!`)
    }
}

function build_expr(expr: ExprNode): string | number {
    if (expr.kind === "NUMBER_NODE") {
        return expr.value
    } else if (expr.kind === "IDENT_NODE") {
        return expr.value
    } else {
        throw new Error(`build_expr2::unsupported::${expr.kind}`)
    }
}

function build_fn(ast: FuncSSA, structs: Struct[], global: Types): Fn {
    const c = new Builder(structs, global)

    for (const param of ast.params) {
        c.locals.set(param.name, param.type)
    }

    for (const [key, type] of check(global, ast)) {
        c.locals.set(key, type)
    }

    const blocks: Op[][] = ast.blocks.map(block =>
        block.flatMap((stmt): Op[] => {
            if (stmt.kind === "JUMP_OP") {
                return [stmt]
            } else if (stmt.kind === "BRANCH_SSA") {
                return [{
                    kind: "BRANCH_OP",
                    cond: build_expr(stmt.cond),
                    a: stmt.a, b: stmt.b
                }]
            } else if (stmt.kind === "ASSIGNMENT_NODE") {
                if (stmt.name.kind === "IDENT_NODE") {
                    if (stmt.value.kind === "CALL_NODE") {
                        if (stmt.value.func.kind != "IDENT_NODE") {
                            throw new Error(`can't call ${stmt.value.func.kind}!`)
                        }
        
                        return [{
                            kind: "CALLFN_OP",
                            func: stmt.value.func.value,
                            result: stmt.name.value,
                            args: stmt.value.args.map(build_expr)
                        }]
                    } else if (stmt.value.kind == "ARRAY_NODE") {
                        const local = stmt.name.value
                        return [{
                            kind: "CALLFN_OP",
                            func: "alloc",
                            result: local,
                            args: [ stmt.value.items.length ]
                        }, ...stmt.value.items.map((item, i): Op => ({
                            kind: "STORE_OP",
                            target: local,
                            offset: i,
                            value: build_expr(item)
                        }))]
                    } else if (stmt.value.kind == "OBJECT_NODE") {
                        const local = stmt.name.value
                        return [{
                            kind: "CALLFN_OP",
                            func: "alloc",
                            result: local,
                            args: [ c.get_type_size(stmt.value) ]
                        }, ...stmt.value.items.map(item => ({
                            kind: "STORE_OP",
                            target: local,
                            offset: c.get_type_field(stmt.value, item.name!),
                            value: build_expr(item.value)
                        }) as Op)]
                    } else if (stmt.value.kind == "INDEX_NODE") {
                        return [{
                            kind: "LOAD_OP",
                            result: stmt.name.value,
                            local: build_expr(stmt.value.value) as string,
                            offset: build_expr(stmt.value.index)
                        }]
                    } else if (stmt.value.kind == "FIELD_NODE") {
                        return [{
                            kind: "LOAD_OP",
                            result: stmt.name.value,
                            local: build_expr(stmt.value.value) as string,
                            offset: c.get_type_field(stmt.value.value, stmt.value.field)
                        }]
                    } else {
                        return [{
                            kind: "ASSIGN_OP",
                            result: stmt.name.value,
                            value: build_expr(stmt.value)
                        }]
                    }
                } else if (stmt.name.kind === "INDEX_NODE") {
                    return [{
                        kind: "STORE_OP",
                        target: build_expr(stmt.name.value) as string,
                        offset: build_expr(stmt.name.index),
                        value: build_expr(stmt.value)
                    }]
                } else {
                    throw new Error("UNSUPPORED ASSIGNMENT KIND!")
                }
            } else if (stmt.kind == "RETURN_NODE") {
                return [{
                    kind: "RETURN_OP",
                    value: build_expr(stmt.value)
                }]
            } else {
                throw new Error("unreachable")
            }
        })
    )
    
    return {
        kind: "FN",
        name: ast.name,
        params: ast.params,
        blocks: blocks,
    }
}

function build_struct(ast: StructNode): Struct {
    return {
        name: ast.name,
        fields: ast.fields.map((field) => ({
            name: field.name,
            type: field.type
        }))
    }
}

export function build(file: Module): Prog {
    const global = build_module_types(file)

    const structs = file.items
        .filter(node => node.kind == "STRUCT_NODE")
        .map(struct_node => build_struct(struct_node))

    const fns = file.items
        .filter(node => node.kind == "FUNC_SSA")
        .map(func_node => build_fn(func_node, structs, global))

    return { kind: "PROG", fns, structs }
}
