// Text reader

function reader(string, pos=0) {
    let done = pos >= string.length
    return {
        val: String.fromCharCode(string[pos]),
        done: done,
        next: !done ? reader(string, pos + 1) : false
    }
}

// Lexer syntax rules

const rule = function(conditions, elseCondition, eat=true) {
    const func = (position, body="") => {
        let condition = elseCondition
        
        for (let i = 0; i < conditions.length; i += 2) {
            if ( conditions[i](position.val) ) {
                condition = conditions[i + 1]

                break
            }
        }

        if (condition == rule.loop) {
            condition = func
        }

        if (condition.eat) {
            return condition( position.next , body + position.val )
        } else {
            return condition( position , body )
        }
    }

    // func.check = check

    func.eat = eat

    return Object.freeze(func)
}

function _(func, options) {
    func.eat = options.eat

    return func
}

rule.loop = Symbol("loop rule")
rule.done = ({type, eat=true}) => _(
    (char, body) => [char, {type, body}],
    { eat: eat }
)

rule.fail = (char, body) => [char, { type: "fail", body: body }]

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

        console.warn(`Failed to tokenize character: "${text.val}"`)
    }
}

// test it

let string = rule(
    (char) => char == "'",
    rule(
        (char) => char !== "'",
        rule.loop,
        rule(
            (char) => char === "'",
            rule.done({ type: "string" }),
            rule.fail,
            false
        )
    ),
    rule.fail
)

// number

let whitespace = " \t\n"
let punctuation = "():\'" + whitespace

let word = rule(
    [
        (char) => !punctuation.includes(char),
        rule.loop
    ],
    rule.done({ type: "word", eat: false })
)

let postDotNumber = rule(
    [
        (char) => "0123456789".includes(char),
        rule.loop,

        (char) => punctuation.includes(char),
        rule.done({type: "number", eat: false})
    ],
    word
)

let preDotNumber = rule(
    [
        (char) => ".".includes(char),
        postDotNumber,

        (char) => "0123456789".includes(char),
        rule.loop,

        (char) => punctuation.includes(char),
        rule.done({type: "number", eat: false})
    ],
    word
)

let punc = rule(

)

let theOneRule = rule(
    [
        (char) => "'".includes(char),
        rule(
            [
                (char) => "'" === char,
                rule.done({ type: "string", eat: true })
            ],
            rule.loop
        ),

        (char) => "+-".includes(char),
        rule(
            [
                (char) => ".".includes(char),
                postDotNumber,
  
                (char) => "0123456789".includes(char),
                preDotNumber,

                (char) => punctuation.includes(char),
                rule.done({ type: "word", eat: false })
            ],
            word
        ),

        (char) => ".".includes(char),
        postDotNumber,

        (char) => "0123456789".includes(char),
        preDotNumber,

        (char) => whitespace.includes(char),
        rule.done({ type: "whitespace", eat: true }),

        (char) => punctuation.includes(char),
        rule.done({ type: "punctuation", eat: true }),
    ],
    word
)

const wrapper = (file) => {
    let text = reader(file)

    let lexer = new Lexer(theOneRule)
    let tokens = lexer.tokenize(text)

    let struc = []
    let result = tokens.next()
    while (!result.done) {
        struc.push(result.value)
        result = tokens.next()
    }

    return struc
}

wrapper.strip = (tokens) => tokens.filter(token => token.type !== "whitespace")

module.exports = wrapper