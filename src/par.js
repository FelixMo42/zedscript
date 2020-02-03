let tokens = [
    "I",
    "E",
    "I",
    "I",
    "E",
    "I"
]

let file = "let a = (+ 1 1)"

const types = {
    PATTERN: 0,
    TOKEN: 1
}

const modes = {
    NEXT: 0,
    SKIP: 1,
    LOOP: 2
}

function Match(rule, index) {
    if (rule.type == types.TOKEN) {
        if (rule.name == tokens[index]) {
            return {
                succses: true,
                value: tokens[index],
                index: index + 1
            }
        } else {
            return {
                succses: false,
                index: index
            }
        }
    }

    if (rule.type == types.PATTERN) {
        let node = {}

        for (let step of rule.steps) {
            let ogIndex = index

            let match = Parse(step, index)

            if (!match.succses) {
                return {
                    succses: false,
                    index: ogIndex
                }
            }

            if ("as" in step) {
                node[step.as] = match.value
            }

            index = match.index
        }

        return {
            succses: true,
            value: node,
            index: index + 1
        }
    }
}

function Parse(rule, index=0) {
    if (rule.mode == modes.NEXT) {
        return Match(rule, index)
    }

    if (rule.mode == modes.SKIP) {
        let match = Match(rule, index)

        return {
            succses: true,
            index: match.index,
            value: match.value
        }
    }

    if (rule.mode == modes.LOOP) {
        let values = []

        while (true) {
            let match = Match(rule, index)

            if (!match.succses) {
                break
            }

            index = match.index

            values.push(match.value)
        }

        return {
            succses: true,
            value: values,
            index: index
        }
    }
}

console.log( Parse({
    type: types.PATTERN,
    mode: modes.LOOP,
    steps: [
        {
            type: types.TOKEN,
            mode: modes.NEXT,
            name: "I",

            as: "name"
        },
        {
            type: types.TOKEN,
            mode: modes.NEXT,
            name: "E"
        },
        {
            type: types.TOKEN,
            mode: modes.LOOP,
            name: "I",

            as: "steps"
        }
    ]
}, 0).value )