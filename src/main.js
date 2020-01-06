const fs     = require("fs")
const parser = require("../build/0.1.0")

parser(
    "src/test.file",
    "out/temp/build/",
    {
        // printTokens: true , printAST: true , printBuild: true, 
        saveTokens: true  , saveAST: true  , saveBuild: true
    }
)