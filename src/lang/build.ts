import { format } from "../util/format.ts";
import type { ExprNode, FileNode, FuncNode, ParamNode, StatmentNode, StructNode, TypeNode } from "./parse.ts";
import { build_module_types, check, IntType, Types } from "./types.ts";

// TYPES

export interface Prog {
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
    id = 0
    structs: Struct[]
    global: Types
    locals: Types
    blocks: Op[][] = []

    constructor(structs: Struct[], global: Types) {
        this.structs = structs
        this.global = global
        this.locals = new Map()
    }

    new_local(type: TypeNode, name: string="v" + String(this.id++)) {
        this.locals.set(name, type)
        return name
    }

    get_type(value: Typeable): TypeNode {
        if (typeof value == "number") {
            return IntType
        } else if (typeof value == "object" && value.kind === "TYPE_NODE") {
            return value
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

    new_block() {
        return this.blocks.push([]) - 1
    }

    push(block: number | [number], op: Op) {
        if (typeof block == "number") {
            this.blocks[block].push(op)
        } else {
            this.blocks[block[0]].push(op)
        }
    }
}

function build_expr(
    c: Builder,
    block: [number],
    ast: ExprNode
): string | number {
    if (ast.kind === "IDENT_NODE") {
        return ast.value
    } else if (ast.kind === "NUMBER_NODE") {
        return ast.value
    } else if (ast.kind === "ARRAY_NODE") {
        // init the array
        const name = c.new_local(IntType)
        c.push(block, {
            kind: "CALLFN_OP",
            result: name,
            func: "alloc",
            args: [ast.items.length]
        })

        // add each item
        for (const [i, item] of ast.items.entries()) {
            const v = build_expr(c, block, item)
            c.push(block, {
                kind: "STORE_OP",
                target: name,
                offset: i,
                value: v
            })
        }

        // return the local with the pointer to the array
        return name
    } else if (ast.kind === "OBJECT_NODE") {
        // init the object
        const name = c.new_local(c.get_type(ast))
        c.push(block, {
            kind: "CALLFN_OP",
            result: name,
            func: "alloc",
            args: [c.get_type_size(ast)]
        })

        // add each item
        for (const item of ast.items.values()) {
            const v = build_expr(c, block, item.value)
            c.push(block, {
                kind: "STORE_OP",
                target: name,
                offset: c.get_type_field(ast, item.name!),
                value: v
            })
        }

        // return the local with the pointer to the array
        return name
    } else if (ast.kind === "OP_NODE") {
        // compute the arguments to the op
        const a = build_expr(c, block, ast.a)
        const b = build_expr(c, block, ast.b)

        // do the op
        const name = c.new_local(IntType)
        c.push(block, {
            kind: "CALLFN_OP",
            result: name,
            func: ast.op,
            args: [a, b] 
        })

        // return
        return name
    } else if (ast.kind === "TERNARY_NODE") {
        // the local with the result of the ternary operation
        const name = c.new_local(IntType)

        // the exit block to go to afer we are done
        const new_block = c.new_block()

        // build branch a
        const a = build_block(c, new_block, [{
            kind: "ASSIGNMENT_NODE",
            name: {
                kind: "IDENT_NODE",
                value: name
            },
            value: ast.a
        }])

        // build branch b
        const b = build_block(c, new_block, [{
            kind: "ASSIGNMENT_NODE",
            name: {
                kind: "IDENT_NODE",
                value: name
            },
            value: ast.b
        }])

        // swap between branchs
        c.push(block, {
            kind: "BRANCH_OP",
            cond: build_expr(c, [block[0]], ast.cond),
            a, b
        })
    
        // put the write head into the new block
        block[0] = new_block
    
        // return the local
        return name
    } else if (ast.kind === "CALL_NODE") {

        // make sure the thing we are calling is a function
        if (ast.func.kind != "IDENT_NODE") {
            throw new Error("Can only call ident node!")
        }

        // get the type signature of the function
        const type = c.get_type(ast.func.value)

        // the result of the function call
        const name = c.new_local(type.args[1])

        // call the function
        c.push(block, {
            kind: "CALLFN_OP",
            result: name,
            func: ast.func.value,
            args: ast.args.map(arg => build_expr(c, block, arg))
        })

        // return the result
        return name
    } else if (ast.kind === "INDEX_NODE") {
        // 
        const name = c.new_local(IntType)

        // 
        const value = build_expr(c, block, ast.value)
        const index = build_expr(c, block, ast.index) 

        // 
        if (typeof value == "number") {
            throw new Error("Can not index number!")
        }

        // 
        c.push(block, {
            kind: "LOAD_OP",
            result: name,
            local: value,
            offset: index,
        })

        // return the result
        return name
    } else if (ast.kind === "FIELD_NODE") {
        // 
        const name = c.new_local(IntType)

        // 
        const value = build_expr(c, block, ast.value)

        // 
        if (typeof value == "number") {
            throw new Error("Can not field a number!")
        }

        //
        const index = c.get_type_field(value, ast.field)

        // 
        c.push(block, {
            kind: "LOAD_OP",
            result: name,
            local: value,
            offset: index,
        })

        // return the result
        return name
    } else {
        throw new Error(`Unimplement feature ${ast.kind}!`)
    }
}

function build_block(
    c: Builder,
    after: number,
    ast: StatmentNode[]
) {
    const start_block = c.new_block()
    const block = [start_block] as [number]

    for (const stmt of ast) {
        if (stmt.kind == "WHILE_NODE") {
            const cond_block = c.new_block()
            const after_block = c.new_block()
            const body = build_block(c, cond_block, stmt.body)

            c.push(block, {
                kind: "JUMP_OP",
                jump: cond_block,
            })

            c.push(cond_block, {
                kind: "BRANCH_OP",
                cond: build_expr(c, [cond_block], stmt.cond),
                a: body, b: after_block
            })

            block[0] = after_block
        }

        if (stmt.kind == "ASSIGNMENT_NODE") {
            const value = build_expr(c, block, stmt.value)

            if (stmt.name.kind === "IDENT_NODE") {
                c.push(block, {
                    kind: "ASSIGN_OP",
                    result: c.new_local(c.get_type(value), stmt.name.value),
                    value: value
                })
            } else if (stmt.name.kind === "INDEX_NODE") {
                c.push(block, {
                    kind: "STORE_OP",
                    target: build_expr(c, block, stmt.name.value) as string,
                    offset: build_expr(c, block, stmt.name.index),
                    value: build_expr(c, block, stmt.value)
                })
            } else {
                throw new Error("UNSUPPORED ASSIGNMENT KIND!")
            }            
        }

        if (stmt.kind == "DISCARD_NODE") {
            build_expr(c, block, stmt.value)
        }

        if (stmt.kind == "IF_NODE") {
            const new_block = c.new_block()

            const a = build_block(c, new_block, stmt.a)
            const b = build_block(c, new_block, stmt.b)

            c.push(block, {
                kind: "BRANCH_OP",
                cond: build_expr(c, block, stmt.cond),
                a, b
            })

            block[0] = new_block
        }

        if (stmt.kind == "RETURN_NODE") {
            const value = build_expr(c, block, stmt.value)

            c.push(block, {
                kind: "RETURN_OP",
                value: value,
            })

            return start_block
        }
    }

    c.push(block, {
        kind: "JUMP_OP",
        jump: after
    })

    return start_block
}

function build_fn(ast: FuncNode, structs: Struct[], global: Types): Fn {
    const b = new Builder(structs, global)

    for (const param of ast.params) {
        b.locals.set(param.name, param.type)
    }

    for (const [key, type] of check(global, ast)) {
        b.locals.set(key, type)
    }

    build_block(b, Number.POSITIVE_INFINITY, ast.body)
    
    return {
        name: ast.name,
        params: ast.params,
        blocks: b.blocks,
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

export function build(file: FileNode): Prog {
    const global = build_module_types(file)

    const structs = file
        .filter(node => node.kind == "STRUCT_NODE")
        .map(struct_node => build_struct(struct_node))

    const fns = file
        .filter(node => node.kind == "FUNC_NODE")
        .map(func_node => build_fn(func_node, structs, global))

    return { fns, structs }
}
