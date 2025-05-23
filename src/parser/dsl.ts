// deno-lint-ignore-file no-explicit-any

import { TokenStream } from "../lang/lexer.ts";

type FullStep
    = [string, string | ((tks: TokenStream) => any)]
    | [string, string | ((tks: TokenStream) => any), string]

type Step
    = string
    | FullStep


type Rule = Step[]

function $apply(tks: TokenStream, step: FullStep) {
    return typeof step[1] === "string" ? tks.take(step[1]) : step[1](tks)
}

export function p<T>(rule: Rule, tks: TokenStream, build: string | ((node: any) => T)): T | undefined {
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