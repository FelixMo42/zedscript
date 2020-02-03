const { Stack } = require("immutable")

const NEXT = 0
const LOOP = 1
const SKIP = 2

let tokens = ["I", "E", "I", "I"]

function Parse(rule, index, then, fail, parent) {
    if (rule.type == "pattern") {
        let [first, next] = rule.steps.reduceRight(
            ([then, fail], step) => {
                let parent = []

                return {
                    rule: step.rule,
                    then: then,
                    fail: fail,
                    parent
                }
            },
            [ [] ]
        )

        parent.push({
            type: rule.name,
            next: next
        })

        Parse(first, index, next, fail, node.next)
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
                name: "I",
                mode: LOOP
            },
        ]
    },
    0,
    new Stack(),
    new Stack(),
    top
)

//////////////////////////////////////////////////////////////////////////////////

require("fs").writeFileSync("./temp/out.json", JSON.stringify(top[0], null, "\t"))

let pos = top[0]
while (pos !== undefined) {
    if ("value" in pos) {
        console.log(pos.value)
    }
    pos = pos.next[0]
}