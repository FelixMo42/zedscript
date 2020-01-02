const Rule = require("./Rule")

const Lexer = module.exports = (rules) => (file) => {
    let index = 0
    let fileLength = file.length
    let tokens = []

    while (index < fileLength) {
        let token = Lexer.matcher.longestMatch(rules, file, index, true)

        if (token.length == 0) {
            index += 1
        } else {
            tokens.push(token.value)
            index += token.length
        }
    }

    return tokens
}

let compare = (rule, char) =>
    rule.type == "range" ? rule.start <= char && char <= rule.end :
    rule.type == "set"   ? rule.values
                            .map(value => compare(value, char))
                            .some(e => e) :
    rule.type == "not"   ? !compare(rule.value, char) :
    rule.type == "match" ? char.charCodeAt(0) == rule.value :
        Error("invalide rule type")

Lexer.matcher = Rule.Matcher({
    finish: ({pattern, data: file, start, length}) => ({
        type: pattern.type,
        data: file.substring(start, start + length)
    }),
    compare: (rule, file, index) => compare(rule, file[index])
})