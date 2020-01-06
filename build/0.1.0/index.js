const Builder = require("./lpon/Builder")
const path    = require("path")
const fs      = require("fs-extra")

function addFile(file, target, root=__dirname) {
    fs.copySync(
        path.resolve(root, file),
        target + file
    )
}

module.exports = (file, target, options) => {
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

    let [ settingsFile, lexerFile, parserFile ] =
        fs.readFileSync(file).toString().split(";;;")

    let settings = JSON.parse( settingsFile )

    let lexerRules  = lexerBuilder( lexerFile )
    let parserRules = parserBuilder( parserFile )

    let data = {
        lexerRules    : lexerRules,
        parserRules   : parserRules,
        parserDefault : settings.parserDefault
    }

    // clear out the build directory
    fs.emptyDirSync(target)

    // add lpon library to build
    addFile("./lpon", target)

    let fileDir = path.resolve(file, "../")
    let targetSrc = target + "src/"

    addFile( settings.formaterRules, targetSrc, fileDir )

    for (let path in settings.uses || []) {
        addFile( path, targetSrc, fileDir )
    }

    // write output files
    fs.writeFileSync( target + "data.json", JSON.stringify(data) )
    fs.writeFileSync( target + "index.js" , `
        const path    = require("path")

        module.exports = (file, options={}) =>
            require("./lpon/Builder")({
                ...JSON.parse( require("fs").readFileSync(
                    path.resolve(__dirname, "./data.json")
                ).toString() ),
                formaterRules: require(
                    path.resolve(
                        __dirname + "/src",
                        "${settings.formaterRules}"
                    )
                ),
                ...options
            })(file)
    ` )
}