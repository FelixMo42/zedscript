const Reader  = require("./Reader")
const Ruleset = require("./Rule")

// Lexer

class Lexer {
    constructor(rule) {
        this.rule = rule
    }

    *tokenize(text) {
        if (text.done) { return }

        let [next, token] = this.rule(text)

        if ( token.type == "fail" ) {
            console.warn(`Failed to tokenize character: "${token.body}"`)
        } else {
            yield token
        }

        yield *this.tokenize(next)
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
        (char) => char === 0,
        ruleset.done({ type: "word" })
    ],
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
        (char) => "@" == char,
        ruleset.rule(
            [
                (char) => char === 0,
                ruleset.done({ type: "key" })
            ],
            [
                (char) => !punctuation.includes(char),
                ruleset.loop
            ],
            [
                ruleset.else,
                ruleset.done({ type: "key" })
            ]
        )
    ],
    [
        (char) => whitespace.includes(char),
        ruleset.done({type: "whitespace", eat: true}),
    ],
    [
        (char) => punctuation.includes(char),
        ruleset.done({type: "syntax", eat: true}),
    ],
    [
        ruleset.else,
        word
    ]
)

const keywords = new Set(["fn", "let", "if"])

const wrapper = (file) => {
    let text = Reader.buffer(file)

    let lexer = new Lexer(baserule)
    let tokens = lexer.tokenize(text)

    let struc = []
    let result = tokens.next()
    while (!result.done) {
        if (struc.type == "word") {
            if (keywords.has( struc.body )) {
                struc.type = "syntax"
            }
        }
        struc.push(result.value)
        result = tokens.next()
    }

    return struc
}

wrapper.strip = (tokens) => tokens.filter(token => token.type !== "whitespace")

module.exports = wrapper