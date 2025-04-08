import { format } from "../util/format.ts";
import { FuncSSA, Module } from "./lower.ts";
import type { ExprNode, ParamNode, TypeNode } from "./parse.ts";
import { build_module_types, check, IntType, Types } from "./types.ts";

// TYPES

export interface Prog {
    kind: "PROG"
    global: Types
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
    global: Types
    locals: Types

    constructor(global: Types) {
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

        if (type.name != "@struct") {
            // try reslove the struct
            if (this.global.has(type.name)) {
                return this.get_type_field(this.global.get(type.name)!, name)
            }

            // if not, we are a failure in life
            throw new Error(`Can't get ${format(value)}.${name} of type ${format(type)} `)
        }

        // iter the fields to count to the right position
        let index = 0
        for (const field of type.args) {
            if (field.name == name) break
            index += this.get_type_size(field.args[0])
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

        if (type.name == "@struct") {
            let size = 0
            for (const field of type.args) {
                size += this.get_type_size(field.args[0])
            }
            return size
        }

        if (this.global.has(type.name)) {
            return this.get_type_size(this.global.get(type.name)!)
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

function build_fn(func: FuncSSA, global: Types): Fn {
    const c = new Builder(global)

    for (const param of func.params) {
        c.locals.set(param.name, param.type)
    }

    for (const [key, type] of check(global, func)) {
        c.locals.set(key, type)
    }

    const blocks: Op[][] = func.blocks.map(block =>
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
        name: func.name,
        params: func.params,
        blocks: blocks,
    }
}

export function build(file: Module): Prog {
    const global = build_module_types(file)

    const fns = file.items
        .filter(node => node.kind == "FUNC_SSA")
        .map(func_node => build_fn(func_node, global))

    return { kind: "PROG", fns, global }
}
