function Parser(tokens) {
    let position = 0
    let length = tokens.length

    let objects = new Map({
        "(": () => {
            let fn = next()
            let params = []

            while (true) {
                let token = next()

                if (token.type == ")") {
                    break
                }

                params.push( eat() )
            }

            return {
                "type": "call",
                "fn": fn
            }
        }
    })

    function next() {
        let token = tokens[position]
        position += 1
        return token
    }

    function eat() {
        let token = next()
    }
    
    return eat()
}

module.exports = Parser