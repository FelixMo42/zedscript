(def vec2f64
    :x f64
    :y f64
)

(fn vec2 (type)
    (return (struct 
        :x type
        :y type
    ))
)

(fn new (type)
    ; allocate the memory for the struct 
    (= ptr (i32.load 0i32))
    (= size (i32.trunc_f64_s (size_of type)))
    (i32.store 0i32 (+ ptr size))

    ; return the ref as the wanted type
    (return (asref ptr type))
)

(fn % (a b)
    (= x (floor (/ a b)))
    (return (- a (* b x)))
)

(fn is_even (n)
    (return (== (% n 2) 0))
)

(fn not (b)
    (return (if b false true))
)

(fn make_even (n)
    (return (if (is_even n)
        n
        (+ n 1)
    ))
)

(fn make_odd (n)
    (return (if (not (is_even n))
        n
        (+ n 1)
    ))
)

(fn fib (n)
    (if (<= n 1) (return n))
    (return (+ (fib (- n 1)) (fib (- n 2))))
)

(fn fast_fib (n)
    (= a 0) (= b 1)

    (loop (if (<= n 1) (br))
        (= temp (+ a b))
        (= a b)
        (= b temp)

        (= n (- n 1))
    )

    (return b)
)

(fn mag (vec)
    (return (sqrt (+
        (* (vec :x) (vec :x))
        (* (vec :y) (vec :y))
    )))
)

(fn main ()
    ; The goal of this function is to test 
    ; a bunch of diffrent stuff, then return 42

    ; test 1: recussion + loops!
    ; -> 8 + 8
    (= a (+ (fib 6) (fast_fib 6)))

    ; test 2: structs!
    ; -> +5
    (= vec (new (vec2 f64)))
    (= (vec :x) 3)
    (= (vec :y) 4)
    (= a (+ a (mag vec)))

    ; test 3: boolean logic!
    (= f1 (+ a (make_even 20)))

    (return (make_even f1))
)
