# JUC 并发编程知识体系

---

## 一、并发问题的根本

### 1.1 可见性（CPU 缓存导致）

> **可见性**：一个线程对共享变量的修改，另外一个线程能够立刻看到。

**问题示例：**

```java
线程1: i = 1; i = 2;
线程2: j = i;
```

这样会导致 `j` 不知道到底是 `1` 还是 `2`。

**保证方式：** `volatile`、`synchronized`、`final`、`Lock`

---

### 1.2 原子性（分时复用引起）

> **原子性**：即一个操作或者多个操作，要么全部执行并且执行的过程不会被任何因素打断，要么就都不执行。

**问题示例：**

```java
// 一个变量被两个线程同时做处理
i += 1
```

最后结果不一定会是 `i + 2`，也可能是 `i + 1`。

**保证方式：** `synchronized`、`Lock`、`Atomic` 系列（CAS）

---

### 1.3 有序性（重排序引起）

> **有序性**：即程序执行的顺序按照代码的先后顺序执行。

在不改变原来的语义的前提下，如果语句数据不存在依赖的关系，那么就会发生语句重排序的状况。

**保证方式：** `volatile`（禁止前后重排）、`synchronized`、`Happens-Before`

---

## 二、使用 JMM 解决 Java 的并发问题

### 2.1 JMM - JVM 基础

> JMM 不对应实际内存结构，是**抽象的内存交互模型**，核心划分两大区域，规定线程只能通过固定规则交互。

---

### 2.2 核心区域的定义划分

| 区域 | 归属 | 存储内容 | 核心规则 |
|:---|:---|:---|:---|
| **主内存**<br>(Main Memory) | 所有线程共享 | 全部共享变量<br>（实例/静态字段、数组元素） | 线程间通信唯一媒介<br>数据最终落地处 |
| **工作内存**<br>(Working Memory) | 单个线程私有 | 线程使用的共享变量副本<br>局部变量 | 线程只能操作自己工作内存<br>不能直接读写主存 |

---

### 2.3 内存交互流程（8 大原子操作）

线程读写共享变量，必须按 JMM 规定的 **8 个不可拆分的原子操作** 执行，缺一不可：

| 操作 | 说明 | 方向 |
|:---:|:---|:---:|
| **lock（锁定）** | 主存变量加锁，独占访问 | - |
| **unlock（解锁）** | 释放主存变量锁 | - |
| **read（读取）** | 主存 → 工作内存（传输变量值） | 主存→工作内存 |
| **load（载入）** | 工作内存接收 read 的值，存副本 | 主存→工作内存 |
| **use（使用）** | 工作内存副本 → CPU 计算 | 工作内存→CPU |
| **assign（赋值）** | 计算结果 → 工作内存副本 | CPU→工作内存 |
| **store（存储）** | 工作内存副本 → 主存 | 工作内存→主存 |
| **write（写入）** | 主存接收 store 的值，更新变量 | 工作内存→主存 |

> **注意：** read+load、store+write 必须成对执行；变量只能从主存读、改后写回主存，无直接跨线程读写。

---

### 2.4 JMM 灵魂：Happens-Before（先行发生）原则

> 若操作 A **Happens-Before** 操作 B，则 **A 的结果对 B 可见，且 A 在 B 前执行**，无需依赖锁/volatile，是 JMM 判断有序性、可见性的**底层规则**。

---

### 2.5 6 大天然 Happens-Before 规则

#### ① 程序顺序规则（单线程铁律）

> 单线程内，**代码书写顺序在前的操作**，Happens-Before 书写顺序在后的操作。

---

#### ② 监视器锁规则（synchronized 可见性根源）

> 对**同一个锁**，解锁（`unlock`）操作 Happens-Before 后续的加锁（`lock`）操作。

解决多线程用锁时的**可见性问题**，是 `synchronized` 最核心的底层规则。

**线程 A 的 unlock Happens-Before 线程 B 的 lock → 线程 B 必见最新值。**

