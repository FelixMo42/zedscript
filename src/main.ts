import { build, Prog } from "./lang/build.ts";
import { lexer } from "./lang/lexer.ts";
import { parse } from "./lang/parse.ts";
import { runit } from "./lang/runit.ts";
import { unreachable } from "jsr:@std/assert";

function log_bin(bin: Prog) {
    for (const fn of bin.fns) {
        console.log(`fn ${fn.name}() {`)
        for (let i = 0; i < fn.blocks.length; i++) {
            console.log(`  .${i}`)
            for (const op of fn.blocks[i]) {
                if (op.kind == "ASSIGN_OP") {
                    console.log(`    ${op.result} = ${op.value}`)
                } else if (op.kind == "BRANCH_OP") {
                    console.log(`    if ${op.cond} $${op.a} else $${op.b}`)
                } else if (op.kind == "JUMP_OP") {
                    console.log(`    $${op.jump}`)
                } else if (op.kind == "RETURN_OP") {
                    console.log(`    return ${op.value}`)
                } else if (op.kind == "CALLFN_OP") {
                    console.log(`    ${op.result} = ${op.func}(${op.args.join(", ")})`)
                } else if (op.kind == "LOAD_OP") {
                    console.log(`    ${op.result} = ${op.local}[${op.offset}]`)
                } else if (op.kind == "STORE_OP") {
                    console.log(`    ${op.target}[${op.offset}] = ${op.value}`)
                } else {
                    unreachable()
                }
            }
        }
        console.log(`}`)
    }
}

async function main() {
    const src = await Deno.readTextFile("./test.zed")
    
    const tks = lexer(src)
    // tks.logs()

    const ast = parse(tks)!
    console.log(ast)

    const bin = build(ast)
    log_bin(bin)

    const out = runit(bin)
    console.log(out)
}

main()
