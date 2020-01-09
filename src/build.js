let opts = {
    printTokens: true , printAST: true , printBuild: true, 
    saveTokens: true  , saveAST: true  , saveBuild: true
}

require("../build/0.1.0")( "src/source.file", "temp/build/", opts)

console.log("> built language successfully")

require("./run")