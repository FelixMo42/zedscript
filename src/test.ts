// deno-lint-ignore-file no-explicit-any

const wasmBinary = await Deno.readFile("out/main.wasm")
const wasmModule = await WebAssembly.instantiate(wasmBinary, {
    env: {
        print: (number: number) => { console.log(number) }
    }
})

const _ = wasmModule.instance.exports

const tests = [
    [ `_.main()`, 42 ]
    // [ `_.is_even(12)`, true ],
    // [ `_.is_even(13)`, false ],
    // [ `_.make_even(41)`, 42 ],
    // [ `_.fast_fib(6)`, 8 ],
    // [ `_.size_of_f64()`, 8 ],
    // [ `_.vec_test()`, 42 ]
] as [string, any][]

for (const [a, b] of tests) {
    if (eval(a) == b) {
        console.log(`√ | ${a}`)
    } else {
        console.log(`X | ${a}, ${eval(a)} != ${b}`)
    }
}

// const f64 = new Float64Array(_.memory.buffer);
// console.log("f64 at index 0:", f64[0]);
// console.log("f64 at index 1:", f64[1]);