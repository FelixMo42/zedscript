const fs = require("fs-extra")

module.exports = (file, target, options) => {
    let builder = Builder({
        
        saveDir: "./out/temp/lexer",
        ...options
    })
}