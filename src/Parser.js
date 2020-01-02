const Rule = require("./Rule")

const Parser = module.exports = (types, baseType) => {
    let eatToken = (tokens, index) => ({
        value: tokens[index],
        length: 1
    })

    let parse = ({type, value}, tokens, index) => {
        if (value != undefined) {
            if (tokens[index].data == value) {
                return eatToken(tokens, index)
            } else {
                return { length: 0 }
            }
        }

        if ( tokens[index].type == type ) {
            return eatToken(tokens, index)
        }
        
        if (type in types) {
            return matcher.longestMatch(types[type], tokens, index, true)
        }

        return { length: 0 }
    }

    let matcher = Rule.Matcher({
        compare: parse,
        generate: ({pattern}) => ({
            type: pattern.type,
            data: {}
        }),
        update: ({step, value, match}) => {
            let node = value.data

            if ("as" in step) {
                let key = step.as
                let child = match
 
                if (step.then == Rule.loop) {
                    if (key in node) {
                        node[key].push(child)
                    } else {
                        node[key] = [child]
                    }
                } else {
                    node[key] = child
                }
            }

            return value
        }
    })

    return (tokens) => parse({type: baseType}, tokens, 0).value
}