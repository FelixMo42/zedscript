let tokens = function *() {
    for (token of [
        {type:"syntax", body:"let"},
        {type:"word", body:"x"},
        {type:"number", body:"5"}
    ]) {
        yield token
    }
}()

let values = [
    "@let :word :value :value",
    "@fn :word @: :value",
    
    ":word",

    ":number",
    ":string"
]

let rules = values.map(value => value.split(" ").map((segment) => ({
    type: segment[0] == "@" ? "syntax" : "block",
    body: segment.substring(1)
})))

// console.log(rules)

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

function parse(tokens) {
    let i = 0

    let token = tokens.next()

    for (let rule of rules) {
        if ( cheackrule(rule[0], token) ) {
            console.log(rule)
        }
    }

    console.log("Failed to tokenize: ", token)
}

parse(tokens)