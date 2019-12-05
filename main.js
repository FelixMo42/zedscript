const EOF = "end_of_file"

function Lexer(file) {
    let fileSize = file.length
    let run = true
    let position = 0

    let punctuation = new Map()

    /* skippable punctuation*/
    punctuation.set(" " , () => skip())
    punctuation.set("\n", () => skip())
    
    punctuation.set("(", () => {
        skip()

        let fn = getVariable()

        return {
            type: "call",

        }
    })
    
    punctuation.set(")", () => skip())

    punctuation.set(EOF, () => {  })

    let keywords = new Map()
    keywords.set("fn", () => {})

    /* reader function */

    function next() {
        let char = peak()
        skip()
        return char
    }
    
    function peak() {
        if (position >= fileSize) {
            console.log("reacher EOF")
            return EOF
        }
        // console.log("next: ", position)
        return String.fromCharCode( file[position] )
    }
    
    function skip() {
        position += 1
    }

    function word() {
        let word = ""

        while ( !punctuation.has(peak()) ) {
            word += next()
        }

        return word
    }

    /* eaters */

    function getVariable() {

    }

    /* */

    function tokenize() {
        let tokens = []

        while (position < fileSize) {
            let char = peak()

            if (punctuation.has(char) ) {
                let token = punctuation.get(char)()
                if (token) {
                    tokens.push( punctuation.get(char)( char ) )
                }
            } else {
                let w = word()

                if ( keywords.has(w) ) {
                    console.log("key: ", w)
                } else {
                    console.log("var: ", w)
                }
            }
        }

        return tokens
    }

    return tokenize
}

// Do it

const fs = require('fs')

const filePath = "test.zed"
const file = fs.readFileSync(filePath)

let tokens = Lexer(file)()

for (let token of Lexer(file)()) {
    console.log(token.type)
}