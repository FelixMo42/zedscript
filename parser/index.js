#!/usr/bin/env node

const fs = require("fs")

const rules = require("./rules")

const Parser = require("./Parser")
const Tokens = require("./Tokens")

const program = require('commander')

program
    .version('0.1.0', '-v, --vers', 'output the current version')

    .usage("[file]")

    .parse(process.argv)

let file = program.args[0]

// let do it

let { success, value, index } = Parser( Tokens(
    fs.readFileSync(file).toString(),
    rules.lexerRule
) )(rules.fileRule, 0)

console.log( "\nOutput:", value, "\n" )