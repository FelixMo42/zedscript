let fs = require("fs-extra")

let ast = require("../temp/build")(
    fs.readFileSync("src/test.file").toString(),
    {
        printTokens: false , printAST: true , printBuild: true, 
        saveTokens: true   , saveAST: true  , saveBuild: true,

        saveDir: "./temp/out"
    }
)

console.log("> built file successfully")

console.log("")

console.log(ast)