import { lexer } from "@lib/parser/lexer.ts"
import { writeFileSync } from "node:fs"
import { as_struct, is_array, merge, Type, TYPES, typesToJS, unique } from "@src/core/code_gen.ts";
import { Block } from "@src/core/graph.ts";
import { Expr, FuncDef } from "@src/core/ir.ts";

// TYPES //

interface Step {
    name?: string
    cond: string
    flag: string
}

type Rule = Step[] & { name: string }

const RULES = [] as Rule[]

// PARSE //

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

function $parse_rule(rule: string) {
    const tokens = rule.split(" ").map(t => t.trim()).filter(t => t != "")

    for (let i = 0; i < tokens.length; i++) {
        // we are at the start of a new rule!
        if (tokens[i+1] == "=") {
            // start new rule
            RULES.push(Object.assign([], { name: tokens[i] }))

            // skip the "=" token
            i += 1
        } else {
            // else add this token to the current rule
            RULES.at(-1)!.push($parse_rule_token(tokens[i]))
        }
    }
}

// BUILD //

const UNNEEDED = new Set<string>()

function $build_cond(cond: string): Expr {
    if (cond.startsWith("\"")) return [["@field", "tks", "take"], cond]
    if (["ident", "number", "string"].includes(cond)) return [["@field", "tks", "take"], ["@string",`<${cond}>`]]
    return [`parse_${cond}`, "tks"]
}

function $build_step(rule: Rule, step: Step, suc: Block, err: Block): Block {
    const node = new Block()

    if (step.name) {
        if (step.flag === "*" || step.flag === ",") {
            node.with(["@set", step.name, ["@array"]])

            const loop = new Block()

            const loop_inner = new Block()
                .with([["@field", step.name, "push"], "_temp"])
                .goes_to(loop)

            if (step.flag === ",") loop_inner.with([["@field", "tks", "take"], `","`])

            loop.with(["@set", "_temp", $build_cond(step.cond)])
                .branch(["not", "_temp"], suc, loop_inner)
    
            node.goes_to(loop)
        } else if (is_array(TYPES.get(rule.name)!)) {
            node.with(["@set", step.name, $build_cond(step.cond)])
                .branch(step.name,
                    new Block()
                        .with(["@set", step.name, ["@array", step.name]])
                        .goes_to(suc),
                    err
                )
        } else {
            node.with(["@set", step.name, $build_cond(step.cond)])
                .branch(step.name, suc, err)
        }
    } else {
        node.branch($build_cond(step.cond), suc, err)
    }

    return node
}

function $build_rule(rule: Rule, suc: Block, err: Block): Block {
    const return_node = new Block().goes_to(suc)

    // what should this rule return?
    if (rule.find(r => r.name === "$out")) {
        return_node.with(["@set", "_node", "$out"])
    } else {
        const defined_fields = rule
            .filter(r => r.name != undefined)
            .map(r => [r.name, r.name]) as Expr[]

        const undefined_fields = as_struct(TYPES.get(rule.name)!)[1]
            .filter(([k, v]) => !rule.some(step => step.name === k) && is_array(v))
            .map(([k]) => [k, ["@array"]])

        return_node.with(["@set", "_node", ["@struct",
            ["kind", ["@string", rule.name.toUpperCase()]],
            ...defined_fields,
            ...undefined_fields,
        ]])
    }

    const fail = new Block().with([["@field", "tks", "load"], "_save"]).goes_to(err)

    // rule matching steps
    return rule.reduceRight((next, step) => $build_step(rule, step, next, fail), return_node)
}

function $build_recursive_rule(rule: Rule, suc: Block, err: Block): Block {
    const return_node = new Block().goes_to(suc)

    // what should this rule return?
    if (rule.find(r => r.name === "$out")) {
        return_node.with(["@set", "_node", "$out"])
    } else {
        const defined_fields = rule
            .filter(r => r.name != undefined)
            .map(r => [r.name, r.name]) as [string, Expr][]

        defined_fields[0] = [rule[0].name!, "_node"]

        const undefined_fields = as_struct(TYPES.get(rule.name)!)[1]
            .filter(([k, v]) => !rule.some(step => step.name === k) && is_array(v))
            .map(([k]) => [k, ["@array"]])

        return_node.with(["@set", "_node", ["@struct",
            ["kind", ["@string", rule.name.toUpperCase()]],
            ...defined_fields,
            ...undefined_fields,
        ]])
    }

    const fail = new Block().with([["@field", "tks", "load"], "_save"]).goes_to(err)

    return rule
        .slice(1)
        .reduceRight((next, step) => $build_step(rule, step, next, fail), return_node)
}

