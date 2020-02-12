const {red, gray, green, blue} = require("chalk")

// tokens

let file = "let a = 12.5 abc"

let tokens = (() => {
    let Token = (name, body) => ({name, body})

    return [
        Token("let", "let"),
        Token("word", "a"),
        Token("equal", "="),
        Token("number", "12.5"),
        Token("word", "abc")
    ]
})()

// logic

let  totalSuccses = true

let error = (msg, index) => () => {
    totalSuccses = false

    console.log(`${red("Error:")} ${msg}\n`)

    let string1 = ""
    let string2 = ""

    for (let i in tokens) {
        let token = tokens[i]

        string1 += token.body + " "
        string2 += (i == index ? "^" : " ").repeat(token.body.length) + " "
    }

    console.log(string1)
    console.log(string2)

    console.log("\n")
}

let Success = (value, index) => ({success: true, value, index})
let Failure = (value, index) => ({success: false, value, index})

const modes = {
    NEXT: 0,
    SKIP: 1,
    LOOP: 2
}

function log(wraped) {
    return (rule, index) => {
        let match = wraped(rule, index)

        return match
    }
}

let parse = log( (rule, index) => {
    if (rule.type == "Sequence") {
        let ogIndex = index

        let node = {}

        let parseStep = (i) => {
            let step = rule.steps[i]

            let match = parse(step, index)

            if ( match.success ) {
                if ( "as" in step ) {
                    node[ step.as ] = match.value
                }

                index = match.index
            }

            return match
        }

        let match = parseStep(0)

        if ( !match.success ) {
            return Failure(match.value, ogIndex)
        }

        for (let i = 1; i < rule.steps.length; i++) {
            let match = parseStep(i)

            if ( !match.success ) {
                match.value()

                return Success(node, index)
            }
        }

        return Success(node, index)
    }

    if (rule.type == "Parallel") {
        for (let step of rule.steps) {
            let match = parse(step, index)

            if ( match.success ) {
                return match
            }
        }

        if (index < tokens.length) {
            error(`Unexpected ${tokens[index].name}`, index)()

            return Success(null, index + 1)
        } else {
            return Failure(null, index)
        }
    }

    if (rule.type == "Skip") {
        return Success(0, index)
    }

    if (rule.type == "Loop") {
        let values = []

        while (true) {
            let match = parse(rule.step, index)

            if ( !match.success ) {
                break
            }

            index = match.index

            values.push( match.value )
        }

        return Success(values, index)
    }

    if (rule.type == "Token") {
        return index < tokens.length && rule.name == tokens[index].name ?
            Success(tokens[index].body, index + 1) :
            Failure(
                error(`Got ${index < tokens.length ? tokens[index].name : "EOF"}, expected ${rule.name}`, index),
                index
            )
    }

    console.error(`${red("Error: ")} Invalid rule type: ${rule.type}`)
} )

// rules

let Token = (name) => ({type: "Token", name})
let as = (rule, as) => ({...rule, as})

let Sequence = (...steps) => ({type: "Sequence", steps})
let Parallel = (...steps) => ({type: "Parallel", steps})

let Skip = (step) => ({type: "Skip", step})
let Loop = (step) => ({type: "Loop", step})

// rules

let letRule = Sequence(
    Token("let"),
    as(Token("word"), "name"),
    Token("equal"),
    as(Token("number"), "value")
)

let valueRule = Parallel(
    letRule,
    {type: "Token", name: "number"}
)

let fileRule = Loop(valueRule)

let { success, value, index } = parse(fileRule, 0)

console.log( "\nOutput:", value, "\n" )