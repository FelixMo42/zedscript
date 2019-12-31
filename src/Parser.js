const Rule = require("./Rule")

const Parser = module.exports = (types, baseType) => { 
    let parse = ({type, value}, tokens, index) => {
        if (value != undefined) {
            if (tokens[index].type == type && tokens[index].value == value) {
                return {
                    value: tokens[index],
                    length: 1
                }
            } else {
                return { length: 0 }
            }
        }

        if ( tokens[index].type == type ) {
            return {
                value: tokens[index],
                length: 1
            }
        } else {
            return matcher.longestMatch(types[type], tokens, index, true)
        }    
    }

    let matcher = Rule.Matcher({
        compare: parse,
        generate: ({rule}) => ({
            type: rule[0].type
        }),
        update: ({rule, value, match}) => {
            if ("as" in rule) {
                let index = rule.as
    
                if (rule.next == Rule.loop) {
                    if (index in value) {
                        value[index].push(match)
                    } else {
                        value[index] = [match]
                    }
                } else {
                    value[index] = match
                }
            }

            return value
        },
        failure: {length: 0}
    })

    return (tokens) => parse({type: baseType}, tokens, 0).value
}