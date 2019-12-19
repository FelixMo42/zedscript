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

module.exports = Ruleset