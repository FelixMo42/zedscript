const fs          = require("fs")
const Lexer       = require("./Lexer")
const Parser      = require("./Parser")
const Interpreter = require("./Interpreter")

function save(data, name) {
    return new Promise((resolve) => {
        fs.writeFile(`out/${name}.json`, JSON.stringify(data, null, '\t'), resolve)
    })
}

/* tokenize it */

const filePath = "test.zed"

async function runFile(filePath) {
    const file = fs.readFileSync(filePath)

    let tokens = Lexer.strip( Lexer(file) )

    await save(tokens, "tokens")

    // let ast = Parser(tokens)

    // await save(ast, "ast")

    // console.log( Interpreter(ast) )
}

runFile(filePath)