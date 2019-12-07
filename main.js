const fs          = require("fs")
const Lexer       = require("./Lexer")
const Parser      = require("./Parser")
// const Interpreter = require("./Interpreter")

/* tokenize it */

const filePath = "test.zed"
const file = fs.readFileSync(filePath)

let tokens = Lexer.strip(
    Lexer(file)
)

let ast = Parser(tokens)

fs.writeFile(
    "test.json",
    JSON.stringify(tokens, null, '\t'),
    () => {}
)