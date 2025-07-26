(fib3 (#fn ((n int)) int
    (#if (<= n 1) (#return n))
    (#return (+ (fib2 (- n 1)) (fib (- n 2))))
))

(fib (#fn ((n int)) int
    (#if (<= n 1) (#return n))
    (#return (+ (fib2 (- n 1)) (fib3 (- n 2))))
))

(fib2 (#fn ((n int)) int
    (#if (<= n 1) (#return n))
    (#return (+ (fib2 (- n 1)) (fib (- n 2))))
))


(main (#fn ((x int) (y int)) (maybe_int 6)
    (#return (+ x (fib y)))
))


(maybe_int (#fn ((x int)) type
    (#return (#if (== (fib x) 8) int bool))
))
