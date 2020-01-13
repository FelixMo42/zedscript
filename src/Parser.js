let { Stack } = require('immutable');


let parse = (type, step, tokens, index, nexts, fails) => {
    let { quantifier, rule } = type.pattern[step]

    if (rule.type == "") {

    }

    if (rule.type == "") {

    }
}

let compare = (rule, token) => rule.name == token

let parse = (rule, step, index, next, fail) => {
    
}

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
    type: "loop_step",
    quantifier: LOOP,
    rule: rule
})

let OptStep = (rule) => ({
    type: "opt_step",
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