```java
// 同一把锁 object
int num = 0;

// 线程A
synchronized (object) {
    num = 100; // 修改
} // 自动 unlock（解锁）

// 线程B
synchronized (object) {
    // 自动 lock（加锁）
    System.out.println(num); // 一定读到 100
}
```

---

#### ③ volatile 变量规则（轻量级可见性）

> 对一个 `volatile` 变量的**写操作**，Happens-Before 后续对该变量的**读操作**。

- **写**：修改后**立即刷回主内存**，不留在线程本地缓存
- **读**：直接从**主内存读取**，不读本地缓存

**写 Happens-Before 读 → 读线程必见最新值。**

```java
volatile boolean flag = false;

// 线程A
flag = true; // volatile 写

// 线程B
if (flag) { // volatile 读
    // 一定能读到 true
}
```

---

#### ④ 线程启动规则（start 先行）

> 主线程调用 `Thread.start()` 启动子线程，这个操作 Happens-Before 子线程内的**所有操作**。

**start() Happens-Before 子线程所有代码 → 子线程必见主线程 start 前的修改。**

```java
int age = 18; // 主线程修改

Thread t = new Thread(() -> {
    // 子线程代码
    System.out.println(age); // 一定读到 18
});

t.start(); // 主线程启动线程
```

---

#### ⑤ 线程终止规则（join 后见）

> 子线程内的**所有操作**，Happens-Before 主线程调用 `Thread.join()` / 检测到线程终止。

```java
int score = 0;
Thread t = new Thread(() -> {
    score = 100; // 子线程修改
});

t.start();
t.join(); // 主线程等待子线程结束

System.out.println(score); // 一定读到 100
```

---

#### ⑥ 传递性规则（链式保证）

> 如果 A Happens-Before B，B Happens-Before C，那么 **A Happens-Before C**。

**A→B，B→C → A→C → C 能看到 A 的修改。**

```java
// A → B（程序顺序）
int x = 1;

// B → C（volatile 写→读）
volatile int y = 0;
y = 2;

// 另一个线程读 y
if (y == 2) {
    System.out.println(x); // 一定读到 1
}
```

---

### 2.6 volatile / synchronized / final 的 JMM 底层实现

> JMM 本质就是两件事：
> 1. **可见性**：一个线程改了，另一个线程能立刻看到
> 2. **有序性**：禁止指令重排，保证执行顺序符合预期

---

#### volatile 的 JMM 底层实现

> 保证 **可见性**，保证 **有序性**（禁止重排序），**不保证原子性**

**volatile 可见性靠 MESI 缓存一致性协议，写立即刷主存，让其他缓存失效。**

##### 内存屏障（Memory Barrier / Memory Fence）

**写 volatile 时：**

1. 对变量的修改**立即刷新到主内存**
2. 前面的普通写，不能重排到 volatile 写之后
3. 插入 **StoreStore + StoreLoad** 屏障

**读 volatile 时：**

1. 强制从**主内存重新读取**，失效本地缓存
2. 后面的普通读，不能重排到 volatile 读之前
3. 插入 **LoadLoad + LoadStore** 屏障

---

#### synchronized 的 JMM 底层实现

> 保证 **原子性** ✦ 保证 **可见性** ✦ 保证 **有序性**（全能王）

##### 底层是对象头 + 监视器锁（Monitor）

每个 Java 对象头里，都有：

- **Mark Word**
- 指向 **Monitor（监视器）** 的指针

##### 加锁流程（JMM 视角）

```
┌─────────────────────────────────────────────────────────┐
│  1. 线程尝试进入同步块 → 竞争 Monitor 的 owner          │
├─────────────────────────────────────────────────────────┤
│  2. lock 成功                                           │
│     ├─ JMM 会强制失效本地工作内存                        │
│     └─ 所有变量从主存重新读取                           │
├─────────────────────────────────────────────────────────┤
│  3. 同步块内执行                                        │
│     └─ 完全单线程执行，原子、可见、有序                   │
├─────────────────────────────────────────────────────────┤
│  4. unlock 释放锁                                       │
│     ├─ JMM 强制把修改刷回主内存                          │
│     └─ 释放 Monitor                                     │
└─────────────────────────────────────────────────────────┘
```

