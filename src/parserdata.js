const _    = require("lodash")
const fs   = require("fs")
const Rule = require("./lpon/Rule")

let Pattern = (type, rules) => ({
    type: type,
    steps: rules
})

let parserRules =

JSON.parse( fs.readFileSync("src/build.json").toString() )
let temp = 

{
    rule: [
        Pattern("token", [
            {
                rule: {type: "word"},
                then: Rule.next,
                else: Rule.fail,

                as: "value"
            }
        ]),
        Pattern("value", [
            {
                rule: {type: "string"},
                then: Rule.next,
                else: Rule.fail,

                as: "value"
            }
        ])
    ],
    as: [
        Pattern("as", [
            {
                rule: {value: "{"},
                then: Rule.next,
                else: Rule.fail,
            },
            {
                rule: {type: "word"},
                then: Rule.next,
                else: Rule.fail,

                as: "value"
            },
            {
                rule: {value: "}"},
                then: Rule.next,
                else: Rule.fail,
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
                rule: {type: "as"},
                then: Rule.next,
                else: Rule.next,

                as: "as"
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
                rule: {type: "step"},
                then: Rule.loop,
                else: Rule.next,

                as: "rules"
            }
        ])
    ],
    subtype: [
        Pattern("subtype", [
            {
                rule: {type: "colon"},
                then: Rule.next,
                else: Rule.fail
            },
            {
                rule: {type: "word"},
                then: Rule.next,
                else: Rule.fail,

                as: "name"
            },
            {
                rule: {type: "equal"},
                then: Rule.next,
                else: Rule.fail
            },
            {
                rule: {type: "pattern"},
                then: Rule.next,
                else: Rule.fail,

                as: "pattern"
            },
            {
                rule: {type: "newline"},
                then: Rule.next,
                else: Rule.fail
            },
        ])
    ],
    type: [
        Pattern("type", [
            {
                rule: {type: "word"},
                then: Rule.next,
                else: Rule.fail,

                as: "name"
            },
            {
                rule: {type: "newline"},
                then: Rule.next,
                else: Rule.fail
            },
            {
                rule: {type: "subtype"},
                then: Rule.loop,
                else: Rule.next,

                as: "subtypes"
            }
        ])
    ],
    file: [
        Pattern("file", [
            {
                rule: {type: "type"},
                then: Rule.loop,
                else: Rule.next,

                as: "types"
            }
        ])
    ]
}

let parserDefault = "file"

let formaterRules = {
    file: node => 
        node.types.reduce((types, type) => {
            types[type.name] = type.subtypes

            return types
        }, {}),
    subtype: node => ({
        type: node.name,
        steps: node.pattern 
    }),
    pattern: node =>
       node.rules.reduce((steps, step) => steps.concat(...step)),
    as: node => node.value,
    step: node =>
        Rule.step.make(node.rule, node.qualifier || "-", {as: node.as}),
    
    token: node => ({type: node.value}),
    value: node => ({value: node.value}),

    string: value => value.substring(1, value.length - 1)
}

module.exports = { parserRules, parserDefault,  formaterRules }