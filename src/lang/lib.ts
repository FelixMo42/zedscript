import { lexer } from "./lexer.ts";
import { parse_type, TypeNode } from "./parse.ts";

// deno-lint-ignore ban-types
export type Value = number | boolean | Function

export const global_types = new Map<string, TypeNode>
export const global_values = new Map<string, Value>

add("true", "bool", true)
add("false", "bool", false)

add("max", "Fn<(int, int), int>", Math.max)
add("sqrt", "Fn<(int), int>", Math.sqrt)

add("+", "Fn<(int, int), int>", (a: number, b: number) => a + b)
add("-", "Fn<(int, int), int>", (a: number, b: number) => a - b)
add("*", "Fn<(int, int), int>", (a: number, b: number) => a * b)
add("/", "Fn<(int, int), int>", (a: number, b: number) => a / b)
add("**", "Fn<(int, int), int>", (a: number, b: number) => a ** b)

add("==", "Fn<(int, int), bool>", (a: number, b: number) => a == b)
add(">", "Fn<(int, int), bool>", (a: number, b: number) => a > b)
add("<", "Fn<(int, int), bool>", (a: number, b: number) => a < b)
add(">=", "Fn<(int, int), bool>", (a: number, b: number) => a >= b)
add("<=", "Fn<(int, int), bool>", (a: number, b: number) => a <= b)

function add(name: string, type: string, value: Value) {
    global_types.set(name, parse_type(lexer(type))!)
    global_values.set(name, value)
}
