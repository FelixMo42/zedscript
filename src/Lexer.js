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
    rule.type == "range" ? rule.start.value <= char && char <= rule.end.value :
    rule.type == "set"   ? rule.values
                            .map(value => compare(value, char))
                            .some(e => e) :
    rule.type == "not"   ? !compare(rule.value, char) :
    rule.type == "char"  ? char == rule.value :
        Error("invalide rule type")

Lexer.matcher = Rule.Matcher({
    finish: ({rule, data: file, start, length}) => ({
        type: rule[0].type,
        value: file.substring(start, start + length)
    }),
    compare: (rule, file, index) => compare(rule, file[index])
})

Lexer.singlton = (type, char) => ({
    type: type,
    rule: {type: "char", value: char},
    then: Rule.next,
    else: Rule.fail 
})

Lexer.multi = (type, chars) => ({
    type: type,
    rule: {type: "set", values: chars.map(char => ({type: "char", value: char}))},
    then: Rule.next,
    else: Rule.fail 
})

Lexer.strip = (tokens, type="whitespace") =>
    tokens.filter(token => token.type !== type)