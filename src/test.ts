import { assertEquals } from "jsr:@std/assert";

import { lexer } from "./lang/lexer.ts";
import { parse } from "./lang/parse.ts";
import { runit, type Value } from "./lang/runit.ts";
import { build } from "./lang/build.ts";
import { lower } from "./lang/lower.ts";

function run(src: string) {
    const tks = lexer(src)
    const ast = parse(tks)!
    const ssa = lower(ast)
    const bin = build(ssa)
    const out = runit(bin)
    return out
}

function assert_stmt(stmt: string, value: Value) {
    const type = typeof value == "number" ? "int" : "bool" 
    return assertEquals(run(`
        fn main() ${type} {
            return ${stmt}
        }    
    `), value)
}

// Done
Deno.test("1", () => assert_stmt(`1`, 1))
Deno.test("42", () => assert_stmt(`42`, 42))
Deno.test("1 + 42", () => assert_stmt(`1 + 42`, 43))
Deno.test("1 + 2 + 3", () => assert_stmt(`1 + 2 + 3`, 6))
Deno.test("1 - 42", () => assert_stmt(`1 - 42`, -41))
Deno.test("6 * 7", () => assert_stmt(`6 * 7`, 42))
Deno.test("42 / 10", () => assert_stmt(`42 / 10`, 4.2))
Deno.test("1 + 2 * 3", () => assert_stmt(`1 + 2 * 3`, 7))
Deno.test("2 * 3 + 1", () => assert_stmt(`2 * 3 + 1`, 7))
Deno.test("2 * (3 + 1)", () => assert_stmt(`2 * (3 + 1)`, 8))
Deno.test("42 == 6 * 7", () => assert_stmt(`42 == 42`, true))
Deno.test("6 * 7 > 6 * 6 + 2", () => assert_stmt(`6 * 7 > 6 * 6 + 2`, true))
Deno.test("6 * 7 < 6 * 6 + 2", () => assert_stmt(`6 * 7 < 6 * 6 + 2`, false))
Deno.test("6 * 7 >= 6 * 6 + 2", () => assert_stmt(`6 * 7 >= 6 * 6 + 2`, true))
Deno.test("6 * 7 <= 6 * 6 + 2", () => assert_stmt(`6 * 7 <= 6 * 6 + 2`, false))
Deno.test("one variable", () => assertEquals(run(`
    fn main() int {
        a = 3 + 3
        return a * 7
    } 
`), 42))
Deno.test("two variable", () => assertEquals(run(`
    fn main() int {
        a = 3 + 3
        b = 14 / 2 - 1
        return a * (b + 1)
    }
`), 42))
Deno.test("true", () => assert_stmt("true", true))
Deno.test("false", () => assert_stmt("false", false))
Deno.test("ternary if true", () => assert_stmt(`7 if 8 < 9 else 0`, 7))
Deno.test("ternary if false", () => assert_stmt(`7 if 8 > 9 else 0`, 0))
Deno.test("ternary else if", () => assert_stmt(`
    7  if 8 > 9    else
    10 if 0 > 9000 else
    0
`, 0))
Deno.test("if with return", () => assertEquals(run(`
    fn main() int {
        if true {
            return 4
        }

        return 5
    }
`), 4))
Deno.test("if else with return", () => assertEquals(run(`
    fn main() int {
        if true {
            return 4
        } else {
            return 2
        }
    }
`), 4))
Deno.test("if else with var assignment", () => assertEquals(run(`
    fn main() int {
        if 42 > 10000 {
            a = 4
        } else {
            a = 2
        }

        return a
    }
`), 2))
Deno.test("built in function call", () => assertEquals(run(`
    fn main() int {
        return max(42, 9000)
    }
`), 9000))
Deno.test("two functions", () => assertEquals(run(`
    fn the_number_six() int {
        return 6
    }

    fn main() int {
        return the_number_six() * 7
    }
`), 42))
Deno.test("function paramaters", () => assertEquals(run(`
    fn add(a int, b int) int {
        return a + b
    }

    fn main() int {
        return add(40, 2)
    }
`), 42))
Deno.test("fibonacci", () => assertEquals(run(`
    fn fib(n int) int {
        a = 0
        b = 1

        while n > 1 {
            temp = a + b
            a = b
            b = temp

            n = n - 1
        }

        return b
    }

    fn main() int {
        return fib(6)
    }
`), 8))
Deno.test("sqrt", () => assert_stmt("sqrt(4)", 2))
Deno.test("2 ** 3", () => assert_stmt("2 ** 3", 8))
Deno.test("array", () => assertEquals(run(`
    fn main() int {
        ptr = [40, 2]
        return ptr[0] + ptr[1]
    }
`), 42))
Deno.test("array index const", () => assertEquals(run(`
    fn main() int {
        ptr = [40, 2]
        return ptr[0] + ptr[1]
    }
`), 42))
Deno.test("array index dyn", () => assertEquals(run(`
    fn main() int {
        ptr = [40, 2]
        return ptr[0] + ptr[1]
    }
`), 42))
Deno.test("Vec2 magnitude", () => assertEquals(run(`
    struct Vec2 {
        x int
        y int
    }

    fn mag(p Vec2) int {
        return sqrt(p.x ** 2 + p.y ** 2)
    }

    fn main() int {
        return mag({
            x: 0
            y: 42
        })
    }
`), 42))
Deno.test("return struct", () => assertEquals(run(`
    struct Vec2 {
        x int
        y int
    }

    fn mag(p Vec2) int {
        return sqrt(p.x ** 2 + p.y ** 2)
    }

    fn make() Vec2 {
        return {
            x: 0,
            y: 42
        }
    }

    fn main() int {
        return mag(make())
    }
`), 42))
Deno.test("return type signature", () => assertEquals(run(`
    struct Vec2 {
        x int
        y int
    }

    fn make() Vec2 {
        return {
            x: 0,
            y: 42
        }
    }

    fn main() int {
        p = make()
        return sqrt(p.x ** 2 + p.y ** 2)
    }
`), 42))

// Open
Deno.test("infernece in loop", () => assertEquals(run(`
    struct Vec2 {
        x int
        y int
    }

    fn make() Vec2 {
        if true {
            a = { x: 42, y: 0 }
            return a
        }
        return { x: 1, y: 1 }
    }

    fn main() int {
        return make().x
    }
`), 42))
Deno.test("array of struct", () => assertEquals(run(`
    struct Vec2 {
        x int
        y int
    }

    fn mag(p Vec2) int {
        return sqrt(p.x ** 2 + p.y ** 2)
    }

    fn main() int {
        p = [
            { x: 6, y: 0 }
            { x: 0, y: 7 }
        ]
        return mag(p[0]) * mag(p[1])
    }
`), 42))
Deno.test("array's return type signature", () => assertEquals(run(`
    struct Vec2 {
        x int
        y int
    }

    fn make() Vec2's {
        return [
            { x: 6, y: 0 }
            { x: 0, y: 7 }
        ]
    }

    fn mag(p Vec2) int {
        return sqrt(p.x ** 2 + p.y ** 2)
    }

    fn main() int {
        p = make()
        return mag(p[0]) * mag(p[1])
    }
`), 42))
// Deno.test("anonymous structs", () => assertEquals(run(`
//     fn main() int {
//         p = {
//             x: 6
//             y: 7
//         }
//         return p.x * p.y
//     }
// `), 42))
