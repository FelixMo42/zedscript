const wasmBinary = await Deno.readFile("out/main.wasm")

const wasmModule = await WebAssembly.instantiate(wasmBinary)

const { main } = wasmModule.instance.exports as {
    main: (a: number, b: number) => number
}

console.log("2 + 3 =", main(2, 3))