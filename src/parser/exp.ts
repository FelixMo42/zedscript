// deno-lint-ignore-file no-explicit-any

import { TokenStream } from "../lang/lexer.ts";

// TYPES //

type Parser = (tks: TokenStream) => any

interface Step {
    name?: string
    cond: string
    flag: string
}

type Rule = Step[] & { name: string }

const PARSERS = new Map<string, Parser>()
const RULES   = [] as Rule[]

// PARSE //

function $build_parse_rule_string(rule: TemplateStringsArray, parsers: Parser[]): string {
    return rule.reduce((merged, chunk, i) => {
        merged += chunk

        if (i < parsers.length) {
            const name = parsers[i].name || `parse_ano_${PARSERS.size}`
            PARSERS.set(name, parsers[i])
            merged += name
        }

        return merged
    }, "")
}

function $parse_rule_token(token: string): Step {
    // pull out ending modifiers
    let flag = ""
    if (token.endsWith("*") || token.endsWith(",")) {
        flag = token.slice(-1)
        token = token.slice(0, -1)
    }

    // handle named steps
    if (token.match(/^[a-z_]*\:/g)) {
        const [name, cond] = token.split(":")
        return { name: name || "$out", cond, flag }
    }

    // unnamed step
    return { cond: token, flag: "" }
}

function $parse_rule(rule: TemplateStringsArray, parsers: Parser[]) {
    const tokens = $build_parse_rule_string(rule, parsers)
        .split(" ")
        .map(t => t.trim())
        .filter(t => t != "")

    let current_rule: Rule = Object.assign([], { name: "ERROR" })

    for (let i = 0; i < tokens.length; i++) {
        // we are at the start of a new rule!
        if (tokens[i+1] == "=") {
            // start new rule
            current_rule = Object.assign([], { name: tokens[i] })
            RULES.push(current_rule)

            // skip the "=" token
            i += 1

        // else add this token to the current rule
        } else {
            current_rule.push($parse_rule_token(tokens[i]))
        }
    }
}

//

export function p3<T>(target: string): (template: TemplateStringsArray, ...values: Parser[]) => (tks: TokenStream, build?: string | ((node: any) => T | undefined)) => (T | undefined) {
    return (template, ...values) => {
        $parse_rule(template, values)
        return $build(target)
    }
}

function build_cond(cond: string) {
    if (cond.startsWith("\"")) return `tks.take(${cond})`
    if (["ident", "number", "string"].includes(cond)) return `tks.take("<${cond}>")`
    if (cond.includes("parse")) return `PARSERS.get("${cond}")(tks)`
    return `parse_${cond}(tks)`
}

function build_rule(rule: Rule) {
    let src = ""

    const close = []

    for (const step of rule) {
        if (step.name) {
            if (step.flag === "*" || step.flag === ",") {
                src += `${step.name} = [];`
                src += `while (true) {`
                src += `const _temp = ${build_cond(step.cond)};`
                src += `if (!_temp) break;`
                if (step.flag === ",") src += "tks.take(\",\");"
                src += `${step.name}.push(_temp);`
                src += "}"
            } else {
                src += `${step.name} = ${build_cond(step.cond)};`
                src += `if (${step.name}) {`
                close.push(() => {
                    src += "}"
                })
            }
        } else {
            src += `if (${build_cond(step.cond)}) {`
            close.push(() => src += "}")
        }
    }

    if (rule.find(r => r.name === "$out")) {
        src += `return $out;`
    } else {
        src += `return { kind: "${rule.name.toUpperCase()}", ${rule.filter(r => r.name != undefined).map(r => r.name).join(", ")} };`
    }

    for (const c of close) {
        c()
    }

    src += "tks.load(save);"

    return src
}

function build(target: string) {
    let src = ""
    
    const rules = RULES.filter(rule => rule.name === target)

    const locals = new Set<string>()

    for (const rule of rules) {
        for (const step of rule.filter(rule => rule.name)) {
            locals.add(step.name!)
        }
    }

    src += `function parse_${target}(tks) {`
    src += `let ${[...locals.values()].join(",")};`
    src += `const save = tks.save();`
    src += rules.map(build_rule).join("")
    src += `}`

    return src
}

function $build(target: string) {
    const node_types = new Set<string>()

    for (const rule of RULES) {
        node_types.add(rule.name)
    }

    let src = ""
    for (const type of node_types.values()) {
        src += build(type)
    }
    
    return eval(src + `; parse_${target}`)
}
