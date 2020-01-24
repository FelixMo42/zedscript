function make(arr, shape) {
    let numjy = arr

    numjy.shape = shape

    return numjy
}

function numjy(arr, shape=[arr.length]) {
    if (arr.length != shape.reduce((a, b) => a * b)) {
        throw new Error("Invalide numjy array length!")
    }

    return make([...arr], shape)
}

function haveSameShape(a, b) {
    return haveSameSize(a, b) && a.shape.every((v, i) => v == b.shape[i])
}

function haveSameSize(a, b) {
    return a.shape.length == b.shape.length
}

function add(a, b) {
    return make( a.map((v, i) => v + b[i]), a.shape )
}

function sub(a, b) {
    return make( a.map((v, i) => v - b[i]), a.shape )
}

function assert(bool) {
    if (!bool) {
        throw new Error("some error")
    }
}

function index(arr, pos) {
    assert( arr.shape.length == pos.length )

    let index = 0
    let size = 1

    for (let i = pos.length - 1; i >= 0; i--) {
        index += size * pos[i]
        size *= arr.shape[i]
    }

    return arr[index]
}

function mul(a, b) {
    return []
}