/// options

const { Stack } = require("immutable")
const Reader = require("./Reader")

startStep = new Stack()

function step(stack, value) {
    return stack.push(value)
}

step.start = () => new Stack()

/// logic

class Ruleset {
    constructor({steper}) {
        this.steper = steper
        this.loop = "loop"
    }

    rule(...conditions) {
        let self = (reader, step=this.steper.start()) => {
            for (let [check, rule] of conditions) {
                if ( check(reader.value) ) {

                    if (rule == "loop") {
                        rule = self
                    }

                    if (rule.eat) {
                        return rule(reader.next, this.steper.step(step, reader.value))
                    } else {
                        return rule(reader, step)
                    }
                }
            }
    
            console.warn("Failure!")
        }

        self.eat = true

        return self
    }

    done({type, eat=false}) {
        let rule = (reader, step) => {
            console.log( `"${step}" : ${type}` )

            return step
        }

        rule.eat = eat

        return rule
    }

    else() {
        return true
    }
}

/// test

let whitespace = " \t\n"
let punctuation = "()" + whitespace

let ruleset = new Ruleset({
    steper: {
        start: () => "",
        step: (step, value) => step + value
    }
})
let reader = Reader(")  +12.1a  ")

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

let token = baserule(reader)