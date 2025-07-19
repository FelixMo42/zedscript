import { Expr } from "./main.ts";
import { f64, i32, str } from "./types.ts";

export function e(src: string, i=[0]): Expr[] {
    const s = src
        .split("\n")
        .filter(line => !line.trim().startsWith(";"))
        .join("\n")

    const parts = []

    while (true) {
        const expr = get_expr(s, i)
        if (expr === undefined) break
        parts.push(expr)
    }

    return parts

    function get_expr(s: string, i=[0]): Expr | undefined {
        if (is(s,i, "(")) {
            const expr = []

            while (!is(s,i, ")")) {
                expr.push(get_expr(s, i)!)
            }

            return expr
        }

        return get_single(s, i)
    }

    function get_single(s: string, i=[0]) {
        skip_whitespace(s, i)

        const start = i[0]
        while ($(s, i)?.match(/[a-z0-9_@$=:<>.]/)) i[0]++
        const tok = s.slice(start, i[0])

        if (tok.length === 0) return $(s, [i[0]++])

        if (tok.startsWith(":") && tok.length > 1) {
            return {
                type: str,
                value: tok.slice(1)
            }
        }

        if (tok.match(/^[0-9]*\.?[0-9]*$/)) {
            return {
                type: f64,
                value: Number(tok),
            }
        }

        if (tok.match(/^[0-9]+i32$/)) {
            return {
                type: i32,
                value: Number(tok.slice(0, -3)),
            }
        }

        return tok
    }

    function is(s: string, i=[0], p: string) {
        skip_whitespace(s, i)

        if (s[i[0]] === p) {
            i[0]++
            return true
        }

        return false
    }

    function skip_whitespace(s: string, i=[0]) {
        while (
            $(s, i) === " " ||
            $(s, i) === "\n"
        ) i[0]++
    }

    function $(s: string, i=[0]) {
        if (i[0] >= s.length) return undefined
        return s[i[0]]
    }
}

