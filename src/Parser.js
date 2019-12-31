const Rule = require("./Rule")

const Parser = module.exports = (types, start) => {
    let compare = ({type, value}, tokens, index) =>
        value != undefined ?
            tokens[index].type == type && tokens[index].value == value ?
                {...tokens[index], length: 1} :
                {length: 0} :
        tokens[index].type == type ?
            {...tokens[index], length: 1} :
            parse(type, tokens, index)
    
    let updateToken = ({rule, token, match, ruleIndex}) => {
        if ("as" in rule[ruleIndex]) {
            let index = rule[ruleIndex].as

            if (rule[ruleIndex].next == Rule.loop) {
                if (index in token) {
                    token[index].push(match)
                } else {
                    token[index] = [match]
                }
            } else {
                token[index] = match
            }
        }
    }

    let matchRule = (rule, data, start) => {
        let length    = 0
        let ruleIndex = 0
        let token     = {
            type: rule[0].type
        }
    
        while (true) {
            // does the char match the rule?
            let match = compare(rule[ruleIndex].rule, data, start + length)
    
            let success = match.length != 0
    
            // only move on to the next position if the rule matchs
            if (success) {
                length += match.length
            }

            // update the token
            updateToken({rule, token, ruleIndex, match})
    
            // what should we do next?
            let outcome = success ? rule[ruleIndex].then : rule[ruleIndex].else
    
            // lets move on to the next rule
            if (outcome == Rule.next) {
                ruleIndex += 1
    
                // weve reached the end, were done.
                // return the length or the callback
                if (ruleIndex == rule.length) {                    
                    token.length = length

                    return token
                }
            }
    
            // lets loop around and do the same thing again
            if (outcome == Rule.loop) {}
    
            // this is not a match, return a token of length 0
            if (outcome == Rule.fail) {
                return {
                    start: start, end: start, length: 0
                }
            }
        }
    }

    let parse = (type, tokens) => 
        types[type]
            .map(rule => matchRule(rule, tokens, 0))
            .reduce(
                (longest, match) =>
                    match.length > longest.length ? match : longest
            )

    return (tokens) => parse(start, tokens)
}