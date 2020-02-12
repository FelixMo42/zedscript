const Parser = require("./Parser")

let file = "let a = 0.5 abc"

let proc = (match) => {
    if (match == null) { return "" }

    return match[0]
}

let Rule = (name, pattern) => ({name, match: (string) => proc(string.match(pattern))})

let Keyword = (name, text=name) => ({
    name, match: (string) =>
        string.substring(0, text.length) == text ? text : ""
})

let rules = [
    Rule( "whitespace" , /^[\n\t\s\r]*/ ),
    Rule( "number" , /^[+-]?[0-9]*[\.]?[0-9]*/ ),
    Rule( "word", /^[a-zA-Z]*/ ),

    Keyword( "let" ),
    Keyword( "if" ),

    Keyword( "plus", "+" ),
]

function log(bla) {
    console.log(bla)

    return bla
}

let error = ""

while (file.length > 0) {
    let token = rules
        .map(rule => ({name: rule.name, body: rule.match(file)}))
        .reduce( (a, b) =>  a.body.length > b.body.length ? a : b )

    if (token.body.length == 0) {
        error += file[0]

        file = file.substring(1)
    } else {
        if (error != "") {
            console.log(error)
            error = ""
        }

        file = file.substring(token.body.length)

        console.log(token)
    }
}