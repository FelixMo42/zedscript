const fs       = require("fs")
const Lexer    = require("./Lexer")
const Parser   = require("./Parser")
const Formater = require("./Formater")

let load = (path) =>
    JSON.parse(fs.readFileSync(`${path}.json`))

let save = (name, version, location) =>
    fs.writeFileSync(
        `${path}.json`,
        JSON.stringify(data, undefined, "\t")
    )

const Language = module.exports = ({lexer, parser, formater}) => {
    let lexe  = (file) => lexer(file)
    let parse = (file) => parse(lexer(file))
    let run   = (file) => formater(parser(lexer(file)))

    let lexeFile  = (path) = lexe( fs.readFileSync(path) )
    let parseFile = (path) = parse( fs.readFileSync(path) )
    let runFile   = (path) = run( fs.readFileSync(path) )

    return {
        lexer, parser, formater,
        lexe, parse, run,
        lexeFile, parseFile, runFile,
        
    }
}

Language.fromJSON = ({lexer, parser, formater}) =>
    Language({
        lexer    : Lexer(lexer),
        parser   : Parser(parser),
        formater : Formater(formater)
    })

Language.load = ({name, root="out"}) =>
    Language.fromJSON(
        JSON.parse( fs.readFileSync(`${root}/${name}.json`) )
    )

Language.generate = ({target, file, name, root, lponVerison}) => {
    let lpon = Language.load({name: `${lpon}/${lponVerison}`})

    if (file != undefined) {
        target = fs.readFileSync(`${path}.json`)
    }

    let data = lpon.run(target)

    if (name != undefined) {
        fs.writeFileSync(
            `${root}/${name}.json`,
            JSON.stringify(data, undefined, "\t")
        )
    }

    return Language.fromJSON(data)
}