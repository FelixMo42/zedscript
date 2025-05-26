import { lexer } from "../lang/lexer.ts"
import { writeFileSync } from "node:fs"

// TYPES //

interface Step {
    name?: string
    cond: string
    flag: string
}

type Rule = Step[] & { name: string }

const RULES   = [] as Rule[]

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

// BUILD //

function $build_cond(cond: string) {
    if (cond.startsWith("\"")) return `tks.take(${cond})`
    if (["ident", "number", "string"].includes(cond)) return `tks.take("<${cond}>")`
    return `parse_${cond}(tks)`
}

function $build_rule(rule: Rule) {
    let src = ""
    let number_of_closing_brakets = 0

    // rule matching steps
    for (const step of rule) {
        if (step.name) {
            if (step.flag === "*" || step.flag === ",") {
                src += `${step.name} = [];`
                src += `while (true) {`
                src += `const _temp = ${$build_cond(step.cond)};`
                src += `if (!_temp) break;`
                if (step.flag === ",") src += "tks.take(\",\");"
                src += `${step.name}.push(_temp);`
                src += "}"
            } else if (types.get(rule.name)?.get(step.name)?.includes("[]")) {
                src += `${step.name} = ${$build_cond(step.cond)};`
                src += `if (${step.name}) {`
                src += `${step.name} = [${step.name}];`
                number_of_closing_brakets++
            } else {
                src += `${step.name} = ${$build_cond(step.cond)};`
                src += `if (${step.name}) {`
                number_of_closing_brakets++
            }
        } else {
            src += `if (${$build_cond(step.cond)}) {`
            number_of_closing_brakets++
        }
    }

    // what should this rule return?
    if (rule.find(r => r.name === "$out")) {
        src += `_node = $out; break;`
    } else {
        const defined_fields = rule.filter(r => r.name != undefined).map(r => r.name) as string[]

        const undefined_fields = types
            .get(rule.name)!
            .keys()
            .filter((field) => !defined_fields.includes(field))
            .filter((field) => types.get(rule.name)!.get(field)?.includes("[]"))
            .map((field) => `${field}: []`)

        const fields = [...defined_fields, ...undefined_fields].join(",")

        src += `_node = { kind: "${rule.name.toUpperCase()}", ${fields} }; break;`
    }

    // add closing brackets
    src += "}".repeat(number_of_closing_brakets)
    src += "tks.load(_save);"

    return src
}

function $build_recursive_rule(rule: Rule) {
    let src = ""
    let number_of_closing_brakets = 0

    // rule matching steps
    for (const step of rule.slice(1)) {
        if (step.name) {
            if (step.flag === "*" || step.flag === ",") {
                src += `${step.name} = [];`
                src += `while (true) {`
                src += `const _temp = ${$build_cond(step.cond)};`
                src += `if (!_temp) break;`
                if (step.flag === ",") src += "tks.take(\",\");"
                src += `${step.name}.push(_temp);`
                src += "}"
            } else if (types.get(rule.name)?.get(step.name)?.includes("[]")) {
                src += `${step.name} = ${$build_cond(step.cond)};`
                src += `if (${step.name}) {`
                src += `${step.name} = [${step.name}];`
                number_of_closing_brakets++
            } else {
                src += `${step.name} = ${$build_cond(step.cond)};`
                src += `if (${step.name}) {`
                number_of_closing_brakets++
            }
        } else {
            src += `if (${$build_cond(step.cond)}) {`
            number_of_closing_brakets++
        }
    }

    // what should this rule return?
    if (rule.find(r => r.name === "$out")) {
        src += `_node = $out; continue;`
    } else {
        const defined_fields = rule
            .filter(r => r.name != undefined)
            .map(r => r.name) as string[]

        defined_fields[0] = `${rule[0].name}:_node`

        const undefined_fields = types
            .get(rule.name)!
            .keys()
            .filter((field) => !defined_fields.includes(field))
            .filter((field) => types.get(rule.name)!.get(field)?.includes("[]"))
            .map((field) => `${field}: []`)

        const fields = [...defined_fields, ...undefined_fields].join(",")

        src += `_node = { kind: "${rule.name.toUpperCase()}", ${fields} }; continue;`
    }

    // add closing brackets
    src += "}".repeat(number_of_closing_brakets)
    src += "tks.load(_save);"

    return src
}

const UNNEEDED = new Set<string>()

function $build_ruleset(target: string) {
    let src = ""

    // what rules are gonna be included?
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

    // get a list of all local variables used in the function
    const locals = new Set<string>()
    locals.add("_node").add("_save")
    for (const rule of rules) {
        rule.filter(rule => rule.name)
            .forEach(rule => locals.add(rule.name!))
    }

    // build the function
    src += `function parse_${target}(tks) {`
    src += `let ${[...locals.values()].join(",")};`
    src += `_save = tks.save();`

    src += "while (true) {"
    src += rules.filter(rule => rule[0].cond != target).map($build_rule).join("")
    src += "return}"

    src += "while (true) {"
    src += `_save = tks.save();`
    src += rules.filter(rule => rule[0].cond === target).map($build_recursive_rule).join("")
    src += "break}"
    src += "return _node"

    src += `}`

    return src
}

function $build(target: string) {
    const parts = new Map<string, string>()
    
    for (const rule of RULES) {
        if (!parts.has(rule.name)) parts.set(rule.name, $build_ruleset(rule.name))
    }

    for (const unneeded of UNNEEDED.values()) {
        parts.delete(unneeded)
    }

    const src = parts.values().toArray().join("")
    return eval(src + `; parse_${target}`)
}

//

function cond_to_type(cond: string) {
    if (cond.startsWith("\"")) return "string"
    if (["ident", "number", "string"].includes(cond)) return "string"
    if (cond.includes("parse")) return `any`
    return snakeToPascal(cond)
}

function step_to_type(step: Step) {
    return cond_to_type(step.cond) + (step.flag ? "[]" : "")
}

const types = new Map<string, Map<string, string>>()

function $build_types() {
    const alias = new Map<string, Set<string>>()

    RULES.forEach(rule => {
        types.set(rule.name, new Map())
        alias.set(rule.name, new Set())
    })

    for (const type of types.keys()) {
        for (const rule of RULES.filter(rule => rule.name === type)) {
            for (const step of rule.filter(step => step.name)) {
                if (step.name === "$out") {
                    alias.get(type)?.add(step_to_type(step))
                } else {
                    const current = types.get(type)?.get(step.name!)
                    if (current) {
                        if (!current.includes(step_to_type(step).replace("[]", ""))) {
                            const new_type = current + " | " + step_to_type(step)
                            types.get(type)?.set(step.name!, new_type)
                        }
                    } else {
                        types.get(type)?.set(step.name!, step_to_type(step))
                    }
                }
            }
        }
    }

    let src = ""
    for (const [type_name, fields] of types.entries()) {
        src += `export type ${snakeToPascal(type_name)} =\n`
        if (fields.size > 0) {
            src += `    {\n`
            src += `        kind: "${type_name.toUpperCase()}"\n`
            for (const [key, val] of fields.entries()) {
                if (val.includes("[]") && val.includes(" | ")) {
                    src += `        ${key}: (${val.replaceAll("[]", "")})[]\n`
                } else {
                    src += `        ${key}: ${val}\n`
                }
            }
            src += "    }\n"
        }
        for (const a of alias.get(type_name)!.values()) {
            src += `    | ${a}\n`
        }
        src += "\n"
    }
    
    try {
        writeFileSync("./out/types.ts", src)
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

function snakeToPascal(snake: string) {
    return snake
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('')
}
