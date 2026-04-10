# Java 集合框架体系

> Java 集合框架提供了一套性能优良、使用方便的接口和类，位于 `java.util` 包中

---

## 一、Collection 接口

Collection 是最顶层的集合接口，它继承了 Iterable 接口。常见的子接口有 List 和 Set。

```
        Iterable
            │
         Collection
            │
    ┌───────┴───────┐
    │               │
  List           Set    Queue
    │               │
    ├─ArrayList     ├─HashSet
    ├─LinkedList    ├─LinkedHashSet
    ├─Vector        ├─TreeSet
    └─Stack         └─ConcurrentSkipListSet
```

---

### 1.1 Set 接口

Set 不允许重复元素，无序（除 LinkedHashSet 外）。

---

#### ① HashSet

> 本质的底层是直接使用 `HashMap` 实现的，key 是值，value 是 `private static final Object PRESENT = new Object()` 这一个空的值。

```java
public HashSet() {
    map = new HashMap<>();
}

// 存储的 value 是一个空值处理的
public boolean add(E e) {
    return map.put(e, PRESENT) == null;
}
```

**特点：**
- 允许 `null` 值
- 不保证迭代顺序
- 非线程安全
- 时间复杂度：O(1)

---

#### ② LinkedHashSet

> 基于 `LinkedHashMap`（HashMap + 双向链表）

**特点：**
- 继承自 HashSet
- 维护插入顺序
- 性能略低于 HashSet
- 适用于需要保持插入顺序的场景

---

#### ③ TreeSet

> 基于 `TreeMap`（红黑树结构）

**特点：**
- 元素自动排序（自然排序或自定义比较器）
- **不允许存储 `null`**（排序时会抛出空指针异常）
- 时间复杂度：O(log n)
- 实现 `SortedSet` 接口

---

#### ④ ConcurrentSkipListSet

> 基于 `ConcurrentSkipListMap`（跳表结构），线程安全（并发场景下的 TreeSet 替代），不能出现 null

**并发安全**：通过「无锁 + CAS + 分段锁（节点级锁）」实现

##### 添加元素：新插入的元素需要处理 1/4 的随机层高

```java
public boolean add(E e) {
    return m.putIfAbsent(e, Boolean.TRUE) == null;
}

// ConcurrentMap
V putIfAbsent(K key, V value);

// ConcurrentSkipListMap
public V putIfAbsent(K key, V value) {
    if (value == null)
        throw new NullPointerException();
    return doPut(key, value, true);
}

private V doPut(K key, V value, boolean onlyIfAbsent) {
    if (key == null)
        throw new NullPointerException();
    Comparator<? super K> cmp = comparator;
    for (;;) {
        Index<K,V> h; Node<K,V> b;
        VarHandle.acquireFence(); // 内存屏障，保证后续读取的可见性，确保后续读取到的是最新的内存数据
        int levels = 0;                    // number of levels descended
        if ((h = head) == null) {          // 初始化
            Node<K,V> base = new Node<K,V>(null, null, null);
            h = new Index<K,V>(base, null, null);
            // CAS 设置 head：保证只有一个线程能成功初始化
            b = (HEAD.compareAndSet(this, null, h)) ? base : null;
        }
        else {
            for (Index<K,V> q = h, r, d;;) { // count while descending
                while ((r = q.right) != null) {
                    Node<K,V> p; K k;
                    if ((p = r.node) == null || (k = p.key) == null ||
                        p.val == null)
                        RIGHT.compareAndSet(q, r, r.right);
                    // key 比当前索引节点的 key 大，继续向右
                    else if (cpr(cmp, key, k) > 0)
                        q = r;
                    else
                        break;
                }
                if ((d = q.down) != null) {
                    ++levels;
                    q = d;
                }
                else {
                    b = q.node;
                    break;
                }
            }
        }
        if (b != null) {
            Node<K,V> z = null;              // new node, if inserted
            for (;;) {                       // find insertion point
                Node<K,V> n, p; K k; V v; int c;
                if ((n = b.next) == null) {
                    if (b.key == null)       // if empty, type check key now
                        cpr(cmp, key, key);
                    c = -1;
                }
                else if ((k = n.key) == null)
                    break;                   // can't append; restart
                else if ((v = n.val) == null) {
                    unlinkNode(b, n);
                    c = 1;
                }
                else if ((c = cpr(cmp, key, k)) > 0)
                    b = n;
                else if (c == 0 &&
                         (onlyIfAbsent || VAL.compareAndSet(n, v, value)))
                    return v;

                if (c < 0 &&
                    NEXT.compareAndSet(b, n,
                                       p = new Node<K,V>(key, value, n))) {
                    z = p;
                    break;
                }
            }

            if (z != null) {
                int lr = ThreadLocalRandom.nextSecondarySeed();
                if ((lr & 0x3) == 0) {       // add indices with 1/4 prob
                    int hr = ThreadLocalRandom.nextSecondarySeed();
                    long rnd = ((long)hr << 32) | ((long)lr & 0xffffffffL);
                    int skips = levels;      // levels to descend before add
                    Index<K,V> x = null;
                    for (;;) {               // create at most 62 indices
                        x = new Index<K,V>(z, x, null);
                        if (rnd >= 0L || --skips < 0)
                            break;
                        else
                            rnd <<= 1;
                    }
                    if (addIndices(h, skips, x, cmp) && skips < 0 &&
                        head == h) {         // try to add new level
                        Index<K,V> hx = new Index<K,V>(z, x, null);
                        Index<K,V> nh = new Index<K,V>(h.node, h, hx);
                        HEAD.compareAndSet(this, h, nh);
                    }
                    if (z.val == null)       // deleted while adding indices
                        findPredecessor(key, cmp); // clean
                }
                addCount(1L);
                return null;
            }
        }
    }
}
```

