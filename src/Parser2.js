let Ruleset  = require("./Rule")
let { Stack } = require("immutable")

let tokens = function *() {
    for (token of [
        {type:"syntax", body:"let"},
        {type:"word", body:"x"},
        {type:"number", body:"5"}
    ]) {
        yield token
    }
}()

const ruleset = new Ruleset({
    steper: {
        start: () => new Stack(),
        step: (step, value) => step.push( value )
    }
})

function cheacktoken(rule, token) {
    if (rule.type == "syntax" && token.type == "syntax") {
        if (rule.body == token.body) {
            return true
        }
    }

    if (rule.type == "block") {
        if (rule.body == token.type) {
            return true
        }
    }

    return false
}

const defineRule = (rule) => ruleset.rule(
    [
        (token) => cheacktoken(rule[0], token),
        defineRule()
    ],
    [
        ruleset.else,
        ruleset.fail
    ]
)

const defineRules = (types) => ruleset.rule( ...rules.map(defineRule) )

let rules = {
    "value": defineRules([
        "@let word value value",
        "@fn paramater @: value",
        
        "word",

        "number",
        "string"
    ]),

    "paramater": defineRules([
        "key word",
        "word"
    ])
}

console.log(rules)

function cheackrule(rule, token) {
    if (rule.type == "syntax" && token.type == "syntax") {
        if (rule.body == token.body) {
            return true
        }
    }

    if (rule.type == "block") {
        if (rule.body == token.type) {
            return true
        }
    }

    return false
}

// function parse(tokens, target) {
//     let i = 0

//     let token = tokens.next().value

//     for (let rule of rules[target]) {
//         // console.log(rule)
//         if ( cheackrule(rule[0], token) ) {
//             console.log(rule)
//         }
//     }

//     console.log("Failed to tokenize: ", token)
// }

// parse(tokens, "value")