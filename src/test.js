const Rule = require("./Rule")

const Lexer = (rules) => (file) => {
    let index = 0
    let fileLength = file.length
    let tokens = []

    while (index < fileLength) {
        let token = Lexer.ruleset.longestMatch(rules, file, index)

        if (token.length == 0) {
            index += 1
        } else {
            tokens.push(token)
            index += token.length
        }
    }

    return tokens
}

Lexer.ruleset = Rule.Ruleset({
    tokenize: (rule, file, start, length) => ({
        type: rule[0].type,
        value: file.substring(start, start + length)
    })
})

let line = "(+ 12.5 abc)"

let tokens = [
    [
        {
            rule: (char) => char == "(",
            type: "open_paren",
            then: Rule.next,
            else: Rule.fail 
        }
    ],
    [
        {
            rule: (char) => char == ")",
            type: "close_paren",
            then: Rule.next,
            else: Rule.fail 
        }
    ],
    [
        {
            rule: (char) => "+-".includes(char),
            type: "number",
            then: Rule.loop,
            else: Rule.next
        },
        {
            rule: (char) => "0123456789".includes(char),
            then: Rule.loop,
            else: Rule.next
        },
        {
            rule: (char) => ".".includes(char),
            then: Rule.next,
            else: Rule.next
        },
        {
            rule: (char) => "0123456789".includes(char),
            then: Rule.loop,
            else: Rule.next
        }
    ],
    [
        {
            rule: (char) => char != ")" && char != "(" && char != " ",
            type: "word",
            then: Rule.loop,
            else: Rule.next
        }
    ]
]

let myLexer = Lexer(tokens)

console.log( myLexer(line) )