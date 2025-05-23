// deno-lint-ignore-file no-explicit-any

import { TokenStream } from "../lang/lexer.ts";

type Parser = (tks: TokenStream) => any

type FullStep
    = [string, string | Parser]
    | [string, string | Parser, string]

type Step
    = string
    | FullStep

type Rule = Step[]

const PARSERS = new Map<string, Parser>()

function $apply(tks: TokenStream, step: FullStep) {
    return typeof step[1] === "string" ? tks.take(step[1]) : step[1](tks)
}

function $parse_rule(rule: Rule | TemplateStringsArray, parsers: Parser[]): Rule {
    let merged = ""

    for (let i = 0; i < rule.length; i++) {
        merged += rule[i]
        if (i < parsers.length) {
            name = parsers[i].name || "ano_" + String(PARSERS.size)
            PARSERS.set(name, parsers[i])
            merged += name
        }
    }

    return merged.split(" ").map(rule => rule.trim()).filter(rule => rule != "").map(rule => {
        if (rule.startsWith("\"")) {
            return rule.slice(1, -1)
        } else if (rule.match(/^[a-z_]+\:/g)) {
            let pattern = ""

            if (rule.endsWith("*")) {
                pattern = "*"
            } else if (rule.endsWith(",")) {
                pattern = ","
            }

            if (pattern !== "") {
                rule = rule.slice(0, -1)
            }

            const [name, value] = rule.split(":")
            if (PARSERS.has(value)) {
                return [name, PARSERS.get(value), pattern] as [string, Parser, string]
            }
            return [name, `<${value}>`, pattern] as [string, string, string]
        } else {
            return `<${rule}>`
        }
    })
}

export function p<T>(template: TemplateStringsArray, ...values: Parser[]): (tks: TokenStream, build: string | ((node: any) => T)) => (T | undefined) {
    const rule = $parse_rule(template, values)

    return (tks, build) => {
        const node = {} as any
        const save = tks.save()

        for (const step of rule) {
            if (typeof step === "string") {
                if (!tks.take(step)) {
                    tks.load(save)
                    return undefined
                }
            } else if (step[2] == ",") {
                node[step[0]] = []

                while (true) {
                    const v = $apply(tks, step)
                    if (!v) break
                    tks.take(",")
                    node[step[0]].push(v)
                }
            } else if (step[2] == "*") {
                node[step[0]] = []

                while (true) {
                    const v = $apply(tks, step)
                    if (!v) break
                    node[step[0]].push(v)
                }
            } else {
                const v = $apply(tks, step)

                if (!v) {
                    tks.load(save)
                    return undefined
                }

                node[step[0]] = v
            }
        }

        if (typeof build === "string") {
            return {
                kind: build,
                ...node
            }
        } else {
            return build(node)
        }
    }
}