function $build_ruleset(target: string) {
    // what rules are included in the ruleset?
    const rules = RULES
        .filter(rule => rule.name === target)
        .map(rule => {
            if (rule.length === 1 && rule[0].name === "$out") {
                const sub_rules = RULES.filter(r => r.name === rule[0].cond)
                if (sub_rules?.length === 1) {
                    UNNEEDED.add(rule[0].cond)
                    return sub_rules[0]
                }
            }
 
            return rule
        })

    // build controle flow graph
    const return_node = new Block().ret(`_node`)

    const recursive_loop_node = new Block().with(["@set", "_save", ["@field", "tks", "index"]])

    const first_recursive_rule = rules
        .filter(rule => rule[0].cond === target)
        .reverse()
        .reduce((next, rule) => $build_recursive_rule(rule, recursive_loop_node, next), return_node)

    recursive_loop_node.goes_to(first_recursive_rule)

    const first_nonrecusive_rule = rules
        .filter(rule => rule[0].cond != target)
        .reverse()
        .reduce((next, rule) => $build_rule(rule, recursive_loop_node, next), return_node)

    const entry_node = new Block()
        .with(["@set", "_save", ["@field", "tks", "index"]])
        .goes_to(first_nonrecusive_rule)

    // build the function
    return new FuncDef(`parse_${target}`, ["tks"], entry_node)
}

function $build(target: string) {
    const funcs = new Map<string, FuncDef>()
    
    for (const rule of RULES) {
        if (!funcs.has(rule.name)) funcs.set(rule.name, $build_ruleset(rule.name))
    }

    for (const unneeded of UNNEEDED.values()) {
        funcs.delete(unneeded)
    }

    const src = funcs
        .values()
        .map(func => func.toJS())
        .toArray()
        .join("")

    try {
        writeFileSync("./out/parser.js", src.replaceAll(";", "\n"))
    } catch {
        // probly in test mode
    }
    return eval(src + `; parse_${target}`)
}

//

function $cond_to_type(cond: string): Type {
    if (cond.startsWith("\"")) return ["@string"]
    if (["ident", "number", "string"].includes(cond)) return ["@string"]
    return [cond]
}

function $step_to_type(step: Step): Type {
    if (step.flag) {
        return ["@array", $cond_to_type(step.cond)]
    } else {
        return $cond_to_type(step.cond)
    }
}

function $ruleset_type(ruleset: string): Type {
    const fields = new Map<string, Type>
    const aliases = new Set<Type>()
    const rules = RULES.filter(rule => rule.name === ruleset) 

    for (const rule of rules) {
        for (const step of rule) {
            if (step.name === "$out") {
                aliases.add($step_to_type(step))
            } else if (step.name) {
                if (fields.has(step.name)) {
                    fields.set(step.name, merge(
                        fields.get(step.name)!,
                        $step_to_type(step)
                    ))
                } else {
                    fields.set(step.name, $step_to_type(step))
                }
            }
        }
    }

    if (fields.size > 0) {
        return ["@struct", fields.entries().toArray()]
        // TODO: What about unions types now?
    } else {
        return ["@union", aliases.values().toArray()]
    }
}

function $build_types() {
    // get a list of all rulesets
    const rulesets = unique(RULES.map(r => r.name))

    // turn each of them into types
    rulesets.forEach(ruleset => TYPES.set(ruleset, $ruleset_type(ruleset)))

    // write out the types
    try {
        writeFileSync("./out/types.ts", typesToJS())
    } catch (_e) {
        // we're probly in a unit test, this is fine
    }
}

export function build_parser<T>(template: TemplateStringsArray): (src: string) => T {
    $parse_rule(template.join(""))
    $build_types()
    const parse = $build("file_node")
    return (src: string) => {
        const ast = parse(lexer(src))
        
        if (!ast) {
            throw new Error("ERR: Failed to parse file!")
        }

        return ast
    }
}
