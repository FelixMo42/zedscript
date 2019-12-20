function Parser(tokens) {
    let position = 0

    let keywords = new Map()

    keywords.set("(", () => {
        let fn = next()
        let params = []

        while (true) {
            let token = peak()

            if (token.type == "punctuation", token.value == ")") {
                skip()
                break
            }

            params.push( eat() )
        }

        return {
            "type": "call",
            "fn": fn,
            "params": params
        }
    })

    keywords.set("fn", () => {
        let params = []

        while (true) {
            let token = peak()

            if (token.type == "punctuation" && token.value == ":") {
                skip()
                break
            }

            params.push( eat() )
        }

        return {
            type: "function",
            params: params,
            block: eat()
        }
    })
    


    
    keywords.set("let", () => ({
        type: "decleration",
        name: eat(),
        value: eat(),
        block: eat()
    }) )

    keywords.set("if", () => ({
        type: "if",
        condition: eat(),
        then: eat(),
        else: eat()
    }))

    keywords.set("|", () => {
        let values = []

        while (true) {
            let token = peak()

            if (token.type == "punctuation" && token.value == "|") {
                skip()
                break
            }

            values.push( eat() )
        }

        return {
            "type": "tuple",
            "values": values
        }
    })

    /* genaric usefull functions */

    function next() {
        let token = peak()
        skip()
        return token
    }

    function peak() {
        return tokens[position]
    }

    function skip() {
        position += 1
    }

    function eat() {
        let token = next()

        if (token.type == "number") {
            return token
        }

        if (token.type == "string") {
            return token
        }

        if (token.type == "identifier") {
            return token
        }

        if (keywords.has(token.value)) {
            return keywords.get(token.value)(token)
        }

        console.warn("Failed to parse token: ", token)
    }
    
    return eat()
}

module.exports = Parser