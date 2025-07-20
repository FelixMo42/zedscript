import { AstNode, err } from "./parse.ts";
import { Context } from "./context.ts";

export type Type = (
    | ((c: Context, args: AstNode[], area: AstNode) => Type)
    | Atom["type"]
    | "unknown"
    | "never"
)

type AtomFn = (c: Context, ...args: AstNode[]) => Atom

export type Atom = (
    | { type: "int" , value: number    }
    | { type: "bool", value: boolean   }
    | { type: "type", value: Type      }
    | { type: "code", value: AstNode   }
    | { type: "func", value: AtomFn    }
    | { type: "void", value: undefined }
)

export function atom<T extends Atom["type"], V = Extract<Atom, { type: T }>["value"]>(type: T, value: V): Atom {
    return { type, value } as Atom
}

export function as<T extends Atom["type"], V = Extract<Atom, { type: T }>["value"]>(type: T, atom: Atom): V {
    if (atom.type === type) return atom.value as V
    throw new Error(`expected ${type}, got ${atom.type}`)
}

export function assert_type_eq(_c: Context, a: Type, b: Type, area: AstNode, message=`${a} != ${b}`) {
    if (a != b) err(message, area)
    return a
}
