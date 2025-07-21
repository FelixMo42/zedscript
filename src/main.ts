import { parse, error_handler } from "./steps/parse.ts";
import { check } from "./steps/check.ts";
import { build } from "./steps/build.ts";

import { Wat } from "./targets/wat.ts";

function main() {
    try {
        const src = SOURCE
        const ast = parse(src)
        const mod = check(ast)
        const bin = build(mod, Wat)
        console.log(bin)
    } catch (e) {
        error_handler(e as Error)
    }
}

const SOURCE = `

(fib3 (#fn ((n int)) int
    (#if (<= n 1) (#return n))
    (#return (+ (fib2 (- n 1)) (fib (- n 2))))
))

(fib (#fn ((n int)) int
    (#if (<= n 1) (#return n))
    (#return (+ (fib2 (- n 1)) (fib3 (- n 2))))
))

(fib2 (#fn ((n int)) int
    (#if (<= n 1) (#return n))
    (#return (+ (fib2 (- n 1)) (fib (- n 2))))
))



(main (#fn ((x int) (y int)) (maybe_int 6)
    (#return (+ x (fib y)))
))



(maybe_int (#fn ((x int)) type
    (#return (#if (== (fib x) 8) int bool))
))
`.trim()

main()