---

#### final 的 JMM 底层实现

> 保证 **final 字段初始化安全性**
>
> 防止对象 "半初始化" 被其他线程看到

##### 底层规则（JMM 严格规定）

- **final 字段必须在构造方法内完成初始化**
- 构造方法内：**对 final 字段的写入 → 不能重排到构造方法之外**
- 其他线程看到一个对象引用时：**一定能看到该对象 final 字段的完整、正确值**

##### 使用场景

```java
class Foo {
    int a;
    final int b;
    static Foo foo;

    public Foo() {
        a = 1;
        b = 2;
    }
}

// 线程1
foo = new Foo();

// 线程2
if (foo != null) {
    // a 可能读到 0（半初始化）
    // b 一定读到 2  ✦
}
```

---

## 三、线程详解

### 3.1 线程的定义

| 概念 | 说明 |
|:---|:---|
| **线程** | **CPU 调度的最小单位** |
| **进程** | 资源分配的最小单位，一个进程可以包含多个线程 |

### 内存分配

| 类型 | 包含内容 |
|:---|:---|
| **同一进程内的线程共享** | 堆、方法区、文件句柄等 |
| **每个线程独有** | 虚拟机栈、本地方法栈、程序计数器 |

---

### 3.2 线程的创建方式

#### ① 继承 Thread 类

```java
public class MyThread extends Thread {
    @Override
    public void run() {
        System.out.println("线程运行: " + Thread.currentThread().getName());
    }

    public static void main(String[] args) {
        MyThread thread = new MyThread();
        thread.start(); // 启动线程
    }
}
```

**特点：**
- 简单直接，继承 `Thread` 类即可
- Java 不支持多继承，继承了 `Thread` 就不能继承其他类
- 无法继承其他类，扩展性差

---

#### ② 实现 Runnable 接口（推荐）

```java
public class MyRunnable implements Runnable {
    @Override
    public void run() {
        System.out.println("线程运行: " + Thread.currentThread().getName());
    }

    public static void main(String[] args) {
        MyRunnable runnable = new MyRunnable();
        Thread thread = new Thread(runnable);
        thread.start();
    }
}
```

**特点：**
- 推荐使用，避免了单继承的限制
- 多个线程可以共享同一个 `Runnable` 对象
- 适合多个相同线程处理同一资源的情况

---

#### ③ 实现 Callable 接口（有返回值）

```java
import java.util.concurrent.*;

public class MyCallable implements Callable<Integer> {
    @Override
    public Integer call() throws Exception {
        // 模拟耗时操作
        Thread.sleep(1000);
        return 42;
    }

    public static void main(String[] args) throws Exception {
        MyCallable callable = new MyCallable();

        // 方式1: 使用 FutureTask
        FutureTask<Integer> futureTask = new FutureTask<>(callable);
        new Thread(futureTask).start();

        // 获取返回值（会阻塞直到任务完成）
        Integer result = futureTask.get();
        System.out.println("结果: " + result);

        // 方式2: 使用线程池
        ExecutorService executor = Executors.newFixedThreadPool(1);
        Future<Integer> future = executor.submit(callable);
        Integer result2 = future.get();
        System.out.println("结果2: " + result2);

        executor.shutdown();
    }
}
```

**特点：**
- 支持返回值
- 支持抛出异常
- 配合 `Future` 和 `FutureTask` 使用
- 可以通过 `Future.get()` 获取任务结果

---

#### ④ 使用线程池（生产环境推荐）

```java
import java.util.concurrent.*;

public class ThreadPoolExample {
    public static void main(String[] args) {
        // 创建线程池
        ExecutorService executor = new ThreadPoolExecutor(
            5,                      // 核心线程数
            10,                     // 最大线程数
            60L,                    // 空闲线程存活时间
            TimeUnit.SECONDS,       // 时间单位
            new ArrayBlockingQueue<>(100), // 工作队列
            Executors.defaultThreadFactory(),    // 线程工厂
            new ThreadPoolExecutor.CallerRunsPolicy() // 拒绝策略
        );

        // 提交任务
        executor.submit(() -> {
            System.out.println("任务执行: " + Thread.currentThread().getName());
        });

        // 关闭线程池
        executor.shutdown();
    }
}
```

