const reader = module.exports = (string, pos=0) => ({
    value: String.fromCharCode( string[pos] ),
    done:  pos >= string.length,
    next:  () => reader(string, pos + 1) //: false
})