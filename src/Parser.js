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

/**
 * 
 * @param {*} baseType 
 * @param {*} tokens 
 */
let Parser = (baseType, tokens) => {
    let makeStep =
        (step, then, fail) =>
            function self(index, state) {
                if ( isSkipable(step) ) {
                    then(index, state)
                }
                
                parse(
                    step.rule, index,
                    isLoop(step) ?
                        self :
                        then,
                    fail,
                    state
                )
            }

    /**
     * 
     * @param {Rule} rule - the rule to parse
     * @param {number} index - what token were currently on
     * @param {parseCallback} next - called if success on match
     */
    let parse = (rule, index, then, fail, state) => {

        if ( rule.type == "type" ) {

            let first = rule.steps.reduceRight(
                (then, step) => makeStep(step, then, fail, state),
                then
            )

            first(index, state + rule.name + " ► ")

        } else if ( rule.type == "token" ) {

            let successful = compare(rule, tokens[index]) 

            console.debug(`${state}${rule.name} ${successful ? "✔" : "x"}`)

            if (successful) {
                // console.debug(" ".repeat(state.length) + "▼")

                then(index + 1, " ".repeat(state.length))

                return tokens[index]
            } else {
                fail(index, " ".repeat(state.length))
            }

        }  else {
            console.log(`Invalid type: ${rule.type}`)
        }
    }

    return parse(
        baseType, 0,
        (index) => {},
        (index) => {},
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

console.log(output)