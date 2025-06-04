import { Expr } from "@src/core/ir.ts"

export function get_locals(expr: Expr, locals: string[]=[]): string[] {
    if (!Array.isArray(expr)) return locals

    // If we're setting it, then it's a variable in the local scope
    if (expr[0] == "@set") {
        if (!locals.includes(expr[1] as string)) {
            locals.push(expr[1] as string)
        }
    }

    // Branch down the tree
    expr.forEach((part) => get_locals(part, locals))

    // Function paramaters do no count as locals
    if (expr[0] == "@def") {
        locals = locals.filter(local => !(expr[2] as string[]).includes(local))
    }

    return locals
}


function is_local_used(ir: Expr, local: string): boolean {
    if (!Array.isArray(ir)) {
        return ir !== local
    } else if (ir[0] == "@set") {
        return is_local_used(ir[2], local)
    } else if (ir[0] == "@def") {
        console.log(ir[3])
        return is_local_used(ir[3], local)
    } else {
        return ir.every((part) => is_local_used(part, local))
    }
}

function filter(ir: Expr, match: (ir: Expr) => boolean): Expr {
    if (Array.isArray(ir)) {
        return ir.filter(part => !match(part)).map(part => filter(part, match))
    } else {
        return ir
    }
}

export function remove_unused_vars(ir: Expr) {
    // TODO: What if a function is impure

    for (const local of get_locals(ir)) {
        if (is_local_used(ir, local)) {
            ir = filter(ir, (stmt) => Array.isArray(stmt) && stmt[0] === "@set" && stmt[1] === local)
        }
    }

    return ir
}
