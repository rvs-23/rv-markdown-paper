= Thread pools <ch-thread-pools>

#pagebreak(weak: true)
#set page(margin: opener-margins)
#metadata("opener") <chapter-opener>
#v(26mm)

#eyebrow[Ch. 7 · Introduction]

#dropcap("A")[
   thread pool is a _bounded crew_ of workers that take jobs from a shared queue. You hand it a function and its arguments; it hands back a *future* — a promise that the answer will be ready later. Pools solve two problems at once: they cap how many threads exist, and they remove the cost of starting a new one for every task.
]

This chapter assumes you have seen `threading.Thread` but have not yet reached Ch. 8 · asyncio. We stay deliberately in the `concurrent.futures` module, which is the right tool for the overwhelming majority of I\/O-bound Python programs.#endnote-ref(1)

===== What you will learn

#grid(
  columns: (60pt, 1fr),
  column-gutter: 1.2em,
  row-gutter: 0.9em,
  stroke: (top: 0.3pt + c-hairline),
  inset: (top: 6pt),
  [Pool],
  [A fixed-size set of worker threads that consume a work queue.],
  [Future],
  [An object representing a computation that may not yet have completed.],
  [Executor],
  [The object you submit work to; it owns the pool and the queue.],
  [GIL],
  [The Global Interpreter Lock; only one thread runs Python bytecode at a time.],
)

===== A note on scope

We cover _thread_ pools specifically. Process pools (`ProcessPoolExecutor`) are touched on in §7.4 only to contrast sizing rules. #strike[Async pools] are deferred to chapter 8.

#pagebreak(weak: true)
#set page(margin: body-margins)
#_sig-numeral.update("7.1")
#context {
  let p = here().page()
  _sig-history.update(h => h + ((page: p, sig: "7.1"),))
}
== 7.1 · Threads & the GIL <sec-threads-gil>

=== Why a pool, and why bounded.

Spawning a thread in Python is cheap but not free. Each thread carries an OS-level stack (8 MB on Linux by default), a bookkeeping structure in the interpreter, and contention for the *GIL*. Unbounded spawning is the single most common cause of a Python server going sideways under load.

#marg(label: "The GIL in 3.13", )[
  PEP 703 introduces a no-GIL build. Until it is the default, reason as if the GIL is there.
]

#marg(label: "Stack size", )[
  Tunable via `threading.stack_size()` — rarely worth doing.
]

==== 7.1.1 Three reasons to pool

+ *Bound memory.* A fixed worker count caps stack usage to a predictable multiple of the stack size.
+ *Amortize startup.* Thread creation is \~100 μs; reusing a worker for a 1 ms task matters.
+ *Backpressure for free.* When the queue fills, submitters block — the pool refuses to paper over a too-slow consumer.

==== 7.1.2 When threads do _not_ help

- Pure CPU work in pure Python — the GIL serializes it.
  - Use `ProcessPoolExecutor` instead.
  - Or drop into C via NumPy \/ `numba`.
- Work that already releases the GIL (e.g. a `requests` call) benefits regardless.
- Work that calls into a C extension holding a lock of its own.

#quote(block: true)[
  A thread pool is a queue in a trench coat. Everything interesting is in how the queue behaves when it is full, and in what the workers do when the queue is empty.
]

==== 7.1.3 Rules of thumb

#task-list(
  task-item(true, [Is the workload I\/O-bound?]),
  task-item(true, [Am I willing to cap memory with a worker count?]),
  task-item(false, [Can I tolerate out-of-order completion?]),
)

#_sig-numeral.update("7.2")
#context {
  let p = here().page()
  _sig-history.update(h => h + ((page: p, sig: "7.2"),))
}
== 7.2 · What a pool actually is <sec-pool-is>

_(This section is listed in the chapter TOC but its content lives in the companion reference card; see Appendix A.)_

#pagebreak(weak: true)
#_sig-numeral.update("7.3")
#context {
  let p = here().page()
  _sig-history.update(h => h + ((page: p, sig: "7.3"),))
}
== 7.3 · Submitting & collecting work <sec-submitting>

=== The minimal executor.

The standard library ships `concurrent.futures.ThreadPoolExecutor`. It is a context manager; entering it spins the workers, exiting it joins them.

#marg(label: "Context manager", )[
  Exiting the `with` block calls `shutdown(wait=True)`.
]

