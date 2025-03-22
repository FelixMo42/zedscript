export interface TokenStream {
    next(): string
    take(match: string): string | undefined
    peak(match: string): string | undefined
    save(): number
    load(i: number): void
    logs(): void
}

export function lexer(src: string): TokenStream {
    const tokens = src
        .matchAll(/\"[^\"]*\"|[\w]+|<=|>=|==|[^\s\w]/g)
        .toArray()
        .map(match => match[0])

    let index = 0

    const self = {
        logs() {
            console.log(tokens)
        },
        next() {
            return tokens[index++]
        },
        take(match: string) {
            const value = self.peak(match)
            if (value != undefined) index++
            return value
        },
        peak(match: string) {
            if (match === "<string>") {
                if (tokens[index].startsWith("\"")) {
                    const len = tokens[index].length
                    return tokens[index].substring(1, len - 1)
                }
            } else if (match === "<ident>") {
                if (isIdent(tokens[index])) {
                    return tokens[index]
                }
            } else if (match === "<number>") {
                if (isNumeric(tokens[index])) {
                    return tokens[index]
                }
            } else if (tokens[index] == match) {
                return tokens[index]
            }
        },
        save() {
            return index
        },
        load(i: number) {
            index = i
        }
    }

    return self
}

function isIdent(str: string) {
    return /^[a-zA-Z_]+$/.test(str);
}

function isNumeric(str: string) {
    return /^\d+$/.test(str);
}