**线程池的优势：**
- 降低资源消耗（重复利用已创建的线程）
- 提高响应速度（任务到达时无需等待线程创建）
- 提高线程的可管理性

---

### 3.3 线程的生命周期

```
                    ┌─────────────┐
                    │   NEW（新建）│
                    └──────┬──────┘
                           │ start()
                           ▼
                  ┌────────────────┐
                  │ RUNNABLE（就绪）│ ◄─── 获得CPU时间片
                  └────────┬───────┘         (Running运行状态)
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │BLOCKED   │    │WAITING   │    │TIMED_    │
    │（阻塞）   │    │（等待）   │    │WAITING   │
    └─────┬────┘    └─────┬────┘    │（计时等待）│
          │               │         └─────┬────┘
          │               │               │
          │               │    timeout/sleep/interrupt
          │               │               │
          └───────────────┴───────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │TERMINATED   │
                    │（终止）     │
                    └─────────────┘
```

| 状态 | 说明 | 触发条件 |
|:---|:---|:---|
| **NEW** | 线程被创建，但未调用 `start()` | `new Thread()` |
| **RUNNABLE** | 可运行（可能正在运行，也可能等待CPU） | 调用 `start()` |
| **BLOCKED** | 阻塞，等待锁 | 等待进入 `synchronized` 代码块 |
| **WAITING** | 等待，需要被显式唤醒 | `wait()`、`join()`、`LockSupport.park()` |
| **TIMED_WAITING** | 计时等待，超时后自动返回 | `sleep()`、`wait(timeout)`、`join(timeout)` |
| **TERMINATED** | 终止，线程执行完毕 | `run()` 方法执行完毕或异常退出 |

---

### 3.4 线程的常用方法

| 方法 | 说明 | 注意事项 |
|:---|:---|:---|
| **start()** | 启动线程，调用 `run()` 方法 | 不能重复调用，会抛出异常 |
| **run()** | 线程执行体，包含要执行的代码 | 不应直接调用，应该调用 `start()` |
| **sleep(long millis)** | 线程休眠指定毫秒数 | **不释放锁**，让出CPU时间片 |
| **yield()** | 线程让出CPU，回到就绪状态 | **不保证**立即生效，可能再次被调度 |
| **join()** | 等待线程终止 | 主线程等待子线程结束 |
| **interrupt()** | 中断线程 | 设置中断标志，不会真正停止线程 |
| **isAlive()** | 判断线程是否存活 | NEW/TERMINATED 返回 false |
| **getName()** | 获取线程名称 | 默认：Thread-0、Thread-1... |
| **setName()** | 设置线程名称 | 建议设置有意义的名称，便于调试 |
| **getPriority()** | 获取线程优先级 | 范围：1-10，默认5 |
| **setPriority()** | 设置线程优先级 | 优先高只是概率高，不保证先执行 |
| **isDaemon()** | 判断是否为守护线程 | 默认 false（用户线程） |
| **setDaemon()** | 设置为守护线程 | **必须在 start() 前设置** |
| **currentThread()** | 获取当前线程对象 | 静态方法 |
| **activeCount()** | 获取当前线程组中活动线程数 | 静态方法 |

#### 示例：sleep() vs yield()

```java
public class SleepYieldDemo {
    public static void main(String[] args) {
        // sleep() 示例
        new Thread(() -> {
            for (int i = 0; i < 5; i++) {
                System.out.println("Thread-1: " + i);
                try {
                    Thread.sleep(1000); // 休眠1秒，不释放锁
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        }).start();

        // yield() 示例
        new Thread(() -> {
            for (int i = 0; i < 5; i++) {
                System.out.println("Thread-2: " + i);
                Thread.yield(); // 让出CPU，不保证立即生效
            }
        }).start();
    }
}
```

#### 示例：join() 方法

