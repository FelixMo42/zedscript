// deno-lint-ignore-file no-explicit-any

import { TokenStream } from "../lang/lexer.ts";

// TYPES //

type Parser = (tks: TokenStream) => any

type FullStep = [string, string | Parser, string]

type Step
    = string
    | FullStep

type Rule = Step[] & {
    name: string
}

const PARSERS = new Map<string, Parser>()

// build //

function $build_parse_rule_string(rule: TemplateStringsArray, parsers: Parser[]): string {
    return rule.reduce((merged, chunk, i) => {
        merged += chunk

        if (i < parsers.length) {
            const name = parsers[i].name || `ano_${PARSERS.size}`
            PARSERS.set(name, parsers[i])
            merged += name
        }

        return merged
    }, "")
}

function $parse_rule_token(token: string): Step {
    // just a constant
    if (token.startsWith("\"")) {
        return token.slice(1, -1)
    }

    // handle named steps
    if (token.match(/^[a-z_]*\:/g)) {
        // pull out ending modifiers
        let pattern = ""
        if (token.endsWith("*") || token.endsWith(",")) {
            pattern = token.slice(-1)
            token = token.slice(0, -1)
        }

        // parse out the name and the rule type
        const [name, value] = token.split(":")
        const rule = PARSERS.get(value) ?? `<${value}>`
        return [name, rule, pattern] as FullStep
    }

    // TODO: handle this case more gracefully
    return `<${token}>`
}

function $parse_rule(rule: TemplateStringsArray, parsers: Parser[]): Rule[] {
    const tokens = $build_parse_rule_string(rule, parsers)
        .split(" ")
        .map(t => t.trim())
        .filter(t => t != "")
    
    const rules: Rule[] = []
    let current_rule: Rule = Object.assign([], { name: "ERROR" })

    for (let i = 0; i < tokens.length; i++) {
        // we are at the start of a new rule!
        if (tokens[i+1] == "=") {
            // start new rule
            current_rule = Object.assign([], { name: tokens[i] })
            rules.push(current_rule)

            // skip the "=" token
            i += 1

        // else add this token to the current rule
        } else {
            current_rule.push($parse_rule_token(tokens[i]))
        }
    }

    return rules
}

// APPPLY //

function $apply_step(tks: TokenStream, step: FullStep) {
    return typeof step[1] === "string" ? tks.take(step[1]) : step[1](tks)
}

function $apply_recursive_rule<T>(rule: Rule, startToken: T, tks: TokenStream): T | undefined {
    const rule_stub: Rule = Object.assign(rule.slice(1), { name: rule.name })
    const node = $apply_rule(rule_stub, tks)
    if (!node) return undefined
    node[rule[0][0]] = startToken
    return node
}

function $apply_rule(rule: Rule, tks: TokenStream) {
    const node = { kind: rule.name.toUpperCase() } as any
    const save = tks.save()

    for (const step of rule) {
        if (typeof step === "string") {
            if (!tks.take(step)) return tks.load(save)
        } else if (step[2] === "*" || step[2] === ",") {
            node[step[0]] = []

            while (true) {
                const v = $apply_step(tks, step)
                if (!v) break
                if (step[2] === ",") tks.take(",")
                node[step[0]].push(v)
            }
        } else {
            const v = $apply_step(tks, step)
            if (!v) return tks.load(save)
            node[step[0]] = v
        }
    }

    return node
}

//

function $is_rule_recursive(rule: Rule, self: Parser) {
    return Array.isArray(rule[0]) && rule[0][1] === self
}

function $is_rule_set_recursive(ruleset: Rule[], self: Parser) {
    return ruleset.some((rule) => $is_rule_recursive(rule, self))
}

//

export function p<T>(template: TemplateStringsArray, ...values: Parser[]): (tks: TokenStream, build?: string | ((node: any) => T | undefined)) => (T | undefined) {
    const rules = $parse_rule(template, values)

    return (tks, build="") => {
        if ($is_rule_set_recursive(rules, build as Parser)) {
            let node: T | undefined = undefined

            for (const rule of rules) {
                if (!$is_rule_recursive(rule, build as Parser)) {
                    node = $apply_rule(rule, tks)
                    if (node) break
                }
            }

            if (!node) return undefined

            rec: while (true) {
                for (const rule of rules) {
                    if ($is_rule_recursive(rule, build as Parser)) {
                        const new_node = $apply_recursive_rule<T>(rule, node!, tks) as T | undefined
                        if (new_node) {
                            node = new_node
                            continue rec
                        }
                    }
                }
                if ("" in (node as object)) return (node as any)[""]
                return node
            }
        } else {
            for (const rule of rules) {
                const node = $apply_rule(rule, tks)
                if (node) {
                    if ("" in node) return node[""]
                    return typeof build === "function" ? build(node) : node
                }
            }
        }
    }
}
