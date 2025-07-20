import { AstLeaf, AstNode, err, is_ast_leaf } from "../lib/parse.ts";
import { Type, Atom } from "./types.ts";

export class Context {
    types = new Map<string, Type>()
    atoms = new Map<string, Atom>()

    parent : Context | undefined

    constructor(parent?: Context) {
        this.parent = parent
    }

    get(ident: AstLeaf): Atom {
        if (ident.text.match(/^[\d]+$/g)) {
            return {
                type: "int",
                value: Number(ident.text)
            }
        }

        return (
            this.atoms.get(ident.text) ??
            this.parent?.get(ident) ??
            err(`undefinded variable`, ident)
        )
    }

    set(ident: AstLeaf | string, atom: Atom): void {
        if (typeof ident !== "string") return this.set(ident.text, atom)
        this.atoms.set(ident, atom)
        this.types.set(ident, atom.type)
    }

    get_type(ident: AstLeaf): Type {
        if (ident.text.match(/^[\d]+$/g)) {
            return "int"
        }

        return (
            this.types.get(ident.text) ??
            this.parent?.get_type(ident) ??
            err(`undefinded variable`, ident)
        )
    }

    set_type(ident: AstLeaf | string, type: Type) {
        if (typeof ident === "string") this.types.set(ident, type)
        else this.types.set(ident.text, type)
    }

    check(n: AstNode): Type {
        if (is_ast_leaf(n)) {
            return this.get_type(n)
        } else {
            const [func, ...args] = n
            const result = this.check(func)
            if (typeof result != "function") err("don't call me", n)
            return result(this, args, n)
        }
    }

    exec(n: AstNode): Atom {
        if (is_ast_leaf(n)) {
            return this.get(n)
        } else {
            const [func, ...args] = n
            const result = this.exec(func)
            if (result.type != "func") err("don't call me", n)
            return result.value(this, ...args)
        }
    }
}

export function check(modules: (AstNode[] | ((ctx: Context) => void))[]) {
    const ctx = new Context()

    for (const module of modules) {
        if (typeof module === "function") {
            module(ctx)
        } else {
            for (const part of module) {
                ctx.check(part)
            }
        }
    }    
}
