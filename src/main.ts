import { parse } from "@lib/parser/lang/zed.ts";
import { build } from "@src/core/ir.ts";

async function main() {
    const src = await Deno.readTextFile("./test.zed")
    const ast = parse(src)
    const wat = build(ast)

    console.log(wat)
}

main()