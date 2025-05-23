// import { lexer } from "./lang/lexer.ts";
// import { parse } from "./lang/parse.ts";
// import { lower } from "./lang/lower.ts";
// import { build } from "./lang/build.ts";
// import { runit } from "./lang/runit.ts";
// import { format } from "./util/format.ts";

import { exec } from "./backends/js/index.ts";

async function main() {
    console.log(exec(await Deno.readTextFile("./test.zed")))
    // const src = await Deno.readTextFile("./test.zed")
    // const tks = lexer(src)

    // console.log("#AST")
    // const ast = parse(tks)!
    // console.log(format(ast))
    
    // console.log(`#SSA`)
    // const ssa = lower(ast)
    // console.log(format(ssa))

    // console.log(`#BIN`)
    // const bin = build(ssa)
    // console.log(format(bin))

    // console.log("#OUT")
    // const out = runit(bin)
    // console.log(out)
}

main()
