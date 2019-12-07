const EOF = "end_of_file"

function Lexer(file) {
    let punctuation = new Set([
        ' ', '\n', '\t',
        '|',  ':', '@', 
        '(', ')', 
        "[", "]",
        "{", "}",
        "\"",
    ])
    
    let keywords = new Set([
        "if", "let", "fn"
    ])

    let tokens = []

    let length = file.length
    let index = 0
    let word = ""
    let line = 0
    let character = 0
    while (index < length) {
        let char = String.fromCharCode(file[index])

        if (punctuation.has(char)) {
            if (word != "") {
                if ( !isNaN(word) ) {
                    tokens.push({
                        "type": "number",
                        "value": parseInt(word)
                    })
                } else {
                    tokens.push({
                        "type": keywords.has(word) ? "keyword" : "identifier",
                        "value": word
                    })
                }
                word = ""
            }

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

    return tokens
}

let removable = new Set([
    " ", "\n", "\t"
])

function strip(tokens) {
    return tokens.filter(token => !removable.has(token.value))
}

Lexer.strip = strip

module.exports = Lexer