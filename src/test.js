const Lexer  = require("./Lexer")
const Parser = require("./Parser")

let lexer = Lexer([
    [Lexer.singlton("open_paren", "(")],
    [Lexer.singlton("close_paren", ")")],
    [Lexer.multi("modifier", ["*","+","?"])],
    [
        {
            type: "char",

            rule: {type: "char", value: "#"},
            then: Lexer.ruleset.next,
            else: Lexer.ruleset.fail,
        },
        {
            rule: {type: "not", value: {
                type: "set",
                values: [
                    {type: "char", value: " "},
                    {type: "char", value: "\t"},
                    {type: "char", value: "\n"}
                ]
            }},
            then: Lexer.ruleset.next,
            else: Lexer.ruleset.fail,
        }
    ],
    [
        {
            type: "word",

            rule: {type: "not", value: {
                type: "set",
                values: [
                    {type: "char", value: " "},
                    {type: "char", value: "\t"},
                    {type: "char", value: "\n"},
                    {type: "char", value: "("},
                    {type: "char", value: ")"},
                    {type: "char", value: "#"},
                ]
            }},
            then: Lexer.ruleset.loop,
            else: Lexer.ruleset.next,
        }
    ]
])

let parser = Parser({
    set: [
        [
            {
                type: "range",

                rule: {type: "open_paren"},
                then: Lexer.ruleset.next,
                else: Lexer.ruleset.fail
            },
            {
                rule: {type: "char"},
                then: Lexer.ruleset.next,
                else: Lexer.ruleset.fail,

                as: "start"
            },
            {
                rule: {type: "word", value: "to"},
                then: Lexer.ruleset.next,
                else: Lexer.ruleset.fail
            },
            {
                rule: {type: "char"},
                then: Lexer.ruleset.next,
                else: Lexer.ruleset.fail,

                as: "end"
            },
            {
                rule: {type: "close_paren"},
                then: Lexer.ruleset.next,
                else: Lexer.ruleset.fail
            }
        ]
    ],
    segment: [
        [
            {
                type: "rule",

                rule: {type: "set"},
                then: Lexer.ruleset.next,
                else: Lexer.ruleset.fail,

                as: "rule"
            },
            {
                rule: {type: "modifier"},
                then: Lexer.ruleset.next,
                else: Lexer.ruleset.fail,

                as: "modifier"
            }
        ]
    ]
}, "segment")

///

let file = `
    (#0 to #9)*
`
let tokens = lexer(file)

console.log(tokens)

let ast = parser(tokens)

console.log(ast)