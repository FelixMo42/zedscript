//////////////////
// PARSER RULES //
//////////////////

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

/////////////////
// LEXER RULES //
/////////////////

let proc = (match) => {
    if (match == null) { return "" }

    return match[0]
}

let Rule = (name, pattern) => ({name, match: (string) => proc(string.match(pattern))})

let Keyword = (name, text=name) => ({
    name, match: (string) =>
        string.substring(0, text.length) == text ? text : ""
})

let lexerRule = [
    Rule( "whitespace" , /^[\n\t\s\r]*/ ),
    Rule( "number" , /^[+-]?[0-9]*[\.]?[0-9]*/ ),
    Rule( "word", /^[a-zA-Z]*/ ),

    Keyword( "let" ),
    Keyword( "if" ),

    Keyword( "equal", "=" )
]

module.exports = { fileRule, lexerRule }