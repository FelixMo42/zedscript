export function lexer(src: string) {
    const tokens = src
        .matchAll(/\"[^\"]*\"|[\w]+|<=|>=|==|\*\*|[^\s\w]/g)
        .toArray()
        .map(match => match[0])

    const self = {
        tokens,
        index: 0,
        take(match: string) {
            const value = self.peak(match)
            if (value != undefined) self.index++
            return value
        },
        peak(match: string) {
            if (!match) {
                return tokens[self.index]
            } else if (match === "<string>") {
                if (tokens[self.index].startsWith("\"")) {
                    const len = tokens[self.index].length
                    return tokens[self.index].substring(1, len - 1)
                }
            } else if (match === "<ident>") {
                if (isIdent(tokens[self.index])) {
                    return tokens[self.index]
                }
            } else if (match === "<number>") {
                if (isNumeric(tokens[self.index])) {
                    return tokens[self.index]
                }
            } else if (tokens[self.index] == match) {
                return tokens[self.index]
            }
        },
        load(i: number) {
            self.index = i
        }
    }

    return self
}

function isIdent(str: string) {
    return /^[a-zA-Z_][a-zA-Z_\d]*$/.test(str)
}

function isNumeric(str: string) {
    return /^\d+$/.test(str)
}
