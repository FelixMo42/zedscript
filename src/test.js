const { Stack } = require("immutable")

let tokens = ["I", "E", "I", "I"]

function Parse(rule, index, next, fail, parent) {
    if (rule.type == "pattern") {
        let node = {
            type: rule.name,
            next: []
        }

        parent.push(node)

        Parse({
            type: "step",
            step: 0,
            steps: rule.steps
        }, index, next, fail, node.next)
    }

    if (rule.type == "step") {
        let node = {
            type: "step",
            value: [],
            next: []
        }

        parent.push(node)

        console.log(rule.steps.length < rule.step - 1)

        if (rule.steps.length < rule.step - 1) {
            Parse(
                rule.steps[rule.step],
                index,
                new Stack([{
                    rule: {
                        type: "step",
                        step: rule.step + 1,
                        steps: rule.steps
                    },
                    next: next,
                    fail: fail,
                    parent: node.next
                }]),
                fail,
                node.value
            )
        } else {
            next.forEach(state => Parse(
                state.rule,
                      index,
                state.next,
                state.fail,
                state.parent
            ) )
        }
    }

    if (rule.type == "token") {
        if ( tokens[index] == rule.name ) {
            parent.push( tokens[index] )

            next.forEach(state => Parse(
                state.rule,
                      index + 1,
                state.next,
                state.fail,
                state.parent
            ) )
        } else {
            parent.push( "error" )

            fail.forEach(state => Parse(
                state.rule,
                state.index,
                state.next,
                state.fail,
                state.parent
            ) )
        }
    }
}

let top = []

Parse(
    {
        type: "pattern",
        name: "rule",
        steps: [
            {
                type: "token",
                name: "I"
            },
            {
                type: "token",
                name: "E"
            },
            {
                type: "token",
                name: "I"
            },
        ]
    },
    0,
    new Stack(),
    new Stack(),
    top
)

/////

console.log(JSON.stringify(top, null, " "))
require("fs").writeFileSync("./temp/out.json", JSON.stringify(top, null, "\t"))