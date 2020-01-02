const fs       = require("fs")
const Lexer    = require("./Lexer")
const Parser   = require("./Parser")
const Formater = require("./Formater")

let path = (...parts) => parts.filter(i => i != undefined).join("/")

let load = (path) =>
    JSON.parse(fs.readFileSync(`${path}.json`))

let save = (data, ...parts) =>
    fs.writeFileSync(
        `${path("out", ...parts)}.json`,
        JSON.stringify(data, undefined, "\t")
    )

const Language = module.exports = (options) => {
    let lexer    = Lexer( options.lexerRules )
    let parser   = Parser( options.parserRules, options.parserDefault )
    let formater = Formater( options.formaterRules )

    return (file) => {
        /// LEXER ///

        let tokens = lexer(file)

        if (options.printTokens) {
            console.log("=== TOKENS ===")
            console.log(tokens)
            console.log("==============")
        }
    
        if (options.saveTokens) {
            save(tokens, "temp", "tokens")
        }

        /// PARSER ///

        let ast = parser(tokens)

        if (options.printAST) {
            console.log("==== AST =====")
            console.log(ast)
            console.log("==============")
        }
    
        if (options.saveAST) {
            save(tokens, "temp", "ast")
        }

        /// FORMATER ///

        let data = formater(ast)

        if (options.printData) {
            console.log("==== DATA ====")
            console.log(data)
            console.log("==============")
        }
    
        if (options.saveData) {
            save(data, "temp", "data")
        }

        return data
    }
}