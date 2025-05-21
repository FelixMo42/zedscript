// deno-lint-ignore-file no-explicit-any

import { TokenStream } from "../lang/lexer.ts";

type FullStep = { name: string, step: string | ((tks: TokenStream) => any), mod: string }

type Step
    = string
    | FullStep


type Rule = Step[]

export function s(name: string, step: string | ((tks: TokenStream) => any), mod: string=""): Step {
    return {name, step, mod }
}

function $apply(tks: TokenStream, step: FullStep) {
    return typeof step.step === "string" ? tks.take(step.step) : step.step(tks)
}

export function p<T>(rule: Rule, tks: TokenStream, build: (node: any) => T): T | undefined {
    const node = {} as any
    const save = tks.save()

    for (const step of rule) {
        if (typeof step === "string") {
            if (!tks.take(step)) {
                tks.load(save)
                return undefined
            }
        } else if (step.mod == ",") {
            node[step.name] = []

            while (true) {
                const v = $apply(tks, step)
                if (!v) break 
                tks.take(",")
                node[step.name].push(v)
            }
        } else {
            const v = $apply(tks, step)
            
            if (!v) {
                tks.load(save)
                return undefined
            }

            node[step.name] = v
        }
    }

    return build(node)
}