'use strict'

const Rule   = require("./Rule")
const Lexer  = require("./Lexer")
const Parser = require("./Parser")

let lexer = Lexer([
    [Lexer.singlton("open_paren", "(")],
    [Lexer.singlton("close_paren", ")")],
    [Lexer.singlton("open_set", "[")],
    [Lexer.singlton("close_set", "]")],
    [Lexer.singlton("!", "!")],
    [Lexer.singlton("=", "=")],
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
                        {type: "char", value: "\n"},
                        {type: "char", value: "\n"},
                    ]
                }
            },
            then: Rule.next,
            else: Rule.fail
        }
    ],
    [
        {
            type: "identifier",
            rule: {type: "char", value: ":"},
            then: Rule.next,
            else: Rule.fail
        },
        {
            rule: {type: "not", value: {
                type: "set",
                values: [
                    {type: "char", value: " "},
                    {type: "char", value: "\t"},
                    {type: "char", value: "\n"},
                ]
            }},
            then: Rule.loop,
            else: Rule.next
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
                    {type: "char", value: "["},
                    {type: "char", value: "]"},
                    {type: "char", value: "#"},
                    {type: "char", value: "="},
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
                type: "match",

                rule: {type: "char"},
                then: Rule.next,
                else: Rule.fail,

                as: "value"
            }
        ],
        [
            {
                type: "not",

                rule: {type: "!"},
                then: Rule.next,
                else: Rule.fail,
            },
            {
                type: "not",

                rule: {type: "selector"},
                then: Rule.next,
                else: Rule.fail,

                as: "value"
            }
        ],
        [
            {
                type: "set",

                rule: {type: "open_set"},
                then: Rule.next,
                else: Rule.fail,
            },
            {
                rule: {type: "selector"},
                then: Rule.loop,
                else: Rule.next,

                as: "values"
            },
            {
                rule: {type: "close_set"},
                then: Rule.next,
                else: Rule.fail
            }
        ],
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

                rule: {type: "identifier"},
                then: Rule.next,
                else: Rule.fail,

                as: "name"
            },
            {
                rule: {type: "="},
                then: Rule.next,
                else: Rule.fail
            },
            {
                rule: {type: "segment"},
                then: Rule.loop,
                else: Rule.next,

                as: "segments"
            }
        ]
    ],
    file: [
        [
            {
                type: "file",

                rule: {type: "rule"},
                then: Rule.loop,
                else: Rule.next,

                as: "rules"
            }
        ]
    ]
}, {
    char: (node) => ({
        type: "char",
        value: node.value[1]
    }),
    identifier: (node) => ({
        type: "identifier",
        value: node.value.substring(1)
    }),
    segment: (node) => {
        if ("pattern" in node) {
            return Rule.make(node.rule, node.pattern.value)
        } else {
            return Rule.make(node.rule, "-")
        }
    },
    rule: (node) => {
        let rules = node.segments.reduce(
            (rules, segment) => rules.concat(...segment)
        )

        rules[0].type = node.name.value

        return rules
    },
    file: (node) => node.rules
}, "file")

///

let file = `
    :open_paren   = #(
    :close_parent = #)

    :open_set  = #[
    :close_set = #]

    :! = #!
    := = #=

    :pattern = [#* #+ #? #-]

    :char = ## ![#a]

    :identifier = #: ![#a]+

    :word = [(#a to #z) (#A to #Z)]+
`

let tokens = lexer(file)

console.log("=== tokens ===>")
console.log(tokens)
console.log("<==============")

let ast = parser(tokens)

console.log("=== ast ===>")
console.log(ast)
console.log("<===========")