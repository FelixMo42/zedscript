'use strict'

//Backus-Naur grammar

const fs       = require("fs")
const semver   = require("semver")
const Language = require("./lpon/Language")

// load hardcoded data for lpon
const {
    parserRules,
    parserDefault, 
    formaterRules
} = require("./data")

let version = "0.0.1"
let name    = "lpon"
let source  = "./src/source.lpon"
let release = "patch" // suported: none, patch

let printTokens = true
let printAST    = true
let printData   = true

let saveTokens = true
let saveAST    = true
let saveData   = true

let path = (...parts) =>
        `out/${parts.filter(i => i != undefined).join("/")}.json`

let load = (name, version) =>
    JSON.parse(fs.readFileSync(path(name, version)).toString())

let save = (data, name, version) =>
    fs.writeFileSync(
        path(name, version),
        JSON.stringify(data, undefined, "\t")
    )

let language = Language({

    // rules for parsing it
    lexerRules    : load(name, version),
    parserRules   : parserRules,
    parserDefault : parserDefault,
    formaterRules : formaterRules,

    // display and saving options
    printTokens , printAST , printData , 
    saveTokens  , saveAST  , saveData
})

let file = fs.readFileSync(source).toString()

language(file)