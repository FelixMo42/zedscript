/// options

const { Stack } = require("immutable")

startStep = new Stack()

function step(stack, value) {
    return stack.push(value)
}

/// logic

class Ruleset {
    constructor({steper}) {
        this.steper = steper
    }

    rule(...conditions) {
        return (reader, steper=this.steper.s) => {
            for (let [check, rule] of conditions) {
                if ( check(position.val) ) {
                    return rule(reader.next, step(startStep))
                }
            }
    
            console.warn("Failure!")
        }
    }
}

function rule(...conditions) {
    return (reader, steper=startStep) => {
        for (let [check, rule] of conditions) {
            if ( check(position.val) ) {
                return rule(reader.next, step(startStep))
            }
        }

        console.warn("Failure!")
    }
}

rule.done = ({}) => {
    (reader) => {
        return reader
    }
}

/// test

rule(
    [
        (value) => value == "2",
        rule.done({})
    ]
)