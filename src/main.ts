import { lexer } from "./lang/lexer.ts";
import { parse } from "./lang/parse.ts";
import { runit } from "./lang/runit.ts";

async function main() {
    const src = await Deno.readTextFile("./test.zed")
    
    const tks = lexer(src)
    tks.logs()

    const ast = parse(tks)!
    console.log(ast)

    const out = runit(ast)
    console.log(out)
}

main()
