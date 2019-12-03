const fs = require('fs')
const filePath = "test.zed"

const file = fs.readFileSync(filePath)
const fileSize = file.length

let run = true
let position = 0

function next() {
    const char = String.fromCharCode( file[position] )
    position += 1
    return char
}

function peak() {
    return String.fromCharCode( file[position] )
}

function skip() {
    position += 1
}

const functions = {
    "+": (a, b) => a + b,
    "-": (a, b) => a - b,
    "*": (a, b) => a * b,
    "/": (a, b) => a / b
}

function skipPadding(skippable=[" ", "\n"]) {
    while ( skippable.indexOf(peak()) !== -1 ) { skip() }
}

function getNextWord(end=[")", " ", "\n"], eat=false) {
    let word = ""

    while (run) {
        if (end.indexOf(peak()) !== -1) {
            if (eat) {
                skip()
            }
            break
        }

        word += next()
    }

    return word
}

function proc() {
    let char = peak()

    if (char == "\"") {
        skip()
        return getNextWord(["\""], true)
    } else if (char == "(") {
        return func()
    } else {
        return parseInt( getNextWord() )
    }
}

function func() {
    skip()

    let func = getNextWord()

    let paramaters = []

    while (run) {
        if (peak() === ")") {
            skip()
            break
        }
        skipPadding()
        let paramater = proc()
        paramaters.push( paramater )
    }

    return functions[func](...paramaters)
}

while (position < fileSize) {
    let char = peak()

    if (char == " " || char == "\n") {
        skip()
    } else if (char == "(") {
        console.log( func() )
    } else {
        console.error(`Invalide token '${char}' at ${position}`)
        break
    }
}