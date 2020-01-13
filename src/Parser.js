let { Stack } = require('immutable');


let parse = async (type, step, tokens, index, then, fail) => {
    let { rule, quantifier } = type.pattern[step]

    if ( rule.type == "token" ) {

        let successful = compare(rule, tokens[index]) 

        if (successful) {
            then()
        } else {
            fail()
        }

    } else if ( rule.type == "type" ) {
        
        parse(rule, 0, tokens, index,
            thens,
            fails
        )

    } else {
        console.log(`Invalid type: ${type}`)
    }
}

let compare = (rule, token) => rule.name == token


let Parser = (baseType, tokens) => {
    
}

let Token = (name) => ({type: "token", name}) 

let Type = ({name, pattern}) => ({
    type: "type",
    name, pattern
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
    pattern: [
        Step( Token("s") ),
        Step( Token("e") ),
        Step( Token("s") )
    ]
})

let f = Type({
    name: "f",
    pattern: [
        LoopStep( r ),
    ]
})

//

console.log( Parser(f, ["s","e","s"]) )