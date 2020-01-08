let fs = require("fs-extra")

let opts = {
    printTokens: true , printAST: true , printBuild: true, 
    saveTokens: true  , saveAST: true  , saveBuild: true
}

require("../build/0.1.0")( "src/source.file", "temp/build/", opts)

console.log("> built language successfully")

let ast = require("../temp/build/")(
    fs.readFileSync("src/test.file").toString(),
    {
        printTokens: true , printAST: true , printBuild: true, 
        saveTokens: true  , saveAST: true  , saveBuild: true,

        saveDir: "./temp/out"
    }
)

console.log("> built file successfully")

console.log("")

console.log(ast)