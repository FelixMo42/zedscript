const Parser = require("./Parser")

// tokens

let parse = Parser(((file) => {
    let parse = Parser(file)

    let Token = (name, body) => ({name, body})

    return parse({}, 0)
    // [
    //     Token("let", "let"),
    //     Token("word", "a"),
    //     Token("equal", "="),
    //     Token("number", "12.5"),
    //     Token("word", "abc")
    // ]
})("let a = 12.5 abc"))

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