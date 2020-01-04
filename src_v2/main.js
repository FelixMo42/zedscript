const fs = require("fs")
const Builder = require("./lpon/Builder")

const printTokens = true
const printAST    = true
const printBuild  = true

const saveTokens = true
const saveAST    = true
const saveBuild  = true

const saveDir = "src_v2/out/temp"

let Pattern = (type, rules) => ({
    type: type,
    steps: rules
})

let build2 = Builder({
    lexerRules: JSON.parse(fs.readFileSync("src_v2/build.json").toString()),
    parserRules: {
        "name" : [
            {
                type: "name",
                steps: [
                    {
                        rule: {type: "word"},
                        then: 0,
                        else: 2,

                        as: "type"
                    },
                    {
                        rule: {type: "colon"},
                        then: 0,
                        else: 0
                    },
                    {
                        rule: {type: "word"},
                        then: 0,
                        else: 0,

                        as: "callback"
                    }
                ]
            }
        ],
        "pattern": [
            {
                type: "pattern",
                steps: [
                    {
                        rule: {type: "name"}
                    }
                ]
            }
        ],
        "type" : [
            {
                type: "type",
                steps: [
                    {
                        rule: {type: "name"},
                        then: 0,
                        else: 2,

                        as: "identifier"
                    },
                    {
                        rule: {type: "equal"},
                        then: 0,
                        else: 2
                    },
                    {
                        rule: {type: "parenthesis"},
                        then: 0,
                        else: 2,

                        as: "steps"
                    }
                ]
            }
        ]
    },
    parserDefault: "type",
    formaterRules: {},

    printTokens, printAST, printBuild
})(
    fs.readFileSync("src_v2/source.lpon").toString()
)

fs.writeFileSync(
    "src_v2/build2.json",
    JSON.stringify(build2, undefined, "\t")
)