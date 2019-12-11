import { fromJS } from "immutable"

class Reader {
    constructor(text) {
        this.text = text
        this.position = 0
        this.stop = {}
        this.length = text.length
    }

    next() {
        let value = this.peak()
        this.skip()
        return value
    }

    skip() {
        this.position += 1
    }

    peak() {
        return this.text.charAt( this.position )
    }

    continue() {
        return this.position < this.length
    }

    while(callback) {
        while ( this.continue() ) {
            if ( callback( this.next() ) === this.stop ) {
                break
            }
        }
    }
}

class Lexer {
    constructor(...rules) {
        this.rules = rules
    }

    read(text) {
        let data = new Reader(text)

        data.while((char) => {

        })
    }
}

from()

let lexer = new Lexer(string)

// console.log(lexer.read("'this is a string'"))

let charRule = function(rule, then, el) {
    return (char) => {
        if ( rule(char) ) {
            return then
        } else {
            return el
        } 
    }
}