const reader = module.exports = (string, pos=0) => {
    let done = pos >= string.length
    return {
        value: string[pos],
        done: done,
        next: !done ? reader(string, pos + 1) : false
    }
}