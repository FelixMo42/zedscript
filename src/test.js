const fs     = require("fs")
const parser = require("../build/0.1.0")

parser(
    fs.readFileSync("src/test.file").toString(),
    {
        printTokens: true , printAST: true , printBuild: true, 
        saveTokens: true  , saveAST: true  , saveBuild: true
    }
)