#code-block(filename: "fetch_all.py", lang-label: "Python 3.12")[
  ```python
  from concurrent.futures import ThreadPoolExecutor, as_completed
  import requests

  urls = ["https://example.com/", "https://python.org/"]

  def fetch(url: str) -> int:
      return requests.get(url, timeout=5).status_code

  with ThreadPoolExecutor(max_workers=8) as ex:
      futures = {ex.submit(fetch, u): u for u in urls}
      for f in as_completed(futures):
          print(futures[f], f.result())
  ```
]

#note[
  Use `as_completed` when order does not matter — results arrive in finish order, not submit order. For submit order, iterate `ex.map` instead.
]

#tip[
  Wrap `f.result()` in `try/except`. Exceptions raised inside a worker are deferred until you ask for the result.
]

#warning[
  Never `submit()` from inside a worker of the same pool — you can deadlock. Use a separate pool, or just call the function directly.
]

#danger[
  Do not share an unsynchronised mutable (a `list`, `dict`) across workers. The GIL protects bytecode, not your invariants.
]

#pagebreak(weak: true)
#_sig-numeral.update("7.4")
#context {
  let p = here().page()
  _sig-history.update(h => h + ((page: p, sig: "7.4"),))
}
== 7.4 · Sizing the pool <sec-sizing>

=== How many workers?

#figure(
  image("/figures/pool-queue.svg", width: 100%),
  caption: [Submitters push callables into a FIFO work queue; a fixed set of workers pull from it.],
) <fig:pool-queue>

#marg(label: "Little's law", )[
  Kleinrock 1975; applies to any stable queueing system.
]

A reasonable default for I\/O-bound work is given by Little's law:

$ N = lambda dot.op W $ <eq:little>

where _N_ is the pool size, _λ_ the arrival rate of requests, and _W_ the average time a worker spends per request (mostly blocked on I\/O).

#table(
  columns: (2.2fr, 1.6fr, 1fr, 2fr),
  align: (left, left, left, left),
  table.header([Workload], [Good default], [Ceiling], [Why]),
  [Local disk I\/O],
  [4 – 8],
  [32],
  [Kernel queue depth],
  [HTTP calls],
  [8 – 32],
  [256],
  [Remote capacity],
  [DNS lookups],
  [16],
  [64],
  [Resolver cache],
  [Pure Python CPU],
  [1],
  [1],
  [GIL],
)

#pagebreak(weak: true)
#_sig-numeral.update("7.5")
#context {
  let p = here().page()
  _sig-history.update(h => h + ((page: p, sig: "7.5"),))
}
== 7.5 · Exercises <sec-exercises>

=== Work these before 7.6.

Model solutions are in Appendix C, pp. 342–346.

#exbox(number: "01", title: "Warm-up", tag: "submit / result", )[
  Using `ThreadPoolExecutor`, compute the length of ten URLs in parallel and print them in _submission_ order, not completion order.
]

#exbox(number: "02", title: "Sizing", tag: "Little's law", )[
  A service receives 40 requests\/second; each spends 0.6 s blocked on a downstream API. Compute the pool size from equation @eq:little. Justify rounding up.
]

#exbox(number: "03", title: "Trap", tag: "deadlock", )[
  Construct a program where a worker in pool _A_ submits to the same pool and waits on the result. Show the deadlock; fix it with two pools.
]

#epigraph(cite: "Rob Pike · Concurrency is not parallelism (2012)", )[
  Concurrency is a way of organising code. Parallelism is a property of how it runs.
]

#_sig-numeral.update("7.6")
#context {
  let p = here().page()
  _sig-history.update(h => h + ((page: p, sig: "7.6"),))
}
== 7.6 · Further reading <sec-further>

#marg(label: "See also", )[
  Ch. 8 · asyncio; Ch. 9 · process pools.
]

- *Kleinrock, L.* _Queueing Systems, Vol. 1._ Wiley, 1975.
- *Beazley, D.* _Python Concurrency From the Ground Up._ PyCon US, 2015.
- *CPython source* — `Lib/concurrent/futures/thread.py`.

#endnotes(([For CPU-bound work, substitute `ProcessPoolExecutor`; the API is identical, the cost model is not.], [The `as_completed` iterator accepts a `timeout=` keyword.]))
