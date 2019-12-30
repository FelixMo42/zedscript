const Rule = require("./Rule")

const Lexer = module.exports = (rules) => (file) => {
    let index = 0
    let fileLength = file.length
    let tokens = []

    while (index < fileLength) {
        let token = Lexer.ruleset.longestMatch(rules, file, index)

        if (token.length == 0) {
            index += 1
        } else {
            tokens.push(token)
            index += token.length
        }
    }

    return tokens
}

Lexer.ruleset = Rule.Ruleset({
    tokenize: (rule, file, start, length) => ({
        type: rule[0].type,
        value: file.substring(start, start + length)
    })
})

Lexer.strip = (tokens, type="whitespace") =>
    tokens.filter(token => token.type !== type)