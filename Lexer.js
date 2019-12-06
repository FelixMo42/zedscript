const EOF = "end_of_file"

function Lexer(file) {
    let fileSize = file.length
    let run = true
    let position = 0

    let punctuation = new Map()

    /* skippable punctuation*/
    punctuation.set(" " , () => {})
    punctuation.set("\n", () => {})
    
    punctuation.set("(", () => {
        let fn = eatToken()

        let params = []

        while (true) {
            let token = eatToken()

            if (token.type === "call_end") {
                break
            }

            params.push(token)
        }

        return {
            type: "call",
            fn: fn,
            params: params
        }
    })
    
    punctuation.set(")", () => ({
        type: "call_end"
    }))
    punctuation.set("\"", () => {
        let string = ""

        while (peak() !== "\"") {
            string += next()
        }
        skip()

        return {
            type: "string",
            value: string
        }
    })

    punctuation.set(":", () => ({
        type: "func_continue"
    }))

    punctuation.set(EOF, () => ({
        type: "end_of_file"
    }))

    let keywords = new Map()
    keywords.set("fn", () => {
        let params = []

        while (true) {
            let token = eatToken()

            if (token.type == "func_continue") {
                break
            }

            params.push(token)
        }

        return {
            type: "function",
            params: params,
            block: eatToken()
        }
    })
    keywords.set("let", () => {
        return {
            type: "decleration",
            name: eatToken(),
            value: eatToken(),
            block: eatToken()
        }
    })

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

    function eatToken() {
        while (true) {
            let char = peak()

            if (punctuation.has(char) ) {
                skip()
                let token = punctuation.get(char)( char )
                if (token) {
                    return token
                }
            } else {
                let w = word()

                if ( keywords.has(w) ) {
                    return keywords.get(w)()
                } else if ( !isNaN(w) ) {
                    return {
                        type: "number",
                        value: parseInt(w)
                    }
                } else {
                    return {
                        type: "variable",
                        name: w
                    }
                }
            }
        }
        
    }

    return eatToken()
}

module.exports = Lexer