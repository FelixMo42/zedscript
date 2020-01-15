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

/**
 * 
 * @param {*} baseType 
 * @param {*} tokens 
 */
let Parser = (baseType, tokens) => {
    let makeStep = (step, then, fail, depth) => [
        /* success callback */
        (index) => parse(
            step.rule, index,
            then,
            fail,
            depth+2
        ),
    
        /* failure callback */
        isSkipable(step) ?
            (index) => parse(
                step.rule, index,
                isSkipable(step) ? then : fail,
                fail,
                depth+2
            ) :
            () => {}
    ]

    /**
     * 
     * @param {Rule} rule - the rule to parse
     * @param {number} index - what token were currently on
     * @param {parseCallback} next - called if success on match
     */
    let parse = (rule, index, then, fail, depth=0) => {

        if ( rule.type == "type" ) {

            console.debug(" ".repeat(depth) + rule.name + ",")

            let [ first ] = rule.steps.reduceRight(
                ([then, fail], step) => makeStep(step, then, fail, depth),
                [then, fail]
            )

            first(index)

        } else if ( rule.type == "token" ) {

            let successful = compare(rule, tokens[index]) 

            console.debug(
                " ".repeat(depth) +
                rule.name + " " +
                (successful ? "✔" : "x")
            )

            if (successful) {
                then(index + 1)
            } else {
                fail(index + 1)
            }

        }  else {
            console.log(`Invalid type: ${rule.type}`)
        }
    }

    return parse(
        baseType, 0,
        (index) => {},
        (index) => {}
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
        Step( Token("S") )
    ]
})

let f = Type({
    name: "f",
    steps: [
        LoopStep( r ),
    ]
})

//

Parser(f, ["S","E","S"])