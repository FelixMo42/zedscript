const { List } = require('immutable')

// Text reader

function reader(string, pos=0) {
    let done = pos >= string.length
    return {
        val: string[pos],
        done: done,
        next: !done ? reader(string, pos + 1) : false
    }
}

// Lexer syntax rules

const rule = function(check, thenRule, elseRule) {
    const func = (char) => {
        let next = check(char.val) ? thenRule : elseRule
        
        if (next == rule.loop) {
            next = func
        }

        if (next == rule.done) {
            return ["", char]
        } else {
            let [word, prec] = next( char.next )
            return [char.val + word, prec]
        }
    }

    func.check = check

    return Object.freeze(func)
}

rule.loop = Symbol("loop rule")
rule.done = Symbol("loop done")

rule.fail = Symbol("loop done")

rule.final = rule(
    () => true,
    rule.done,
    rule.done
)

rule.is = (characters, thenRule=rule.final, elseRule=rule.done) =>
    rule(
        (char) => characters.includes(char),
        thenRule,
        elseRule
    )

// Lexer

class Lexer {
    constructor(...types) {
        this.types = types
    }

    *tokenize(text) {
        if (text.done) { return }

        for (let type of this.types) {
            let [body, next] = type.rule(text)

            if ( body !== "" ) {
                yield {
                    type: type.name,
                    body: body
                }

                yield *this.tokenize(next)
                
                return
            }
        }

        console.warn(`Failed to tokenize character: "${text.val}"`)
    }
}

// test it

let str = {
    name: "string",
    rule: rule.is(
        ["'"],
        rule(
            (char) => char !== "'",
            rule.loop,
            rule.final
        ),
        rule.done
    )
}

let blankspace = {
    name: "blankspace",
    rule: rule.is([" ", "\n", "\t"])
}

let punctuation = {
    name: "punctation",
    rule: rule.is(["(", ")", "'"])
}

let word = {
    name: "word",
    rule: rule(
        (char) =>
            !blankspace.rule.check(char) &&
            !punctuation.rule.check(char),
        rule.loop,
        rule.done
    )
}

let lexer = new Lexer(str, blankspace, punctuation, word)

let text = reader("  -1 +1 .1  0.1  ")

let tokens = lexer.tokenize(text)

let result = tokens.next()
while (!result.done) {
    console.log(result.value)
    result = tokens.next()
}
