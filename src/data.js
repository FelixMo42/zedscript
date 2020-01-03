const _    = require("lodash")
const Rule = require("./lpon/Rule")

let Pattern = (type, rules) => ({
    type: type,
    steps: rules
})

let parserRules = {
    char: [
        Pattern("node", [
            {
                rule: {type: "special_char"},
                then: Rule.next,
                else: Rule.fail,

                as: "value"
            }
        ])
    ],
    rule: [
        Pattern("match", [
            {
                rule: {type: "char"},
                then: Rule.next,
                else: Rule.fail,

                as: "value"
            }
        ]),
        Pattern("not", [
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
        Pattern("set", [
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
        Pattern("range", [
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
        Pattern("step", [
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
        Pattern("pattern", [
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
        Pattern("file", [
            {
                rule: {type: "pattern"},
                then: Rule.loop,
                else: Rule.next,

                as: "patterns"
            }
        ])
    ]
}

let parserDefault = "file"

let formaterRules = {
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

    step: (node) => Rule.step.make(node.rule, node.qualifier || "-"),
    pattern: (node) => ({
        type: node.type,
        steps: node.steps.reduce((steps, step) => steps.concat(...step)) 
    }),
    file: (node) => node.patterns
}

module.exports = { parserRules, parserDefault,  formaterRules }