```java
public class JoinDemo {
    public static void main(String[] args) throws InterruptedException {
        Thread thread1 = new Thread(() -> {
            try {
                System.out.println("线程1开始");
                Thread.sleep(2000);
                System.out.println("线程1结束");
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        });

        Thread thread2 = new Thread(() -> {
            try {
                System.out.println("线程2开始");
                Thread.sleep(1000);
                System.out.println("线程2结束");
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        });

        thread1.start();
        thread2.start();

        // 主线程等待 thread1 和 thread2 执行完毕
        thread1.join();
        thread2.join();

        System.out.println("主线程继续执行");
    }
}
```

---

### 3.5 线程的优先级

| 优先级常量 | 值 | 说明 |
|:---|:---:|:---|
| **MIN_PRIORITY** | 1 | 最低优先级 |
| **NORM_PRIORITY** | 5 | 默认优先级（普通） |
| **MAX_PRIORITY** | 10 | 最高优先级 |

```java
public class PriorityDemo {
    public static void main(String[] args) {
        Thread highPriority = new Thread(() -> {
            for (int i = 0; i < 5; i++) {
                System.out.println("高优先级线程: " + i);
            }
        });

        Thread lowPriority = new Thread(() -> {
            for (int i = 0; i < 5; i++) {
                System.out.println("低优先级线程: " + i);
            }
        });

        highPriority.setPriority(Thread.MAX_PRIORITY); // 10
        lowPriority.setPriority(Thread.MIN_PRIORITY);  // 1

        lowPriority.start();
        highPriority.start();

        // 注意：优先级高只是大概率先执行，不保证
        // 线程调度由操作系统决定
    }
}
```

> ⚠️ **注意：** 优先级高度依赖操作系统，不同平台表现可能不同。**不要**依赖优先级来保证线程执行顺序。

---

### 3.6 守护线程（Daemon Thread）

> 守护线程是为其他线程服务的线程，当所有非守护线程结束时，JVM 会退出，守护线程也会随之结束。

**特点：**
- 守护线程优先级低，用于为用户线程提供服务
- 当 JVM 中只有守护线程时，JVM 会退出
- 垵护线程中的 `finally` 块**不一定**会执行

```java
public class DaemonDemo {
    public static void main(String[] args) throws InterruptedException {
        // 守护线程
        Thread daemonThread = new Thread(() -> {
            int count = 0;
            while (true) {
                try {
                    System.out.println("守护线程运行中: " + count++);
                    Thread.sleep(500);
                } catch (InterruptedException e) {
                    System.out.println("守护线程被中断");
                    break;
                } finally {
                    System.out.println("守护线程 finally 块");
                }
            }
        });

        daemonThread.setDaemon(true); // 设置为守护线程（必须在 start() 前）
        daemonThread.start();

        // 主线程（用户线程）
        Thread.sleep(2000);
        System.out.println("主线程结束，JVM 退出，守护线程也会结束");
    }
}
```

**守护线程的应用场景：**
- **垃圾回收器**（GC）
- **定时任务调度**
- **日志记录**
- **监控统计**

---

### 3.7 线程的中断

> 线程中断是**协作机制**，不是强制停止。调用 `interrupt()` 只是设置中断标志，线程需要自己检查并处理中断。

#### 中断相关方法

| 方法 | 说明 |
|:---|:---|
| **interrupt()** | 中断线程，设置中断标志 |
| **isInterrupted()** | 检查线程是否被中断（**不**清除标志） |
| **interrupted()** | 静态方法，检查并**清除**中断标志 |

#### 示例：正确处理中断

```java
public class InterruptDemo {
    public static void main(String[] args) throws InterruptedException {
        Thread thread = new Thread(() -> {
            while (!Thread.currentThread().isInterrupted()) {
                System.out.println("线程运行中...");

                try {
                    Thread.sleep(500);
                } catch (InterruptedException e) {
                    // sleep() 方法会清除中断标志
                    // 捕获异常后需要重新设置中断标志
                    System.out.println("线程被中断");
                    Thread.currentThread().interrupt(); // 重新设置中断标志
                    break;
                }
            }
            System.out.println("线程安全退出");
        });

        thread.start();
        Thread.sleep(2000);
        thread.interrupt(); // 中断线程
    }
}
```

