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

Lexer.condense = (tokenGenerator) => {
    let tokens = []
    let token = tokenGenerator.next()

    while (!token.done) {
        tokens.push(token.value)
        token = tokenGenerator.next()
    }

    return tokens
}

Lexer.strip = (tokens) => tokens.filter(token => token.type !== "whitespace")

Lexer.ruleset = new Ruleset({ steper: {
    start: () => "",
    step: (step, value) => step + value
} })

// Lexer Lexer

function pw(string, value) {
    console.log(string)
    return value
}

let b = (() => {
    const ruleset = Lexer.ruleset

    const punctuation = "+?#() "

    const baseRule = ruleset.rule(
        [
            (char) => char == " ",
            ruleset.done({type: "whitespace", eat: true})
        ],
        [
            (char) => char == "#",
            ruleset.rule(
                [
                    (char) => char === 0,
                    ruleset.fail
                ],
                [
                    ruleset.else,
                    ruleset.done({ type: "character", eat: true })
                ]
            )
        ],
        [
            (char) => punctuation.includes(char),
            ruleset.done({type: "punctuation", eat: true})
        ],
        [
            (char) => char !== 0,
            ruleset.rule(
                [
                    (char) => !punctuation.includes(char) && char !== 0,
                    ruleset.loop
                ],
                [
                    ruleset.else,
                    ruleset.done({ type: "word" })
                ]
            )
        ],
        [
            ruleset.else,
            ruleset.fail
        ]
    )

    let lexer = new Lexer( baseRule )

    let tokens = 
        Lexer.strip(
            Lexer.condense(
                lexer.tokenize( Reader(Buffer.from("(#1 to #2)+?", 'utf8')) )
            )
        )
    /*
        character
            ## any
        
        word
            (not ## or #+ or #- or #( or #))+
        
        
    */

    // console.log(tokens)
})()

// number


let whitespace = " \t\n"
let punctuation = "()" + whitespace

let ruleset = Lexer.ruleset

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
    let text = Reader(file)

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



wrapper.strip = Lexer.strip

module.exports = wrapper