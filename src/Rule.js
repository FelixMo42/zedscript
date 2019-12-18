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

                    let res = rule.eat ?
                        rule(reader.next, this.steper.step(step, reader.value)) :
                        rule(reader, step)
                    
                    if (res !== "fail") {
                        return res
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

    fail({}) {
        return "fail"
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
let reader = Reader("+12.1  ")

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

ruleset.make(
    [
        (char) => "+-".includes(char), "continue", "fail",          // continue
        (char) => "0123456789".includes(char),  "loop", "continue", // loop then continue
        (char) => ".".includes(char), "continue", "fail",           // continue
        (char) => "0123456789".includes(char), "continue", "done"   // loop then done
    ],
    [
        (char) => true // !punctuation then loop else done
    ],
    [
        (char) => char == " " // then done
    ]
)

optinal
multiple

let token = baserule(reader)