##### 获取「大于等于 key」的最小 key

```java
private static final int EQ = 1;
private static final int LT = 2;
private static final int GT = 0;

public K ceilingKey(K key) {
    Node<K,V> n = findNear(key, GT|EQ, comparator); // 大于等于的时候传入,值为(0按位或1 = 1)
    return (n == null) ? null : n.key;
}


final Node<K,V> findNear(K key, int rel, Comparator<? super K> cmp) {
    if (key == null)
        throw new NullPointerException();
    Node<K,V> result;
    outer: for (Node<K,V> b;;) {
        if ((b = findPredecessor(key, cmp)) == null) {
            result = null;
            break;                   // empty
        }
        for (;;) {
            Node<K,V> n; K k; int c;
            if ((n = b.next) == null) {
                result = ((rel & LT) != 0 && b.key != null) ? b : null;
                break outer;
            }
            else if ((k = n.key) == null)
                break;
            else if (n.val == null)
                unlinkNode(b, n);
            else if (((c = cpr(cmp, key, k)) == 0 && (rel & EQ) != 0) ||
                     (c < 0 && (rel & LT) == 0)) {
                result = n;
                break outer;
            }
            else if (c <= 0 && (rel & LT) != 0) {
                result = (b.key != null) ? b : null;
                break outer;
            }
            else
                b = n;
        }
    }
    return result;
}
```

---

### 1.2 List 接口

List 有序集合，允许重复元素，可以通过索引访问。

---

#### ① ArrayList

> 底层用的是数组实现，可以做动态的自动扩容处理

**特点：**
- `size()`、`isEmpty()`、`get()`、`set()` 方法均能在常数时间内完成
- `add()` 方法的时间开销跟插入位置有关
- `addAll()` 方法的时间开销跟添加元素的个数成正比
- 其余方法大都是线性时间
- 为追求效率，ArrayList 没有实现同步（synchronized）
- 如果需要多个线程并发访问，用户可以手动同步，也可使用 Vector 替代

---

##### modCount - 实现快速失败的判断依据

> 迭代器 `int expectedModCount = modCount;` 会执行这个操作，复制当前的版本，后在使用时候会使用：

```java
final void checkForComodification() {
    if (modCount != expectedModCount)
        throw new ConcurrentModificationException();
}
```

这个方法看当前迭代器的 modcount 的值做一个版本的比较

在一般的 `add()` 操作的时候会执行：`modCount++;` 这个指令，让 modCount+1

但是 `modcount++` 是一个非原子性的操作，在并发的场景中还是会出现 modcount 版本号比对失败的问题