#### 中断的最佳实践

```java
public class InterruptBestPractice {
    public static void main(String[] args) throws InterruptedException {
        Thread thread = new Thread(() -> {
            try {
                // 方式1: 检查中断标志
                while (!Thread.currentThread().isInterrupted()) {
                    // 执行任务
                    System.out.println("任务执行中...");
                    Thread.sleep(500);
                }
            } catch (InterruptedException e) {
                // 方式2: 捕获中断异常
                // 保持中断状态
                Thread.currentThread().interrupt();
            } finally {
                // 清理资源
                System.out.println("清理资源，线程退出");
            }
        });

        thread.start();
        Thread.sleep(2000);
        thread.interrupt();
    }
}
```

> ⚠️ **不要使用 `stop()` 方法！** 该方法已被废弃，因为它不安全，可能导致数据不一致。

---

### 3.8 线程通信（wait/notify 机制）

> 线程间通信主要用于协调多个线程的执行顺序，实现生产者-消费者模式等场景。

#### wait/notify/notifyAll 方法

| 方法 | 说明 | 使用条件 |
|:---|:---|:---|
| **wait()** | 线程等待，释放锁 | 必须在 `synchronized` 代码块内 |
| **wait(long timeout)** | 等待指定时间 | 必须在 `synchronized` 代码块内 |
| **notify()** | 唤醒**一个**等待线程 | 必须在 `synchronized` 代码块内 |
| **notifyAll()** | 唤醒**所有**等待线程 | 必须在 `synchronized` 代码块内 |

#### 生产者-消费者模型示例

```java
public class ProducerConsumerDemo {
    private static final int MAX_SIZE = 5;
    private static final List<Integer> queue = new ArrayList<>();

    public static void main(String[] args) {
        Object lock = new Object();

        // 生产者线程
        Thread producer = new Thread(() -> {
            for (int i = 0; i < 10; i++) {
                synchronized (lock) {
                    while (queue.size() >= MAX_SIZE) {
                        try {
                            System.out.println("队列已满，生产者等待");
                            lock.wait(); // 等待并释放锁
                        } catch (InterruptedException e) {
                            e.printStackTrace();
                        }
                    }

                    queue.add(i);
                    System.out.println("生产: " + i + ", 队列大小: " + queue.size());
                    lock.notifyAll(); // 唤醒所有等待线程
                }
            }
        });

        // 消费者线程
        Thread consumer = new Thread(() -> {
            for (int i = 0; i < 10; i++) {
                synchronized (lock) {
                    while (queue.isEmpty()) {
                        try {
                            System.out.println("队列为空，消费者等待");
                            lock.wait(); // 等待并释放锁
                        } catch (InterruptedException e) {
                            e.printStackTrace();
                        }
                    }

                    int value = queue.remove(0);
                    System.out.println("消费: " + value + ", 队列大小: " + queue.size());
                    lock.notifyAll(); // 唤醒所有等待线程
                }
            }
        });

        producer.start();
        consumer.start();
    }
}
```

#### wait() 和 sleep() 的区别

| 特性 | wait() | sleep() |
|:---|:---|:---|
| **来源** | Object 类 | Thread 类 |
| **释放锁** | ✅ 释放锁 | ❌ 不释放锁 |
| **使用位置** | 必须在 `synchronized` 中 | 任意位置 |
| **唤醒方式** | `notify()` / `notifyAll()` | 超时或 `interrupt()` |
| **用途** | 线程间通信 | 线程休眠 |

---

### 3.9 ThreadLocal（线程本地变量）

> `ThreadLocal` 提供线程局部变量，每个线程都有自己独立的变量副本，互不干扰。

#### ThreadLocal 的使用

