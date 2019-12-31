const Rule = require("./Rule")

const Parser = module.exports = (types, baseType) => { 
    let parse = ({type, value}, tokens, index) =>
        value != undefined ?
            tokens[index].type == type && tokens[index].value == value ?
                {...tokens[index], length: 1} :
                {length: 0} :
            tokens[index].type == type ?
                {...tokens[index], length: 1} :
                type in types ?
                    matcher.longestMatch(types[type], tokens, index) :
                    { length: 0 }

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
        finish: ({value, length}) => {
            value.length = length
            return value
        },
        failure: {length: 0}
    })

    return (tokens) => parse({type: baseType}, tokens, 0)
}