```java
/**
 * 此列表发生<i>结构性修改</i>的次数。
 * 结构性修改指那些会改变列表大小的操作，或者以其他方式干扰列表，
 * 导致正在进行的迭代可能产生不正确结果的操作。
 *
 * <p>此字段由 {@code iterator} 和 {@code listIterator} 方法返回的迭代器（iterator）
 * 和列表迭代器（list iterator）实现类使用。如果此字段的值意外发生变化，
 * 迭代器（或列表迭代器）会在响应 {@code next}、{@code remove}、{@code previous}、
 * {@code set} 或 {@code add} 操作时抛出 {@code ConcurrentModificationException} 异常。
 * 这一设计提供了<i>快速失败（fail-fast）</i>的行为，而非在迭代过程中遇到并发修改时
 * 产生不确定的行为。
 *
 * <p><b>子类是否使用此字段是可选的。</b>如果子类希望提供快速失败的迭代器（或列表迭代器），
 * 只需在其 {@code add(int, E)} 和 {@code remove(int)} 方法（以及其他所有被重写、
 * 且会对列表造成结构性修改的方法）中递增此字段的值即可。单次调用
 * {@code add(int, E)} 或 {@code remove(int)} 方法时，此字段的增量不得超过 1，
 * 否则迭代器（和列表迭代器）会抛出虚假的（bogus）{ConcurrentModificationException} 异常。
 * 如果实现类不希望提供快速失败的迭代器，则可以忽略此字段。
 */
protected transient int modCount = 0;
```

---

##### 自动扩容机制

> 自动扩容流程：进入 `grow()` 函数，并给予最新的需要变成的长度 → 进入 `newLength()`，看能不能符合 1.5 倍数扩容 → 不能就进入 `hugeLength()`，看能不能扩容到最新的需要变成的长度的大小

```java
public boolean add(E e) {
    modCount++;
    add(e, elementData, size);
    return true;
}

private void add(E e, Object[] elementData, int s) {
    if (s == elementData.length)
        elementData = grow();
    elementData[s] = e;
    size = s + 1;
}

// size + 1 写在这个里面而不是上面是为了实现分离的，方便扩展
private Object[] grow() {
    return grow(size + 1);
}

private Object[] grow(int minCapacity) {
    int oldCapacity = elementData.length;
    if (oldCapacity > 0 || elementData != DEFAULTCAPACITY_EMPTY_ELEMENTDATA) {
        int newCapacity = ArraysSupport.newLength(oldCapacity,
                minCapacity - oldCapacity, /* minimum growth */
                oldCapacity >> 1           /* preferred growth */); // 右移1位 = 除以2
        return elementData = Arrays.copyOf(elementData, newCapacity);
    } else {
        return elementData = new Object[Math.max(DEFAULT_CAPACITY, minCapacity)];
    }
}

public static int newLength(int oldLength, int minGrowth, int prefGrowth) {
    int prefLength = oldLength + Math.max(minGrowth, prefGrowth); // might overflow
    if (0 < prefLength && prefLength <= SOFT_MAX_ARRAY_LENGTH) {
        return prefLength;
    } else {
        // put code cold in a separate method
        return hugeLength(oldLength, minGrowth);
    }
}

private static int hugeLength(int oldLength, int minGrowth) {
    int minLength = oldLength + minGrowth;
    if (minLength < 0) { // overflow
        throw new OutOfMemoryError(
            "Required array length " + oldLength + " + " + minGrowth + " is too large");
    } else if (minLength <= SOFT_MAX_ARRAY_LENGTH) {
        return SOFT_MAX_ARRAY_LENGTH;
    } else {
        return minLength;
    }
}
```

**扩容规则：**

| 场景 | 扩容策略 | 说明 |
|:---|:---|:---|
| 初始为空 | `max(DEFAULT_CAPACITY, minCapacity)` | DEFAULT_CAPACITY = 10 |
| 正常扩容 | `oldCapacity + oldCapacity >> 1` | 约 1.5 倍扩容 |
| 超出限制 | `SOFT_MAX_ARRAY_LENGTH` 或 `minLength` | Integer.MAX_VALUE - 8 |

---

#### ② LinkedList

> LinkedList 底层通过双向链表实现

**双向链表**：对于当前的节点，它既能获取到前一个元素，也能遍历到后面的一个元素

> MySQL 的 B+ 树的叶子节点就是用的这样的一个数据结构实现的快速的范围查询

