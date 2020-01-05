const Builder = require("./lpon/Builder")

module.exports = (file, options) => {
    let lexerBuilder = Builder({
        ...require("./lexerdata"),
        saveDir: "./out/temp/lexer",
        ...options
    })

    let parserBuilder = Builder({
        ...require("./parserdata"),
        saveDir: "./out/temp/parser",
        ...options
    })

    let [ settingsFile, lexerFile, parserFile ] = file.split(";;;")

    let settings = JSON.parse( settingsFile )

    let lexerRules  = lexerBuilder( lexerFile )
    let parserRules = parserBuilder( parserFile )

    return { parserRules, lexerRules, ...settings }
}