export type AstNode = AstNode[] | AstLeaf
export type AstLeaf = {
    text: string,
    area: [number, number]
    root: string,
}

export function parse(s: string, i = [0]) {
    const parts = []
    while (true) {
        const part = get_expr()
        if (!part) break
        parts.push(part)
    }
    return parts

    function get_expr(): AstNode | undefined {
        if (match(/\(/, true)) {
            const expr = []

            while (!match(/\)/, true)) {
                expr.push(get_expr()!)
            }

            return expr
        }

        return get_leaf()
    }

    function get_leaf(): AstLeaf | undefined {
        match(/\s/, true)
        const start = i[0]
        while (match(/[^\s\(\)]/)) {/**/ }
        if (start === i[0]) return undefined
        return {
            area: [start, i[0]],
            text: s.slice(start, i[0]),
            root: s,
        }
    }

    function match(pat: RegExp, skip_white = false) {
        if (skip_white) while (match(/\s/)) {/**/ }
        if (i[0] >= s.length) return undefined
        const is_match = s[i[0]].match(pat)
        if (is_match) i[0]++
        return is_match
    }
}

export function is_ast_leaf(n: AstNode): n is AstLeaf {
    return !Array.isArray(n)
}

export function print_error_area(n: AstNode) {
    const area = get_area(n)
    const root = get_root(n)
    const text = root.slice(...area)
    const pre = root.slice(0, area[0])
    const post = root.slice(area[1])
    console.error(`${pre}${ALL}${text}${STOP}${post}`)
}

function get_root(n: AstNode): string {
    if (is_ast_leaf(n)) return n.root
    return get_root(n[0])
}

function get_area(n: AstNode): [number, number] {
    if (is_ast_leaf(n)) return n.area
    return [get_area(n[0])[0], get_area(n.at(-1)!)[1]]
}

export function err(message: string, at: AstNode): never {
    throw new Error(message, { cause: at })
}

export function error_handler(error: Error) {
    if (!error.cause) throw error
    console.error(`\n${RED + BOLD}ERR${STOP} ${LINE}${error.message}${STOP}\n`)

    print_error_area(error.cause as AstNode)

    console.error("")
    console.error(error
        .stack!
        .split("\n")
        .slice(1)
        .filter(line => line.includes("zedscript"))
        .filter(line => !line.includes("lib/parse.ts:76:11"))
        .map(line => line.trim())
        .map(line => line.slice(
            line.indexOf("zedscript") + 10,
            line.lastIndexOf(")") == -1 ? line.length : -1
        ))
        .join("\n")
    )
    console.error("")
}

export function format(n: AstNode): string {
    if (is_ast_leaf(n)) {
        return n.text
    } else {
        return `(${n.map(format).join(" ")})`
    }
}

const BOLD = "\x1b[1m"
const STOP = "\x1b[0m"
const RED  = "\x1b[31m"
const LINE = "\x1b[4m"
const ALL = BOLD + RED + LINE