const Reader  = require("./Reader")
const Ruleset = require("./Rule")

// Lexer

class Lexer {
    constructor(...rules) {
        this.rules = rules
    }

    *tokenize(text) {
        if (text.done) { return }

        for (let rule of this.rules) {
            let [next, token] = rule(text)

            if ( token.type != "fail" ) {
                yield token

                yield *this.tokenize(next)
                
                return
            }
        }

        console.warn(`Failed to tokenize character: "${text.value}"`)
    }
}

// number


let whitespace = " \t\n"
let punctuation = "()" + whitespace

let ruleset = new Ruleset({
    steper: {
        start: () => "",
        step: (step, value) => step + value
    }
})

let word = ruleset.rule(
    [
        (char) => !punctuation.includes(char),
        ruleset.loop
    ],
    [
        ruleset.else,
        ruleset.done({ type: "word" })
    ]
)

let postDotNumber = ruleset.rule(
    [
        (char) => "0123456789".includes(char),
        ruleset.loop,
    ],
    [
        (char) => punctuation.includes(char),
        ruleset.done({type: "number"})
    ],
    [
        ruleset.else,
        word
    ]
)

let preDotNumber = ruleset.rule(
    [
        (char) => ".".includes(char),
        postDotNumber,
    ],
    [
        (char) => "0123456789".includes(char),
        ruleset.loop,
    ],
    [
        (char) => punctuation.includes(char),
        ruleset.done({type: "number"})
    ],
    [
        ruleset.else,
        word
    ]
)

let baserule = ruleset.rule(
    [
        (char) => "'".includes(char),
        ruleset.rule(
            [
                (char) => "'" === char,
                ruleset.done({type: "string"})
            ],
            [
                ruleset.else,
                ruleset.loop
            ]
        ),
    ],
    [
        (char) => "+-".includes(char),
        ruleset.rule(
            [
                (char) => ".".includes(char),
                postDotNumber,
            ],
            [
                (char) => "0123456789".includes(char),
                preDotNumber,
            ],
            [
                (char) => punctuation.includes(char),
                ruleset.done({ type: "word"})
            ],
            [
                ruleset.else,
                word
            ]
        ),
    ],
    [
        (char) => ".".includes(char),
        postDotNumber,
    ],
    [
        (char) => "0123456789".includes(char),
        preDotNumber,
    ],
    [
        (char) => whitespace.includes(char),
        ruleset.done({type: "whitespace", eat: true}),
    ],
    [
        (char) => punctuation.includes(char),
        ruleset.done({type: "punctuation", eat: true}),
    ],
    [
        ruleset.else,
        word
    ]
)

// ruleset.make(
//     [
//         (char) => "+-".includes(char), "continue", "fail",          // continue
//         (char) => "0123456789".includes(char),  "loop", "continue", // loop then continue
//         (char) => ".".includes(char), "continue", "fail",           // continue
//         (char) => "0123456789".includes(char), "continue", "done"   // loop then done
//     ],
//     [
//         (char) => true // !punctuation then loop else done
//     ],
//     [
//         (char) => char == " " // then done
//     ]
// )

// optinal
// multiple

// let token = baserule(reader)


const keywords = new Set(["fn", "let", "if"])

const wrapper = (file) => {
    let text = Reader(file)

    let lexer = new Lexer(baserule)
    let tokens = lexer.tokenize(text)

    let struc = []
    let result = tokens.next()
    while (!result.done) {
        if (struc.type == "word") {
            if (keywords.has( struc.body )) {
                struc.type = "punctuation"
            }
        }
        struc.push(result.valueue)
        result = tokens.next()
    }

    return struc
}

wrapper.strip = (tokens) => tokens.filter(token => token.type !== "whitespace")

module.exports = wrapper