```java
transient int size = 0;

/**
 * Pointer to first node.
 */
transient Node<E> first;

/**
 * Pointer to last node.
 */
transient Node<E> last;

private static class Node<E> {
    E item;
    Node<E> next;
    Node<E> prev;

    Node(Node<E> prev, E element, Node<E> next) {
        this.item = element;
        this.next = next;
        this.prev = prev;
    }
}
```

##### 查询遍历方式

> 对于查询元素是否存在（`contains`），用的也是 `indexOf(o) != -1`，为啥这个不用双指针的方式做遍历呢？

```java
public int indexOf(Object o) {
    int index = 0;
    if (o == null) {
        for (Node<E> x = first; x != null; x = x.next) {
            if (x.item == null)
                return index;
            index++;
        }
    } else {
        for (Node<E> x = first; x != null; x = x.next) {
            if (o.equals(x.item))
                return index;
            index++;
        }
    }
    return -1;
}
```

**LinkedList vs ArrayList：**

| 特性 | ArrayList | LinkedList |
|:---|:---|:---|
| 底层结构 | 数组 | 双向链表 |
| 随机访问 | O(1) | O(n) |
| 头尾插入 | O(n) | O(1) |
| 中间插入 | O(n) | O(n) |
| 内存占用 | 较小 | 较大（每个节点存储前后指针） |
| 线程安全 | ❌ | ❌ |

---

### 1.3 Queue 接口

---

#### PriorityQueue

> 底层使用的是**堆**这一数据结构，注意，它的左右儿子节点只需要比父节点大或者全部比父节点小就是一个小根堆或者大根堆的形象了

**特点：**
- 基于优先级堆（二叉堆）
- 不允许 `null` 元素
- 非线程安全
- 时间复杂度：O(log n)

---

##### 底层实现

使用**二叉堆**（完全二叉树），通过数组存储：

```
        索引:  0   1   2   3   4   5   6
        数组: [3,  5,  8,  10, 15, 17, 20]
              堆:      3
                    /    \
                   5      8
                 /  \    / \
                10  15  17  20
```

父子节点关系：
- 父节点索引：`(i - 1) / 2`
- 左子节点索引：`2 * i + 1`
- 右子节点索引：`2 * i + 2`

---

##### 扩容机制

```java
private void grow(int minCapacity) {
    int oldCapacity = queue.length;
    // Double size if small; else grow by 50%
    int newCapacity = ArraysSupport.newLength(oldCapacity,
            minCapacity - oldCapacity, /* minimum growth */
            oldCapacity < 64 ? oldCapacity + 2 : oldCapacity >> 1
                                       /* preferred growth */);
    queue = Arrays.copyOf(queue, newCapacity);
}
```

**差异化扩容策略**—— 根据原容量大小选择不同的扩容步长，而非像 ArrayList 那样固定 1.5 倍：

| 规则 | 条件 | 扩容策略 | 示例 | 设计原因 |
|:---:|:---:|:---|:---|:---|
| **规则 1** | 原容量 < 64 | **翻倍扩容** | 8→16→32→64 | 小容量时快速提升，减少扩容次数（仅需 3 次扩容） |
| **规则 2** | 原容量 ≥ 64 | **扩容 50%** | 64→96，1024→1536 | 大容量时避免内存浪费，平衡效率和内存利用率 |
| **规则 3** | 保底逻辑 | 新容量 ≥ minCapacity | 必须满足最小容量需求 | 保证满足最小容量需求 |

**代码解析：**

```java
oldCapacity < 64 ? oldCapacity + 2 : oldCapacity >> 1
```

看似是「+2」，实则结合 `ArraysSupport.newLength` 的逻辑，最终是**翻倍**：
- 例如：`oldCapacity = 8`（< 64），`minGrowth = 1`，`prefGrowth = 8 + 2 = 10`
- `prefLength = 8 + max(1, 10) = 16`（刚好翻倍）

---

## 二、Map 接口

Map 存储键值对（Key-Value），Key 不能重复。

```
           Map
            │
    ┌───────┼───────┐
    │       │       │
HashMap  TreeMap  Hashtable
    │       │
    │   LinkedHashMap
    │
ConcurrentHashMap
```

---

### 2.1 HashMap

> **JDK 7** 的底层实现：**数组 + 链表**
>
> **JDK 8** 的底层实现：**数组 + 链表 + 红黑树**

它根据键的 hashCode 值存储数据，大多数情况下可以直接定位到它的值，因而具有很快的访问速度，但遍历顺序却是不确定的。

