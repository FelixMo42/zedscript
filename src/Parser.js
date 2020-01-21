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

/**
 * 
 * @param {*} baseType 
 * @param {*} tokens 
 */
let Parser = (baseType, tokens) => {
    let makeStep =
        (step, then, fail) =>
            function self(index, state) {
                
                parse(
                    step.rule, index,
                    isLoop(step) ?
                        self :
                        then,
                    fail,
                    state
                )

                if ( isSkipable(step) ) {
                    then(index, state)
                }
            }

    /**
     * 
     * @param {Rule} rule - the rule to parse
     * @param {number} index - what token were currently on
     * @param {parseCallback} then - called if success on match
     * @param {parseCallback} fail - called if failure on match
     */
    let parse = (rule, index, then, fail, state) => {

        if ( rule.type == "type" ) {

            let first = rule.steps.reduceRight(
                (then, step) => makeStep(step, then, fail, state),
                then
            )

            first(index, state)

        } else if ( rule.type == "token" ) {

            let successful = compare(rule, tokens[index])

            console.debug(`${state}${rule.name} ${successful ? "✔" : "x"} (${index})`)

            if (successful) {
                then(
                    index + 1,
                    " ".repeat(state.length+2)
                )
            } else {
                fail(
                    index,
                    " ".repeat(state.length+2)
                )
            }

        } else {
            console.log(`Invalid type: ${rule.type}`)
        }
    }

    return parse(
        baseType, 0,
        new Stack(),
        new Stack(),
        ""
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
