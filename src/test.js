'use strict'

const fs       = require("fs")
const Rule     = require("./Rule")
const Lexer    = require("./Lexer")
const Parser   = require("./Parser")
const Formater = require("./Formater")

let load = (location) =>
    JSON.parse(fs.readFileSync(`out/${location}.json`))

let save = (data, location) =>
    fs.writeFileSync(
        `out/${location}.json`,
        JSON.stringify(data, undefined, "\t")
    )

let testMode = true

let Token = (type, rules) => ({
    type: type,
    steps: rules
})

Token.single = (char) => [
    {
        rule: {type: "match", value: char},
        then: Rule.next,
        else: Rule.fail
    }
]

Token.set = (chars) => [
    {
        rule: {
            type: "set",
            values: chars.map(char => ({type: "match", value: char}))
        },
        then: Rule.next,
        else: Rule.fail
    }
]

let lexer = testMode ?
    Lexer( load("plon") ) :

    Lexer([
        Token("open_paren", Token.single("(")),
        Token("close_paren", Token.single(")")),
        Token("open_set", Token.single("[")),
        Token("close_set", Token.single("]")),
        Token("!", Token.single("!")),
        Token("=", Token.single("=")),
        Token("qualifier", Token.set(["*","+","?","-"])),
        Token("char", [
            {
                rule: {type: "match", value: "#"},
                then: Rule.next,
                else: Rule.fail
            },
            {
                rule: {
                    type: "not",
                    value: {
                        type: "set",
                        values: [
                            {type: "match", value: " "},
                            {type: "match", value: "\t"},
                            {type: "match", value: "\n"},
                            {type: "match", value: "\n"},
                        ]
                    }
                },
                then: Rule.next,
                else: Rule.fail
            }
        ]),
        Token("special_char", [
            {
                rule: {type: "match", value: "\\"},
                then: Rule.next,
                else: Rule.fail
            },
            {
                rule: {
                    type: "not",
                    value: {
                        type: "set",
                        values: [
                            {type: "match", value: " "},
                            {type: "match", value: "\t"},
                            {type: "match", value: "\n"},
                            {type: "match", value: "\n"},
                        ]
                    }
                },
                then: Rule.next,
                else: Rule.fail
            }
        ]),
        Token("identifier", [
            {
                type: "identifier",
                rule: {type: "match", value: ":"},
                then: Rule.next,
                else: Rule.fail
            },
            {
                rule: {type: "not", value: {
                    type: "set",
                    values: [
                        {type: "match", value: " "},
                        {type: "match", value: "\t"},
                        {type: "match", value: "\n"},
                    ]
                }},
                then: Rule.loop,
                else: Rule.next
            }
        ]),
        Token("word", [
            {
                rule: {type: "not", value: {
                    type: "set",
                    values: [
                        {type: "match", value: " "},
                        {type: "match", value: "\t"},
                        {type: "match", value: "\n"},
                        {type: "match", value: "("},
                        {type: "match", value: ")"},
                        {type: "match", value: "["},
                        {type: "match", value: "]"},
                        {type: "match", value: "#"},
                        {type: "match", value: "="},
                    ]
                }},
                then: Rule.loop,
                else: Rule.next
            }
        ])
    ])

let parser = Parser({
    char: [
        Token("node", [
            {
                rule: {type: "special_char"},
                then: Rule.next,
                else: Rule.fail,

                as: "value"
            }
        ])
    ],
    rule: [
        Token("match", [
            {
                rule: {type: "char"},
                then: Rule.next,
                else: Rule.fail,

                as: "value"
            }
        ]),
        Token("not", [
            {
                rule: {type: "!"},
                then: Rule.next,
                else: Rule.fail,
            },
            {
                rule: {type: "rule"},
                then: Rule.next,
                else: Rule.fail,

                as: "value"
            }
        ]),
        Token("set", [
            {
                rule: {type: "open_set"},
                then: Rule.next,
                else: Rule.fail,
            },
            {
                rule: {type: "rule"},
                then: Rule.loop,
                else: Rule.next,

                as: "values"
            },
            {
                rule: {type: "close_set"},
                then: Rule.next,
                else: Rule.fail
            }
        ]),
        Token("range", [
            {
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
        ])
    ],
    step: [
        Token("step", [
            {
                rule: {type: "rule"},
                then: Rule.next,
                else: Rule.fail,

                as: "rule"
            },
            {
                rule: {type: "qualifier"},
                then: Rule.next,
                else: Rule.next,

                as: "qualifier"
            }
        ])
    ],
    pattern: [
        Token("pattern", [
            {
                rule: {type: "identifier"},
                then: Rule.next,
                else: Rule.fail,

                as: "type"
            },
            {
                rule: {type: "="},
                then: Rule.next,
                else: Rule.fail
            },
            {
                rule: {type: "step"},
                then: Rule.loop,
                else: Rule.next,

                as: "steps"
            }
        ])
    ],
    file: [
        Token("file", [
            {
                rule: {type: "pattern"},
                then: Rule.loop,
                else: Rule.next,

                as: "patterns"
            }
        ])
    ]
}, "file")

let formater = Formater({
    char: (value) => value.charCodeAt(1),
    special_char:  (value) => {
        return ({
        "n": "\n",
        "r": "\r",
        "t": "\t",
        "b": "\b",
        "f": "\f",
        "v": "\v",
        "s": " "
    })[value[1]].charCodeAt(0)},
    identifier: (value) => value.substring(1),

    node: (node) => node.value,

    step: (node) => Rule.make(node.rule, node.qualifier || "-"),
    pattern: (node) => ({
        type: node.type,
        steps: node.steps.reduce((steps, step) => steps.concat(...step)) 
    }),
    file: (node) => node.patterns
})

///

let file = `
    :open_paren   = #(
    :close_paren = #)

    :open_set  = #[
    :close_set = #]

    :! = #!
    := = #=

    :pattern = [#* #+ #? #-]

    :char = ## ![\\n \\s \\t]

    :identifier = #: ![\\n \\s \\t]+

    :word = [(#a to #z) (#A to #Z)]+
`

let tokens = lexer(file)

save(tokens, "tokens")

console.log("=== tokens ===>")
console.log(tokens)
console.log("<==============")

let ast = parser(tokens)

save(ast, "ast")

console.log("=== ast ===>")
console.log(ast)
console.log("<===========")

let plon = formater(ast)

if (!testMode) {
    save(plon, "plon")
}

console.log("=== plon ===>")
console.log(plon)
console.log("<============")