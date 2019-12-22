let Ruleset   = require("./Rule")
let Reader    = require("./Reader")
let { Stack } = require("immutable")

let tokenTypes = new Set(["number", "string", "word"])

let tokens = function *() {
    for (token of [
        {type:"syntax", body:"let"},
        {type:"word", body:"x"},
        {type:"number", body:"5"},
        {type:"word", body:"x"}
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
    console.log("cheacking:", rule, "=", token)

    if (rule.type == "syntax" && token.type == "syntax") {
        if (rule.body == token.body) {
            return true
        }
    } else if (rule.type == "block") {
        if (tokenTypes.has(rule.body) && rule.body == token.type) {
            return true
        } else {
            parse()
        }
    }

    return false
}

const defineRule = (rule, index) =>
    rule.length == index ? 
        ruleset.done({type: "bla"}) :
        ruleset.rule(
            [
                (token) => cheacktoken(rule[index], token),
                defineRule(rule, index + 1)
            ],
            [ ruleset.else, ruleset.fail ]
        )

const defineRules = (rules) => ruleset.rule( ...rules.map((rule) => {
    let rules = rule.split(" ").map((text) => ({
        type: text[0] == "@" ? "syntax" : "block",
        body: text.slice(1)
    }))

    return [
        (token) => cheacktoken(rules[0], token),
        defineRule(rules, 1)
    ]
}), [ruleset.else, ruleset.fail])

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

function parse(tokens, target) {
    let i = 0

    let reader = Reader.generator(tokens)

    console.log(
        rules[target](reader)
    )
}

parse(tokens, "value")