const Rule = require("./Rule")

const Parser = module.exports = (types, callbacks, baseType) => { 
    let eatToken = (tokens, index) => ({
        value: tokens[index],
        length: 1
    })

    let parse = ({type, value}, tokens, index) => {
        if (value != undefined) {
            if (tokens[index].type == type && tokens[index].value == value) {
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

    let eatMatch = (match) => match.type in callbacks ?
        callbacks[match.type](match) :
        match

    let matcher = Rule.Matcher({
        compare: parse,
        generate: ({rule}) => ({
            type: rule[0].type
        }),
        update: ({rule, value, match}) => {
            if ("as" in rule) {
                let index = rule.as
                let node = eatMatch(match)
 
                if (rule.then == Rule.loop) {
                    if (index in value) {
                        value[index].push(node)
                    } else {
                        value[index] = [node]
                    }
                } else {
                    value[index] = node
                }
            }

            return value
        }
    })

    return (tokens) => eatMatch(parse({type: baseType}, tokens, 0).value)
}