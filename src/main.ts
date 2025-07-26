import { readFile } from "node:fs/promises"

import { parse, error_handler } from "./steps/parse.ts";
import { check } from "./steps/check.ts";
import { build } from "./steps/build.ts";

import { Wat } from "./targets/wat.ts";

async function main() {
    try {
        const src = await readFile("./src/sample.zs", "utf-8")
        const ast = parse(src)
        const mod = check(ast)
        const bin = build(mod, Wat)
        console.log(bin)
    } catch (e) {
        error_handler(e as Error)
    }
}

main()