**特点：**
- HashMap 最多只允许一条记录的键为 null，允许多条记录的值为 null
- HashMap 非线程安全，即任一时刻可以有多个线程同时写 HashMap，可能会导致数据的不一致
- 如果需要满足线程安全，可以用 Collections 的 `synchronizedMap` 方法使 HashMap 具有线程安全的能力，或者使用 ConcurrentHashMap

---

#### Node 节点元素

```java
static class Node<K,V> implements Map.Entry<K,V> {
    final int hash;
    final K key;
    V value;
    Node<K,V> next;

    Node(int hash, K key, V value, Node<K,V> next) {
        this.hash = hash;
        this.key = key;
        this.value = value;
        this.next = next;
    }

    public final K getKey()        { return key; }
    public final V getValue()      { return value; }
    public final String toString() { return key + "=" + value; }

    public final int hashCode() {
        return Objects.hashCode(key) ^ Objects.hashCode(value);
    }

    public final V setValue(V newValue) {
        V oldValue = value;
        value = newValue;
        return oldValue;
    }

    public final boolean equals(Object o) {
        if (o == this)
            return true;
        return o instanceof Map.Entry<?, ?> e
                && Objects.equals(key, e.getKey())
                && Objects.equals(value, e.getValue());
    }
}
```

---

#### JDK 7 的环形链表问题

##### 三个必要条件：

1. 多线程同时执行添加操作
2. 触发 HashMap 扩容机制
3. JDK 1.7 之前（包含 JDK 1.7）采用的是**头插法**

##### 环形链表形成过程：

```
初始状态：b → c

T1 执行插入 a，T2 也执行插入操作（需要扩容）

T1 执行到给 a 节点赋值 a.next 时，时间片用完
数据链表：a → b → c

T2 执行完成，扩容后该节点的链表：c → b → a

T1 继续执行为 a 节点赋值 a.next
数据链表：c → b → a → b  ← 出现环形链表！
```

> JDK 8 改用**尾插法**解决了这个问题

---

#### 为什么 HashMap 可以存 null，ConcurrentHashMap 不能？

图片转自 JavaGuide：https://mp.weixin.qq.com/s/uvQsQ0ZbcBn05WShPBjU5Q

---

##### ① Value 不能为 null

首先是并发过程中，如果写：

```java
if (contains(key)) {
    get(key);
}
```

- 在判断和获取之间，其他线程可以修改删除 key 的 value（操作不是原子性的）
- 如果允许它的 value 存在 null，就不知道最后获取的时候这个 key 里面的 value 是不存在，还是为 null 了
- 这段代码在规范中是不能这样写的，Java 的 ConcurrentHashMap 有自己的原子操作

**推荐使用的原子方法：**

| 场景 | 推荐原子方法 | 说明 |
|:---|:---|:---|
| 存在则取值，不存在则计算 | `computeIfAbsent(key, mappingFunction)` | 原子完成「检查 - 计算 - 插入」 |
| 存在则更新，不存在则插入 | `merge(key, value, remappingFunction)` | 原子完成「检查 - 合并」 |
| 原子替换 | `replace(key, oldValue, newValue)` | 只有当前值等于 oldValue 时才替换 |

但还是有很多人会写成上面的代码去获取值，Java 设计师只能**禁止 value 为 null**。

> **「先判断再取值」的不可重复读，是弱一致性的体现，但不是线程不安全**，这在写法上本来就有缺陷，需要自己做设计处理，自己加锁才行。如果 Java 设计师为了这个缺陷加锁处理的话，会牺牲巨大的并发性能。

---

##### ② Key 不能为 null

首先是歧义的问题。

还有就是代码中的 CAS 机制是使用的 `key == null` 来给位置上锁的。

**为什么一定要用这个判断方法来上锁？**

因为设计哲学需要：
- 如果引入其他的一个变量做逻辑判断的话，首先需要判断，然后需要赋值（告诉其他线程这个地方上锁了），然后再给这个位置开空间、赋值
- 这一个过程太耗费时间空间了，没必要

**性能对比：**

| 操作 | 耗时 |
|:---|:---|
| CAS 无锁操作 | 几十纳秒（0.0000000x 秒） |
| 加锁竞争 + 多步操作 | 几十微秒～几毫秒 |

