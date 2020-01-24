const { Stack } = require("immutable")

/**
 * @callback parseCallback
 * 
 * @param {index} index - what token were currently on
 */

/**
 * 
 * @param {Rule} rule 
 * @param {Token} token 
 */
let compare = (rule, token) => rule.name == token

let isSkipable = (step) =>
    step.quantifier == LOOP ||
    step.quantifier == SKIP

let isLoop = (step) => 
    step.quantifier == LOOP

let Error = (msg) => ({type: "error", msg})

let Node = (type, value, arr) => {
    let node = {type, value, children: []}
    // arr.push(node)
    return node
}

(index) => {

}

/**
 * 
 * @param {*} baseType 
 * @param {*} tokens 
 */
let Parser = (baseType, tokens) => {
    /**
     * 
     * @param {Rule} rule - the rule to parse
     * @param {number} index - what token were currently on
     * @param {Stack} then - called if success on match
     * @param {Stack} fail - called if failure on match
     */
    let parse = (rule, index, then, fail, state, parent) => {

        if ( rule.type == "type" ) {

            rule.steps.reduceRight(
                ([then, fail], step) => {
                    let node = {values: []}
                    parent.push(node)

                    step.quantifier == NEXT
                        new Stack()
                        fail

                    step.quantifier == LOOP
                        then.push()
                        fail

                    step.quantifier == SKIP
                        then
                        fail

                    parse(
                        step.rule,
                        index,
                        then,
                        fail,
                        node.values
                    )
                },
                [then, fail]
            )

        } else if ( rule.type == "token" ) {

            let successful = compare(rule, tokens[index])

            console.debug(`${state}${rule.name} ${successful ? "✔" : "x"} (${index})`)

            if (successful) {
                then(index + 1)
            } else {
                fail(index)
            }

        } else {
            console.log(`Invalid type: ${rule.type}`)
        }
    }

    return parse(
        baseType, 0,
        new Stack(),
        new Stack(),
        "",
        []
    )
}

let Token = (name) => ({type: "token", name}) 

let Type = ({name, steps}) => ({
    type: "type",
    name, steps
})

let NEXT = 0
let LOOP = 1
let SKIP = 2
let FAIL = 3

let Step = (rule) => ({
    type: "step",
    quantifier: NEXT,
    rule: rule,
})

let LoopStep = (rule) => ({
    type: "step",
    quantifier: LOOP,
    rule: rule
})

let OptStep = (rule) => ({
    type: "step",
    quantifier: SKIP,
    rule: rule,
})

///

let r = Type({
    name: "r",
    steps: [
        Step( Token("S") ),
        Step( Token("E") ),
        LoopStep( Token("S") )
    ]
})

let f = Type({
    name: "f",
    steps: [
        LoopStep( r ),
    ]
})

//

let output = Parser(f, ["S", "E", "S","S"])

console.log("\n")

const fs = require("fs-extra")

// fs.writeJSON("temp/out.json", output, {spaces: "\t"})

console.log(output)
