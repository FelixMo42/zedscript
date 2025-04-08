import { lexer } from "./lang/lexer.ts";
import { parse } from "./lang/parse.ts";
import { lower } from "./lang/ast.ts";
import { build } from "./lang/build.ts";
import { runit } from "./lang/runit.ts";
import { format } from "./util/format.ts";

async function main() {
    const src = await Deno.readTextFile("./test.zed")
    
    const tks = lexer(src)
    const ast = parse(tks)!
    console.log(format(ast))
    
    const ssa = lower(ast)


    console.log(`#SSA`)
    console.log(format(ssa))

    const bin = build(ssa)

    console.log(`#BIN`)
    console.log(format(bin))



    const out = runit(bin)
    console.log(out)
}

main()
