'use strict'
//Backus-Naur grammar

/// IMPORT ///

const _       = require("lodash")
const fs      = require("fs")
const semver  = require("semver")
const Builder = require("./lpon/Builder")

// load hardcoded data for lpon
const { parserRules, parserDefault, formaterRules } = require("./data")

/// OPTIONS ///

const version = "0.0.1"
const name    = "lpon"
const source  = "./src/source.lpon"
const action  = "test" // suported: none, run, test, clear

const printTokens = true
const printAST    = true
const printBuild  = true

const saveTokens = true
const saveAST    = true
const saveBuild  = true

const saveDir = "out/temp"

const file = fs.readFileSync(source).toString()

/// UTILITY FUNCTIONS ///

let clearTemp = () => {
    fs.rmdirSync("out/temp", {recursive: true})
    fs.mkdirSync("out/temp")
}

let path = (...parts) =>
        `out/${parts.filter(i => i != undefined).join("/")}.json`

let load = (name, version) =>
    JSON.parse(fs.readFileSync(path(name, version)).toString())

let save = (data, name, version) =>
    fs.writeFileSync(
        path(name, version),
        JSON.stringify(data, undefined, "\t")
    )

let get = (version, options) => make( load(name, version), options )

let make = (lexerRules, options={}) => 
    Builder({
        // rules for getting data
        lexerRules, parserRules, parserDefault, formaterRules,

        // display and saving options
        printTokens , printAST , printBuild , 
        saveTokens  , saveAST  , saveBuild  ,
        saveDir,

        // use override options
        ...options
    })

let doAction = (action) => {
    console.log("running action:", action)

    if (action == "clear") { clearTemp() }
    if (action == "run") {
        doAction("clear")

        let builder = get(version)

        return builder(file)
    }

    if (action == "test") {
        doAction("clear")

        console.info("building test version")

        fs.mkdirSync("out/temp/r0")
        fs.mkdirSync("out/temp/r1")
        fs.mkdirSync("out/temp/r2")

        // build the version we want to test
        let plon = get(version, {saveDir: "out/temp/r0"})(file)

        console.info("useing test version to build souce code")

        // use the new version to build the source code
        let plon1 = make(plon, {saveDir: "out/temp/r1"})(file)

        console.info("rebuilding to make sure it leads to stable state")

        // use that to remake it
        let plon2 = make(plon1, {saveDir: "out/temp/r2"})(file)

        // if its a good version then they should be the same
        if ( _.isEqual(plon1, plon2) ) {
            console.info("test succsefull :)")

            return true
        } else {
            console.info("test failed :(")

            return false
        }
    }
}

/// ACTIONS ///

doAction(action)