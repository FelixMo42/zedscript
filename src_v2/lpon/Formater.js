let Formater = module.exports = (callbacks) => function format({type, data}) {
    let node = (() => {
        if (typeof data == "string") {
            return data
        }

        let node = {type: type}

        for (let key in data) {
            if (Array.isArray(data[key])) {
                node[key] = data[key].map(format)
            } else {
                node[key] = format(data[key])
            }
        }

        return node
    })()

    if (type in callbacks) {
        return callbacks[type](node)
    } else {
        return node
    }
}