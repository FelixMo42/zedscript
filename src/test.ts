import { assertEquals } from "jsr:@std/assert";

import { lexer } from "./lang/lexer.ts";
import { parse } from "./lang/parse.ts";
import { runit, type Value } from "./lang/runit.ts";
import { build } from "./lang/build.ts";

function run(src: string) {
    const tks = lexer(src)
    const ast = parse(tks)!
    const bin = build(ast)
    const out = runit(bin)
    return out
}

function assert_stmt(stmt: string, value: Value) {
    return assertEquals(run(`
        fn main() {
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
    fn main() {
        a = 3 + 3
        return a * 7
    } 
`), 42))
Deno.test("two variable", () => assertEquals(run(`
    fn main() {
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
    fn main() {
        if true {
            return 4
        }

        return 5
    }
`), 4))
Deno.test("if else with return", () => assertEquals(run(`
    fn main() {
        if true {
            return 4
        } else {
            return 2
        }
    }
`), 4))
Deno.test("if else with var assignment", () => assertEquals(run(`
    fn main() {
        if 42 > 10000 {
            a = 4
        } else {
            a = 2
        }

        return a
    }
`), 2))
Deno.test("built in function call", () => assertEquals(run(`
    fn main() {
        return max(42, 9000)
    }
`), 9000))
Deno.test("two functions", () => assertEquals(run(`
    fn the_number_six() {
        return 6
    }

    fn main() {
        return the_number_six() * 7
    }
`), 42))
Deno.test("function paramaters", () => assertEquals(run(`
    fn add(a, b) {
        return a + b
    }

    fn main() {
        return add(40, 2)
    }
`), 42))

// Open
Deno.test(`"hi"`, () => assert_stmt(`"hi"`, "hi"))