```java
public class ThreadLocalDemo {
    // 创建 ThreadLocal 变量
    private static ThreadLocal<String> threadLocal = new ThreadLocal<>();

    public static void main(String[] args) throws InterruptedException {
        // 主线程设置值
        threadLocal.set("主线程的值");
        System.out.println("主线程: " + threadLocal.get());

        // 子线程1
        Thread thread1 = new Thread(() -> {
            threadLocal.set("线程1的值");
            System.out.println("线程1: " + threadLocal.get());
        });

        // 子线程2
        Thread thread2 = new Thread(() -> {
            // 不设置值，获取到的是 null
            System.out.println("线程2: " + threadLocal.get());

            threadLocal.set("线程2的值");
            System.out.println("线程2: " + threadLocal.get());

            // 使用完毕后移除，防止内存泄漏
            threadLocal.remove();
        });

        thread1.start();
        thread2.start();

        thread1.join();
        thread2.join();

        // 主线程的值不受影响
        System.out.println("主线程: " + threadLocal.get());
        threadLocal.remove();
    }
}
```

#### ThreadLocal 的应用场景

```java
// 1. 数据库连接管理
public class DbContext {
    private static ThreadLocal<Connection> connectionHolder = new ThreadLocal<>();

    public static Connection getConnection() {
        Connection conn = connectionHolder.get();
        if (conn == null) {
            conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/db");
            connectionHolder.set(conn);
        }
        return conn;
    }

    public static void closeConnection() {
        Connection conn = connectionHolder.get();
        if (conn != null) {
            conn.close();
            connectionHolder.remove(); // 防止内存泄漏
        }
    }
}

// 2. 用户信息传递
public class UserContext {
    private static ThreadLocal<User> userHolder = new ThreadLocal<>();

    public static void setUser(User user) {
        userHolder.set(user);
    }

    public static User getUser() {
        return userHolder.get();
    }

    public static void clear() {
        userHolder.remove();
    }
}

// 3. 日期格式化（SimpleDateFormat 不是线程安全的）
public class DateUtils {
    private static ThreadLocal<SimpleDateFormat> dateFormatHolder =
        ThreadLocal.withInitial(() -> new SimpleDateFormat("yyyy-MM-dd HH:mm:ss"));

    public static String format(Date date) {
        return dateFormatHolder.get().format(date);
    }
}
```

#### ThreadLocal 的内存泄漏问题

> ⚠️ **注意：** ThreadLocal 可能导致内存泄漏，使用完毕后**必须调用 `remove()` 方法**。

**内存泄漏原因：**
- ThreadLocalMap 中的 Entry 继承了 `WeakReference<ThreadLocal<?>>`
- Key（ThreadLocal 对象）是弱引用，GC 时会被回收
- Value 是强引用，如果线程长时间不结束，Value 不会被回收
- 导致内存泄漏

**解决方法：**
```java
try {
    threadLocal.set(value);
    // 使用 threadLocal
} finally {
    threadLocal.remove(); // 必须在 finally 中清理
}
```

---

### 3.10 InheritableThreadLocal（可继承的线程本地变量）

> `InheritableThreadLocal` 允许子线程继承父线程的 ThreadLocal 值。

```java
public class InheritableThreadLocalDemo {
    private static ThreadLocal<String> threadLocal = new ThreadLocal<>();
    private static ThreadLocal<String> inheritableThreadLocal = new InheritableThreadLocal<>();

    public static void main(String[] args) throws InterruptedException {
        // 主线程设置值
        threadLocal.set("主线程的值");
        inheritableThreadLocal.set("可继承的值");

        System.out.println("主线程 - threadLocal: " + threadLocal.get());
        System.out.println("主线程 - inheritableThreadLocal: " + inheritableThreadLocal.get());

        Thread childThread = new Thread(() -> {
            // 子线程获取值
            System.out.println("子线程 - threadLocal: " + threadLocal.get()); // null
            System.out.println("子线程 - inheritableThreadLocal: " + inheritableThreadLocal.get()); // 可继承的值
        });

        childThread.start();
        childThread.join();
    }
}
```

**应用场景：**
- 传递用户上下文信息
- 传递链路追踪 ID（Trace ID）
- 传递请求级别的配置信息

---

> 📚 **JUC 并发编程知识体系**
