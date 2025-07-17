import { readFile } from "node:fs/promises";


type Type = string

type Expr = (string | Expr)[]

function to_wat(expr: Expr) {
    return `
        local.get $0
        local.get $1
        f64.add
    `
}

class Func {
    name        : string
    params      : Type[]
    return_type : Type
    body        : Expr[]

    constructor(name: string, params: Type[], return_type: Type, body: Expr[]) {
        this.name        = name
        this.params      = params
        this.return_type = return_type
        this.body        = body
    }

    to_wat(): string {
        return `
            (func $${this.name}
                ${this.params.map((p, i) => `(param $${i} ${p})`).join("")}
                (result ${this.return_type})
                ${to_wat(this.body)}
            )
            (export "${this.name}" (func $${this.name}))
        `
    }
}

class Module {
    funcs: Func[] = []

    add_func(func: Func) {
        this.funcs.push(func)
        return this
    }

    to_wat() {
        return `(module${this.funcs.map(func => func.to_wat()).join("")})`
    }
}

async function main() {
    const src = await readFile("./lib/wat/xiny.ts", "utf-8")
    const ast = src

    const module = new Module()
        .add_func(new Func("main", ["f64", "f64"], "f64", [
            ["add", "$0", "$1"]
        ]))

    console.log(module.to_wat())
}

main()