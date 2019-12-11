const EOF = "EOF"

const punctuation = new Set([
    ' ', '\n', '\t',
    '|',  ':', '@', 
    '(', ')', 
    "[", "]",
    "{", "}",
    "'",
    EOF
])

const keywords = new Set([
    "if", "let", "fn"
])

function addWord(tokens, word) {
    // if its blank then dont do anything
    if (word == "") {
        return
    }

    // if its a number then push a number token
    if ( !isNaN(word) ) {
        tokens.push({
            "type": "number",
            "value": parseInt(word)
        })

    // else check if its a keyword or just a regular identifier and push that
    } else {
        tokens.push({
            "type": keywords.has(word) ? "keyword" : "identifier",
            "value": word
        })
    }
}

function Lexer(file) {
    let length = file.length

    let tokens = []

    let index = 0
    let word = ""

    // keep track of the visual position for debugging purposes
    let line      = 0
    let character = 0

    while (index < length) {
        let char = String.fromCharCode(file[index])

        // if current character is punctuation
        if (punctuation.has(char)) {
            // add word to tokens first
            addWord(tokens, word)

            // reset word
            word = ""
            
            // push the punctuation
            tokens.push({
                "type": "punctuation",
                "value": char,
                "line": line,
                "character": character  
            })
        } else {
            word += char
        }

        // incrament the counters
        character += 1
        index += 1
        if (char == "\n") {
            line += 1
            character = 0
        }
    }

    addWord(tokens, word)

    return tokens
}

const stripable = new Set([
    " ", "\n", "\t"
])

function strip(tokens) {
    return tokens.filter(token => !stripable.has(token.value))
}

Lexer.strip = strip

module.exports = Lexer