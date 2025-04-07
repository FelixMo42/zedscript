import { ArgNode, ExprNode, FuncNode, ParamNode, StatmentNode, TypeNode } from "../lang/parse.ts";

type Formatable
    = string
    | TypeNode
    | FuncNode
    | ParamNode
    | StatmentNode
    | ExprNode
    | ArgNode

export function format(v: Formatable): string {
    if (typeof v === "string") return v
    if (v.kind == "TYPE_NODE") {
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
        return `fn ${v.name}(${v.params.map(format).join(", ")}) {}`
    } else if (v.kind === "OP_NODE") {
        return `${format(v.a)} ${v.op} ${format(v.b)}`
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
