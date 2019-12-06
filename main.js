const fs          = require("fs")
const Lexer       = require("./Lexer")
const Interpreter = require("./Interpreter")

/* tokenize it */

const filePath = "test.zed"
const file = fs.readFileSync(filePath)

let tokens = Lexer(file)

fs.writeFile(
    "test.json",
    JSON.stringify(tokens, null, '\t'),
    () => {
        console.log( Interpreter(tokens) )
    }
)

