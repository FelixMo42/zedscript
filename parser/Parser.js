const { red } = require("chalk")

module.exports = (tokens) => {
    let error = (msg, index) => () => {
        totalSuccses = false

        console.log(`${red("Error:")} ${msg}\n`)

        let string1 = ""
        let string2 = ""

        for (let i in tokens) {
            let token = tokens[i]

            string1 += token.body + " "
            string2 += (i == index ? "^" : " ").repeat(token.body.length) + " "
        }

        console.log(string1)
        console.log(string2)

        console.log("\n")
    }

    let Success = (value, index) => ({success: true, value, index})
    let Failure = (value, index) => ({success: false, value, index})

    let parse = (rule, index) => {
        if (rule.type == "Sequence") {
            let ogIndex = index

            let node = {}

            let parseStep = (i) => {
                let step = rule.steps[i]

                let match = parse(step, index)

                if ( match.success ) {
                    if ( "as" in step ) {
                        node[ step.as ] = match.value
                    }

                    index = match.index
                }

                return match
            }

            let match = parseStep(0)

            if ( !match.success ) {
                return Failure(match.value, ogIndex)
            }

            for (let i = 1; i < rule.steps.length; i++) {
                let match = parseStep(i)

                if ( !match.success ) {
                    match.value()

                    return Success(node, index)
                }
            }

            return Success(node, index)
        }

        if (rule.type == "Parallel") {
            for (let step of rule.steps) {
                let match = parse(step, index)

                if ( match.success ) {
                    return match
                }
            }

            if (index < tokens.length) {
                error(`Unexpected ${tokens[index].name}`, index)()

                return Success(null, index + 1)
            } else {
                return Failure(null, index)
            }
        }

        if (rule.type == "Skip") {
            return Success(0, index)
        }

        if (rule.type == "Loop") {
            let values = []

            while (true) {
                let match = parse(rule.step, index)

                if ( !match.success ) {
                    break
                }

                index = match.index

                values.push( match.value )
            }

            return Success(values, index)
        }

        if (rule.type == "Token") {
            return index < tokens.length && rule.name == tokens[index].name ?
                Success(tokens[index].body, index + 1) :
                Failure(
                    error(`Got ${index < tokens.length ? tokens[index].name : "EOF"}, expected ${rule.name}`, index),
                    index
                )
        }

        console.error(`${red("Error: ")} Invalid rule type: ${rule.type}`)
    }

    return parse
}