function Reader(file) {
    let fileSize = file.length
    let run = true
    let position = 0

    /* basic positional stuff */

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

    function skipPadding(skippable=[" ", "\n"]) {
        while ( skippable.indexOf(peak()) !== -1 ) { skip() }
    }    

    /* scoping and main function */

    class Scope {
        constructor(parent) {
            this.parent = parent
            this.data = new Map()
        }

        /* variable */
    
        set(key, value) {
            this.data.set(key, value)
        }
    
        get(key) {
            if (this.data.has(key)) {
                return this.data.get(key)
            }
            
            console.log("key: ", key)

            // return this.parent.get(key)
        }
    
        /* eaters */

        eatNextWord(end=[")", " ", "\n"], eat=false) {
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

        eatFunction() {
            // skip the opening '(' 
            skip()

            let func = this.eat()
            let paramaters = []

            while (run) {
                skipPadding()
                if (peak() === ")") {
                    skip()
                    break
                }
                paramaters.push( this.eat() )
            }

            return func(...paramaters)
        }

        eatString() {
            return this.NextWord(["\""], true)
        }

        eatNumber() {
            return parseInt( this.eatNextWord() )
        }

        eatVariable() {
            console.log("eat var: ", peak())
            return this.get( this.eatNextWord() )
        }

        eat() {
            let char = peak()

            if (char == "(") {
                return this.eatFunction()
            }

            if (char == "\"") {
                return this.eatString()
            }

            if (["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].indexOf(char) != -1) {
                return this.eatNumber()
            }

            return this.eatVariable()
        }
    }

    return function() {
        let rootScope = new Scope()

        rootScope.set("+", (a, b) => a + b)
        rootScope.set("-", (a, b) => a - b)
        rootScope.set("*", (a, b) => a * b)
        rootScope.set("/", (a, b) => a / b)

        while (position < fileSize) {
            skipPadding()

            console.log( rootScope.eat() )
        }
    }
}

// Do it

const fs = require('fs')

const filePath = "test.zed"
const file = fs.readFileSync(filePath)

Reader(file)()