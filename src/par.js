const {red, gray, green, blue} = require("chalk")

function Token(type, value="") {
    return {type, value}
}

let tokens = [
    Token("let", "let"),
    Token("identifier", "a"),
    Token("equal", "="),
    Token("identifier", "abcd")
]

const types = {
    PATTERN: 0,
    TOKEN: 1,
    OR: 2
}

const modes = {
    NEXT: 0,
    SKIP: 1,
    LOOP: 2
}

let possibilities = new Map()

function addPossibility(index, possiblity) {
    if ( !possibilities.has(index) ) {
        possibilities.set(index, [])
    }

    possibilities.get(index).push(possiblity)
}

function Match(rule, index) {
    if (rule.type == types.TOKEN) {
        if (index < tokens.length && rule.name == tokens[index].type) {
            return {
                succses: true,
                value: tokens[index].value,
                index: index + 1
            }
        } else {
            addPossibility(index, rule.name)

            return {
                succses: false,
                index: index
            }
        }
    }

    if (rule.type == types.PATTERN) {
        let node = {}

        for (let step of rule.rule) {
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

///// SETUP //////

let file = (() => {
    let number = {
        type: types.TOKEN,
        mode: modes.NEXT,
        name: "number"
    }

    let letStatment = []

    let value = {
        type: types.OR,
        mode: modes.NEXT,

        rules: [
            letStatment,
            number
        ]
    }

    letStatment.join([
        {
            type: types.TOKEN,
            mode: modes.NEXT,
            name: "let"
        },
        {
            type: types.TOKEN,
            mode: modes.NEXT,
            name: "identifier",

            as: "name"
        },
        {
            type: types.TOKEN,
            mode: modes.NEXT,
            name: "equal"
        },
        {
            ...number,

            as: "value"
        }
    ])

    console.log(letStatment)

    let file = {
        type: types.PATTERN,
        mode: modes.LOOP,
        rule: letStatment
    }

    return file
})()

///// DO IT /////

;(() => {

    let {value, index} = Parse(file, 0)

    if (index < tokens.length) {
        possibilities.forEach( (values, index) => {
            let got = index < tokens.length ? tokens[index].type : "EOF"

            values.forEach((value) => {
                let expected = value

                console.log(
                    `${red("ERROR:")} got ${green(got)}, expected a ${green(expected)} on token #${index + 1}`
                )
            })

            console.log()

            let string1 = ""
            let string2 = ""

            for (let i in tokens) {
                let token = tokens[i]

                string1 += token.value + " "
                string2 += (i == index ? "^" : " ").repeat(token.value.length) + " "
            }

            console.log(string1)
            console.log(string2)

            console.log()
        } )
    } else {
        console.log(value)
    }

})()