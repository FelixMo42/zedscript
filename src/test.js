'use strict'

const Rule     = require("./Rule")
const Lexer    = require("./Lexer")
const Parser   = require("./Parser")

let lexer = Lexer([
    [Lexer.singlton("open_paren", "(")],
    [Lexer.singlton("close_paren", ")")],
    [Lexer.multi("pattern", ["*","+","?"])],
    [
        {
            type: "char",

            rule: {type: "char", value: "#"},
            then: Rule.next,
            else: Rule.fail
        },
        {
            rule: {
                type: "not",
                value: {
                    type: "set",
                    values: [
                        {type: "char", value: " "},
                        {type: "char", value: "\t"},
                        {type: "char", value: "\n"}
                    ]
                }
            },
            then: Rule.next,
            else: Rule.fail
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
            then: Rule.loop,
            else: Rule.next
        }
    ]
])

let parser = Parser({
    selector: [
        [
            {
                type: "range",

                rule: {type: "open_paren"},
                then: Rule.next,
                else: Rule.fail
            },
            {
                rule: {type: "char"},
                then: Rule.next,
                else: Rule.fail,

                as: "start"
            },
            {
                rule: {type: "word", value: "to"},
                then: Rule.next,
                else: Rule.fail
            },
            {
                rule: {type: "char"},
                then: Rule.next,
                else: Rule.fail,

                as: "end"
            },
            {
                rule: {type: "close_paren"},
                then: Rule.next,
                else: Rule.fail
            }
        ]
    ],
    segment: [
        [
            {
                type: "segment",

                rule: {type: "selector"},
                then: Rule.next,
                else: Rule.fail,

                as: "rule"
            },
            {
                rule: {type: "pattern"},
                then: Rule.next,
                else: Rule.next,

                as: "pattern"
            }
        ]
    ],
    rule: [
        [
            {
                type: "rule",

                rule: {type: "segment"},
                then: Rule.loop,
                else: Rule.next,

                as: "segments"
            }
        ]
    ]
}, {
    char: (node) => ({
        type: "char",
        value: node.value[1]
    }),
    segment: (node) => Rule.make(node.rule, node.pattern.value),
    rule: (node) => node.segments.reduce((rules, rule) => rules.concat(...rule)) 
}, "rule")

///

let file = `
    (#0 to #9)+ (#0 to #9)*
`
let tokens = lexer(file)

console.log("=== tokens ===>")
console.log(tokens)
console.log("<==============")

let ast = parser(tokens)

console.log("=== ast ===>")
console.log(ast)
console.log("<===========")