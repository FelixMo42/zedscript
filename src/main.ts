import { build } from "./lang/build.ts";
import { lexer } from "./lang/lexer.ts";
import { parse } from "./lang/parse.ts";
import { runit } from "./lang/runit.ts";

async function main() {
    const src = await Deno.readTextFile("./test.zed")
    
    const tks = lexer(src)
    tks.logs()

    const ast = parse(tks)!
    console.log(ast)

    const bin = build(ast)
    console.log(JSON.stringify(bin, null, 2))

    const out = runit(bin)
    console.log(out)
}

main()
