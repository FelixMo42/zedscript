const fs       = require("fs")
const Lexer    = require("./Lexer")
const Parser   = require("./Parser")
const Formater = require("./Formater")

let path = (...parts) => parts.filter(i => i != undefined).join("/")

let load = (path) =>
    JSON.parse(fs.readFileSync(`${path}.json`))

let save = (data, ...parts) =>
    fs.writeFileSync(
        `${path(...parts)}.json`,
        JSON.stringify(data, undefined, "\t")
    )

const Builder = module.exports = (options) => {
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
            save(tokens, options.saveDir, "tokens")
        }

        /// PARSER ///

        let ast = parser(tokens)

        if (options.printAST) {
            console.log("===== AST ====")
            console.log(ast)
            console.log("==============")
        }
    
        if (options.saveAST) {
            save(ast, options.saveDir, "ast")
        }

        /// FORMATER ///

        let data = formater(ast)

        if (options.printBuild) {
            console.log("==== BUILD ===")
            console.log(data)
            console.log("==============")
        }
    
        if (options.saveBuild) {
            save(data, options.saveDir, "build")
        }

        return data
    }
}