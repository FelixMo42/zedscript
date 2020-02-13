module.exports = (file, rules) => {
    let error = ""

    let tokens = []

    while (file.length > 0) {
        let token = rules
            .map( rule => ({name: rule.name, body: rule.match(file)}) )
            .reduce( (a, b) =>  a.body.length > b.body.length ? a : b )

        if (token.body.length == 0) {
            error += file[0]

            file = file.substring(1)
        } else {
            if (error != "") {
                console.log(error)
                error = ""
            }

            file = file.substring(token.body.length)

            if ( token.name == "whitespace" ) {
                continue
            }

            tokens.push(token)
        }
    }

    return tokens
}