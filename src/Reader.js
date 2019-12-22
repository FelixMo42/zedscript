const reader = module.exports = (string, pos=0) => ({
    value: string[pos],
    done:  pos >= string.length,
    next:  () => reader(string, pos + 1)
})

reader.buffer = (buffer, pos=0) => ({
    value: String.fromCharCode( buffer[pos] ),
    done:  pos >= buffer.length,
    next:  () => reader.buffer(buffer, pos + 1)
})

reader.generator = (generator) => {
    let value = generator.next() 
    return {
        value: value.value,
        done:  value.done,
        next:  () => reader.generator(generator)
    }
}