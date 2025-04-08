import { FuncSSA, Module, StatmentSSA } from "../lang/lower.ts";
import { ArgNode, ExprNode, FileNode, FuncNode, ParamNode, StatmentNode, TypeNode, StructNode } from "../lang/parse.ts";
import { Op, Prog, Fn } from "../lang/build.ts"

type Formatable
    = string
    | undefined
    | TypeNode
    | FuncNode
    | ParamNode
    | StatmentNode
    | ExprNode
    | ArgNode
    | FuncNode
    | FileNode
    | StructNode
    | Module
    | StatmentSSA
    | FuncSSA
    | Op
    | Prog
    | Fn

function tab(s: string): string {
    return s.split("\n").map(l => "    " + l).join("\n")
}

export function format(v: Formatable): string {
    if (v === undefined) return ""
    if (typeof v === "string") return v
    if (v.kind == "FILE_NODE") {
        return v.items.map(format).join("\n\n")
    } else if (v.kind === "ARRAY_NODE") {
        return `[${v.items.map(format).join(", ")}]`
    } else if (v.kind === "IF_NODE") {
        return `if ${format(v.cond)} {\n${v.a.map(format).map(tab).join("\n")}\n} else {\n${v.b.map(format).map(tab).join("\n")}\n}`
    } else if (v.kind === "INDEX_NODE") {
        return `${format(v.value)}[${format(v.index)}]`
    } else if (v.kind == "PROG") {
        return v.fns.map(format).join("\n\n")
    } else if (v.kind == "MODULE") {
        return v.items.map(format).join("\n\n")
    } else if (v.kind == "WHILE_NODE") {
        return `while ${format(v.cond)} {\n${v.body.map(format).map(tab).join("\n")}\n}`
    } else if (v.kind == "STRUCT_NODE") {
        return `struct ${v.name} {\n${v.fields.map(format).map(tab).join("\n")}\n}`
    } else if (v.kind == "TYPE_NODE") {
        if (v.name == "Tuple") {
            return `(${v.args.map(format).join(", ")})`
        } else if (v.name == "Fn") {
            return `${format(v.args[0])} => ${format(v.args[1])}`
        } else if (v.args.length === 0) {
            return v.name
        } else {
            return `${v.name}<${v.args.map(format).join(", ")}>`
        }
    } else if (v.kind === "FUNC_NODE") {
        return `fn ${v.name}(${v.params.map(format).join(", ")}) ${format(v.return_type)} {\n${v.body.map(format).map(tab).join("\n")}\n}`
    } else if (v.kind === "FN") {
        return `fn ${v.name}(${v.params.map(format).join(", ")}) {\n${v.blocks.map((block, i) =>
            `  $${i}\n${block.map(format).map(tab).join("\n")}`
        ).join("\n")}\n}`
    } else if (v.kind === "FUNC_SSA") {
        return `fn ${v.name}(${v.params.map(format).join(", ")}) ${format(v.return_type)} {\n${v.blocks.map((block, i) =>
            `  $${i}\n${block.map(format).map(tab).join("\n")}`
        ).join("\n")}\n}`
    } else if (v.kind == "ASSIGN_OP") {
        return `${v.result} = ${v.value}`
    } else if (v.kind == "BRANCH_OP") {
        return `if ${v.cond} $${v.a} else $${v.b}`
    } else if (v.kind == "JUMP_OP") {
        return `$${v.jump}`
    } else if (v.kind == "RETURN_OP") {
        return `return ${v.value}`
    } else if (v.kind == "CALLFN_OP") {
        return `${v.result} = ${v.func}(${v.args.join(", ")})`
    } else if (v.kind == "LOAD_OP") {
        return `${v.result} = ${v.local}[${v.offset}]`
    } else if (v.kind == "STORE_OP") {
        return `${v.target}[${v.offset}] = ${v.value}`
    } else if (v.kind === "OP_NODE") {
        return `${format(v.a)} ${v.op} ${format(v.b)}`
    } else if (v.kind === "BRANCH_SSA") {
        return `if ${format(v.cond)} $${v.a} else $${v.b}`
    } else if (v.kind === "FIELD_NODE") {
        return `${format(v.value)}.${v.field}`
    } else if (v.kind === "PARAM_NODE") {
        return `${v.name} ${format(v.type)}`
    } else if (v.kind === "ASSIGNMENT_NODE") {
        return `${format(v.name)} = ${format(v.value)}`
    } else if (v.kind === "IDENT_NODE") {
        return v.value
    } else if (v.kind === "NUMBER_NODE") {
        return String(v.value)
    } else if (v.kind === "CALL_NODE") {
        return `${format(v.func)}(${v.args.map(format).join(", ")})`
    } else if (v.kind === "RETURN_NODE") {
        return `return ${format(v.value)}`
    } else if (v.kind === "OBJECT_NODE") {
        return `{ ${v.items.map(format).join(", ")} }`
    } else if (v.kind === "ARG_NODE") {
        return `${v.name}: ${format(v.value)}`
    } else {
        throw new Error("Can't format: " + JSON.stringify(v))
    }
}

export function log_types(types: Map<Formatable, TypeNode>) {
    for (const [key, value] of types.entries()) {
        console.log(format(key).padEnd(15), ":", format(value))
    }
}