**差距：100 倍～10000 倍**

---

### 2.2 LinkedHashMap

> LinkedHashMap 是 HashMap 的一个子类，保存了记录的插入顺序

**特点：**
- 在用 Iterator 遍历 LinkedHashMap 时，先得到的记录肯定是先插入的
- 也可以在构造时带参数，按照访问次序排序（LRU 缓存）
- 维护双向链表保证顺序
- 时间复杂度：O(1)

**应用场景：**
- LRU（Least Recently Used）缓存实现
- 需要保持插入顺序的场景

---

### 2.3 TreeMap

> TreeMap 实现 SortedMap 接口，能够把它保存的记录根据键排序

**特点：**
- 默认是按键值的升序排序
- 可以指定排序的比较器
- 当用 Iterator 遍历 TreeMap 时，得到的记录是排过序的
- 如果使用排序的映射，建议使用 TreeMap
- 在使用 TreeMap 时，key 必须实现 Comparable 接口或者在构造 TreeMap 传入自定义的 Comparator，否则会在运行时抛出 `java.lang.ClassCastException` 类型的异常

**时间复杂度：**
- 查找、插入、删除：O(log n)

---

### 2.4 Hashtable（遗留类，不推荐使用）

> Hashtable 是遗留类，很多映射的常用功能与 HashMap 类似

**特点：**
- 继承自 Dictionary 类
- **线程安全**，任一时间只有一个线程能写 Hashtable
- 并发性不如 ConcurrentHashMap，因为 ConcurrentHashMap 引入了分段锁
- **不建议在新代码中使用**
- 不需要线程安全的场合可以用 HashMap 替换
- 需要线程安全的场合可以用 ConcurrentHashMap 替换

**Hashtable vs ConcurrentHashMap：**

| 特性 | Hashtable | ConcurrentHashMap |
|:---|:---|:---|
| 线程安全 | ✅ 全锁 | ✅ 分段锁/CAS |
| 并发性能 | ❌ 低 | ✅ 高 |
| 允许 null key/value | ❌ | ❌ |
| 迭代器 | ❌ 强一致性，可能抛异常 | ✅ 弱一致性，安全 |
| 推荐使用 | ❌ | ✅ |

---

## 三、总结对比

### 3.1 Set 对比

| 实现类 | 底层结构 | 有序性 | 线程安全 | null | 时间复杂度 |
|:---|:---|:---|:--- |:---:|:---:|
| **HashSet** | HashMap | ❌ | ❌ | ✅ | O(1) |
| **LinkedHashSet** | LinkedHashMap | 插入顺序 | ❌ | ✅ | O(1) |
| **TreeSet** | TreeMap | 排序 | ❌ | ❌ | O(log n) |
| **ConcurrentSkipListSet** | ConcurrentSkipListMap | 排序 | ✅ | ❌ | O(log n) |

### 3.2 List 对比

| 实现类 | 底层结构 | 随机访问 | 插入删除 | 线程安全 |
|:---|:---|:---:|:---:|:---:|
| **ArrayList** | 数组 | ✅ O(1) | ❌ O(n) | ❌ |
| **LinkedList** | 双向链表 | ❌ O(n) | ✅ O(1) | ❌ |
| **Vector** | 数组 | ✅ O(1) | ❌ O(n) | ✅ |
| **CopyOnWriteArrayList** | 数组（副本） | ✅ O(1) | ❌ O(n) | ✅ |

### 3.3 Map 对比

| 实现类 | 底层结构 | 有序性 | 线程安全 | null key | null value | 时间复杂度 |
|:---|:---|:---|:--- |:---:|:---:|:---:|
| **HashMap** | 数组+链表+红黑树 | ❌ | ❌ | ✅ | ✅ | O(1) ~ O(n) |
| **LinkedHashMap** | HashMap + 双向链表 | 插入/访问顺序 | ❌ | ✅ | ✅ | O(1) |
| **TreeMap** | 红黑树 | 排序 | ❌ | ❌ | ✅ | O(log n) |
| **ConcurrentHashMap** | 数组+链表+红黑树 | ❌ | ✅ | ❌ | ❌ | O(1) ~ O(n) |
| **Hashtable** | 数组+链表 | ❌ | ✅ | ❌ | ❌ | O(1) ~ O(n) |

---

> 📚 **Java 集合框架知识体系**
