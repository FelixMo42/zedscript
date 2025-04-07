import { lexer } from "./lang/lexer.ts";
import { FileNode, parse, TypeNode } from "./lang/parse.ts";

async function get_ast() {
    const src = await Deno.readTextFile("./test.zed")
    return parse(lexer(src))!
}

type Types = Map<string, TypeNode>

function Type(name: string | TypeNode, ...args: TypeNode[]): TypeNode {
    if (typeof name === "object") {
        return name
    }

    return { kind: "TYPE_NODE", name, args }
}

function format(value: TypeNode): string {
    if (value.name == "Tuple") {
        return `(${value.args.map(format).join(", ")})`
    } else if (value.name == "Fn") {
        return `${format(value.args[0])} => ${format(value.args[1])}`
    } else if (value.args.length === 0) {
        return value.name
    } else {
        return `${value.name}<${value.args.map(format).join(", ")}>`
    }
}

function build_module_types(ast: FileNode): Types {
    const types = new Map<string, TypeNode>()

    ast.forEach((n) => {
        if (n.kind === "FUNC_NODE") {
            types.set(n.name, Type("Fn",
                Type("Tuple", ...n.params.map((p) => Type(p.type))),
                n.return_type ? Type(n.return_type) : Type("void")
            ))
        } else if (n.kind === "STRUCT_NODE") {
            types.set(n.name, Type(n.name))

            for (const f of n.fields.values()) {
                types.set(`${n.name}::${f.name}`, Type(f.type))
            }
        } else {
            throw new Error("UNSUPPORTED TOP LEVEL")
        }
    })

    return types
}

function log_types(types: Types) {
    for (const [key, value] of types.entries()) {
        console.log(key.padEnd(8), ":", format(value))
    }
}

async function main() {
    const ast = await get_ast()
    const types = build_module_types(ast)

    // ast.forEach((n) => {
    //     if (n.kind === "FUNC_NODE") {

    //     }
    // })

    log_types(types)    
}

main()