# PostgreSQL 进阶：窗口函数/JSONB/高级索引/pgvector 向量扩展（生产收藏级）

> **副标题**：窗口函数分析查询、GIN/GiST 索引、JSONB 类型、pgvector 向量检索与 AI 应用结合

> 面试官问「窗口函数和 GROUP BY 有什么区别？」，多数人只会背一句「窗口函数不聚合行」。能把 `LAG()` 怎么算每位患者检验值环比、JSONB 为什么生产优先、GIN 索引和 B+ 树的本质区别、pgvector 三种距离算子分别对应什么相似度——讲清楚，才说明你真的在生产里扛过 PostgreSQL，而不只是会 `SELECT * FROM`。

---

## 🎯 这篇文章解决什么问题

PostgreSQL 是「Node.js 全栈深度拆解」系列数据库板块的第四篇。但这一篇和前三篇的定位不一样：MySQL/MongoDB/Redis 篇各讲一个数据库的「全家桶」，PostgreSQL 篇**不重复 CRUD 基础**——`SELECT`/`INSERT`/`UPDATE`/`DELETE`、`JOIN` 多表查询、事务这些，与 MySQL 高度相似，你已经有基础了，再讲一遍是浪费时间。

这篇文章只聚焦 PostgreSQL 真正「特色」的能力，也就是别的数据库没有、或者做得没它好的东西：

- **基本使用**：窗口函数、JSONB 类型、数组类型、pgvector 向量扩展四大特色能力的上手
- **企业最佳实践**：窗口函数 vs `GROUP BY` 的本质区别、JSONB 优先的原因、GIN/GiST 索引选型、pgvector 三种距离算子、精确检索 vs 近似索引的权衡
- **注意事项**：与 MySQL 的 MVCC 差异带来的 VACUUM 膨胀坑、JSONB 键重排、高维向量召回率下降

其中 **pgvector 是这一篇的重头戏**——它把「数据库」和「AI 应用」直接连起来了，正是本项目「药品说明书 RAG 向量库」要用到的技术。读完这一篇，你不仅能把 PostgreSQL 的特色能力讲清楚，还能把「向量检索」这个 AI 工程栈的核心环节彻底弄明白。

**既讲怎么用，也讲面试怎么答。** 5-10 年 Node 开发者的简历上，PostgreSQL 这一栏从「用过」到「能讲清为什么这么设计」，面试官的眼睛会不一样。

---

## 一、基本使用

### 1. PostgreSQL 是什么与「特色能力」总览

PostgreSQL（简称 PG）是一个开源的关系型数据库，被称为「功能最丰富、最接近 SQL 标准、扩展性最强的开源关系库」。它和 MySQL 一样都支持事务、索引、`JOIN`、外键这些关系库的基本盘，但 PG 有一批 MySQL 没有（或做得没那么好）的特色能力。

**为什么这篇不重复 CRUD**：`SELECT`/`INSERT`/`UPDATE`/`DELETE`、`JOIN` 多表关联、`BEGIN`/`COMMIT`/`ROLLBACK` 事务——这些在 MySQL 篇（第 12 篇）已经讲透了，PG 的写法几乎一模一样。所以这篇文章直接跳过这部分，聚焦四大特色：

| 特色能力 | 解决什么问题 | 一句话 |
|---------|------------|-------|
| 窗口函数 | 分析型查询（排名、环比、累计） | 在「保留每一行明细」的同时算聚合 |
| JSONB 类型 | 非结构化/半结构化数据存储 | 既灵活又能走索引 |
| 数组类型 | 一对多的小集合字段 | 免去多建一张关联表的麻烦 |
| pgvector 扩展 | 向量存储与相似度检索 | 把 AI 的 embedding 检索搬进数据库 |

这四块，就是 PG 区别于 MySQL 的「护城河」，也是这篇文章的全部内容。下面逐个上手。

### 2. 窗口函数：统计每位医生的接诊序号

窗口函数是 PG 分析型查询的招牌能力。先建一张医生接诊记录表：

```sql
-- 医生接诊记录表：记录每位医生每次接诊的时间和患者
CREATE TABLE consultations (
  id SERIAL PRIMARY KEY,
  doctor_id INT NOT NULL,          -- 医生 ID
  patient_id INT NOT NULL,         -- 患者 ID
  visit_time TIMESTAMP NOT NULL    -- 接诊时间
);

INSERT INTO consultations (doctor_id, patient_id, visit_time) VALUES
  (1, 101, '2026-09-23 09:00'),
  (1, 102, '2026-09-23 09:30'),
  (1, 103, '2026-09-23 10:00'),
  (2, 201, '2026-09-23 09:15'),
  (2, 202, '2026-09-23 09:45');
```

现在要统计**每位医生「按接诊时间排序」的接诊序号**——也就是医生 1 的第一单、第二单、第三单，医生 2 的第一单、第二单。用 `ROW_NUMBER()`：

```sql
SELECT
  doctor_id,
  patient_id,
  visit_time,
  ROW_NUMBER() OVER (
    PARTITION BY doctor_id      -- 👈 按医生分组（每个医生独立编号）
    ORDER BY visit_time         -- 👈 组内按接诊时间排序
  ) AS seq
FROM consultations;
```

结果：

```
 doctor_id | patient_id |     visit_time      | seq
-----------+------------+---------------------+-----
         1 |        101 | 2026-09-23 09:00:00 |   1
         1 |        102 | 2026-09-23 09:30:00 |   2
         1 |        103 | 2026-09-23 10:00:00 |   3
         2 |        201 | 2026-09-23 09:15:00 |   1
         2 |        202 | 2026-09-23 09:45:00 |   2
```

`ROW_NUMBER()` 给每个分区内的每一行编一个**从 1 开始连续递增**的序号。注意这里返回的是**所有行**，而不是像 `GROUP BY` 那样把每位医生压成一行——这就是窗口函数和聚合的本质区别（第二部分展开）。

窗口函数家族还有几个常用的成员，区别在「并列名次怎么处理」：

```sql
-- RANK()：并列时跳过名次（1、1、3）
-- DENSE_RANK()：并列时不跳过名次（1、1、2）
-- ROW_NUMBER()：完全不分并列，就是 1、2、3
SELECT
  doctor_id,
  visit_time,
  ROW_NUMBER() OVER (PARTITION BY doctor_id ORDER BY visit_time) AS rn,
  RANK()       OVER (PARTITION BY doctor_id ORDER BY visit_time) AS rk,
  DENSE_RANK() OVER (PARTITION BY doctor_id ORDER BY visit_time) AS dr
FROM consultations;
```

还有两个「取上一条/下一条」的函数，在做环比、趋势分析时特别有用：

```sql
-- LAG()：取「上一行」的某个字段；LEAD()：取「下一行」的某个字段
SELECT
  patient_id,
  visit_time,
  LAG(visit_time) OVER (PARTITION BY patient_id ORDER BY visit_time) AS last_visit_time
  -- 👈 每位患者「上一次就诊时间」
FROM consultations;
```

> 💬 **面试官**：`ROW_NUMBER()`、`RANK()`、`DENSE_RANK()` 有什么区别？
>
> ✅ 标准答案：三者都是排名函数，区别在「并列名次怎么处理」。`ROW_NUMBER()` 完全不分并列，就是严格 1、2、3；`RANK()` 遇到并列会跳过名次（两个并列第一，下一个是 3）；`DENSE_RANK()` 遇到并列不跳过（两个并列第一，下一个是 2）。
>
> 🎁 加分答案：能落到场景——「并列需要空出名次」（如竞赛名次用 `RANK`）用 `RANK`，「只要相对顺序、并列连续」用 `DENSE_RANK`，「必须有唯一序号」（如分页、去重）用 `ROW_NUMBER`。

### 3. JSONB 类型：存储患者问诊表单

PG 有 `JSON` 和 `JSONB` 两种 JSON 类型（区别在第二部分重点讲，这里先用 `JSONB`）。它适合存「非结构化」的数据——比如患者问诊表单，不同科室的表单字段不一样，用固定列建模很别扭，用 JSONB 一列就装下了。

```sql
-- 问诊记录表：表单数据用 JSONB 存，不同科室字段可以不一样
CREATE TABLE inquiry_forms (
  id SERIAL PRIMARY KEY,
  patient_id INT NOT NULL,
  dept VARCHAR(50) NOT NULL,          -- 科室
  form_data JSONB NOT NULL            -- 表单数据（JSONB）
);

INSERT INTO inquiry_forms (patient_id, dept, form_data) VALUES
  (101, '内科', '{"symptom": "发热", "temp": 38.5, "duration_days": 2}'),
  (102, '外科', '{"symptom": "腹痛", "allergies": ["青霉素", "头孢"]}');
```

JSONB 的查询靠几个操作符，这是和普通文本列最大的不同：

```sql
-- ->  取 JSON 对象（返回 jsonb 类型）
-- ->> 取文本（返回 text 类型）
-- @>  包含判断（左边是否包含右边）
-- ?   判断某个 key 是否存在
-- #>  按路径取（返回 jsonb）
SELECT
  form_data->>'symptom' AS symptom,          -- 👈 ->> 直接取出文本值
  form_data @> '{"temp": 38.5}' AS has_temp  -- 👈 @> 判断是否包含该键值
FROM inquiry_forms
WHERE form_data ? 'allergies';               -- 👈 只查有过敏史记录的患者
```

`->` 和 `->>` 的区别是个高频考点：**`->` 返回的是 `jsonb` 类型**（还是个 JSON 对象/数组），**`->>` 返回的是 `text` 类型**（纯文本）。比如 `form_data->'temp'` 得到的是 `38.5`（jsonb），`form_data->>'temp'` 得到的是 `"38.5"` 的文本值（不带类型）。做等值比较、`ORDER BY`、`JOIN` 时通常要用 `->>` 取文本。

> 💬 **面试官**：JSONB 的 `->` 和 `->>` 操作符有什么区别？
>
> ✅ 标准答案：`->` 返回 `jsonb` 类型（仍然是 JSON 对象/数组，保留结构），`->>` 返回 `text` 类型（纯文本）。取值出来做等值比较、排序、关联时，要用 `->>` 拿到文本。
>
> 🎁 加分答案：能补充 `@>`（包含判断，可走 GIN 索引）和 `?`（key 存在判断）的用法，并点出 `->>` 取出来的 `text` 类型如果需要比较数字，还得再转类型（`(form_data->>'temp')::numeric`）。

### 4. 数组类型与 ANY/ALL

PG 原生支持数组列——有些「一对多」的小集合字段，不需要专门建一张关联表，直接用一个数组列就够。比如患者的过敏药物：

```sql
-- 患者表：过敏药物用数组存
CREATE TABLE patients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  allergies TEXT[] NOT NULL DEFAULT '{}'   -- 👈 TEXT[] 数组类型
);

INSERT INTO patients (name, allergies) VALUES
  ('张三', ARRAY['青霉素', '头孢']),
  ('李四', ARRAY['阿司匹林']),
  ('王五', ARRAY[]::TEXT[]);                -- 无过敏史，空数组
```

查询数组字段靠 `ANY` / `ALL` 操作符：

```sql
-- ANY：数组中「任意一个元素」满足条件
SELECT name FROM patients WHERE '青霉素' = ANY(allergies);   -- 对青霉素过敏的患者

-- ALL：数组中「所有元素」都满足条件
SELECT name FROM patients WHERE '青霉素' = ALL(allergies);   -- 只对青霉素这一种药过敏的患者

-- 等价写法：ANY 可以用 = ANY 也可以用 IN
SELECT name FROM patients WHERE '青霉素' = ANY(allergies);
```

`ANY` 的语义是「存在一个满足」，`ALL` 是「全部都满足」。`= ANY(array)` 其实等价于 `IN` 的数组版（`IN` 右边本来就是一组值），所以 `'青霉素' = ANY(allergies)` 读起来更符合直觉——「青霉素是否在过敏数组里」。

> 💬 **面试官**：数组查询里 `ANY` 和 `ALL` 分别是什么语义？`ANY` 和 `IN` 有关系吗？
>
> ✅ 标准答案：`ANY` 是「数组中任意一个元素满足条件」（存在性），`ALL` 是「数组中所有元素都满足条件」（全称）。`= ANY(array)` 等价于用数组做 `IN`，表示「值在不在这个数组里」。
>
> 🎁 加分答案：能补充数组类型适合「一对多的小集合」场景（如标签、过敏药物），避免为这种小集合单独建关联表；但数据量大、需要频繁按元素关联查询时，还是应该拆成关联表（数组列不好做跨表的复杂 JOIN 和按元素建索引）。

### 5. pgvector 扩展：药品说明书向量化

pgvector 是 PG 的向量检索扩展，让数据库能存 embedding 向量、做相似度检索。这是本篇的重头戏——它把「数据库」和「AI 应用」直接连起来了。

先装扩展：

```sql
CREATE EXTENSION vector;   -- 👈 启用 pgvector 扩展
```

然后建表，用 `vector(n)` 类型存 embedding（`n` 是向量维度）：

```sql
-- 药品说明书向量表：把说明书文本 embedding 化后存进来
CREATE TABLE drug_instructions (
  id SERIAL PRIMARY KEY,
  drug_name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,                  -- 说明书原文
  embedding vector(3) NOT NULL            -- 👈 3 维向量（示例用 3 维，实际几百上千维）
);

-- 插入向量：'[0.1, 0.2, 0.3]' 是向量字面量
INSERT INTO drug_instructions (drug_name, content, embedding) VALUES
  ('布洛芬', '用于缓解头痛、发热、关节痛……', '[0.1, 0.2, 0.3]'),
  ('阿莫西林', '用于治疗细菌感染……', '[0.5, 0.6, 0.7]'),
  ('氯雷他定', '用于缓解过敏性鼻炎……', '[0.9, 0.8, 0.1]');
```

相似度检索靠三个距离算子：

```sql
-- 给定一个查询向量，找出最相似的药品说明书
-- <-> 欧氏距离（L2），<#> 负内积，<=> 余弦距离
SELECT
  drug_name,
  embedding <-> '[0.15, 0.25, 0.35]' AS l2_distance,    -- 👈 欧氏距离，越小越相似
  embedding <=> '[0.15, 0.25, 0.35]' AS cosine_distance -- 👈 余弦距离，越小越相似
FROM drug_instructions
ORDER BY embedding <-> '[0.15, 0.25, 0.35]'
LIMIT 1;   -- 👈 距离最近的说明书排最前
```

三个算子的含义（第二部分第 4 节会讲透它们对应的相似度度量）：

- `<->`：**欧氏距离（L2）**，两点之间的直线距离，值越小越相似
- `<#>`：**负内积**，内积越大越相似（取负号是为了让「越小越相似」的排序约定统一）
- `<=>`：**余弦距离**，衡量两个向量的方向相似度，值越小越相似

🔧 **医疗场景**：在「药品说明书 RAG 向量库」里，用户问「头疼吃什么药」，先把问题用 embedding 模型转成向量，再用 `<=>` 余弦距离在 `drug_instructions` 表里找最相似的说明书，把这几篇说明书作为上下文喂给 LLM——这就是向量检索在医疗问答里的落地。

到这里，「基本使用」的四大特色能力——窗口函数、JSONB、数组、pgvector——就都上手了。下面进入「企业最佳实践」，把这些东西往生产深度上推一层。

---

## 二、企业最佳实践

### 1. 窗口函数 vs GROUP BY：本质区别（重点）

窗口函数和 `GROUP BY` 的区别，是 PostgreSQL 面试里必考、也是最容易答糊的一题。要讲清楚，先看两者对同一份数据做了什么：

**`GROUP BY` 分组后，每组只返回一行聚合结果**。比如「统计每位医生的接诊总数」：

```sql
SELECT doctor_id, COUNT(*) AS total
FROM consultations
GROUP BY doctor_id;
```

```
 doctor_id | total
-----------+-------
         1 |     3
         2 |     2
```

两位医生，两行结果——**原始的行明细没了**，被压缩成了每个医生一行、带一个 `COUNT` 聚合值。

**窗口函数「保留原始每一行」，同时为每一行算一个基于其窗口的聚合/排名结果**。同样是这些数据，`ROW_NUMBER()` 返回的是**全部 5 行**，每行多了一个「序号」字段：

```sql
SELECT doctor_id, patient_id,
  ROW_NUMBER() OVER (PARTITION BY doctor_id ORDER BY visit_time) AS seq
FROM consultations;
```

```
 doctor_id | patient_id | seq
-----------+------------+-----
         1 |        101 |   1
         1 |        102 |   2
         1 |        103 |   3
         2 |        201 |   1
         2 |        202 |   2
```

看出来了吗？**`GROUP BY` 是「压缩行」，窗口函数是「扩展行」**——前者把多行聚合成一行的「汇总值」，后者在保留每一行明细的基础上，给每行附加一个「上下文相关」的聚合/排名值。

这就引出**什么时候必须用窗口函数**的判据：当你**既要明细、又要聚合上下文**时，必须用窗口函数。最典型的例子是用 `LAG()` 算「每位患者本次检验值相比上次的变化」：

```sql
-- 算检验值环比：每行既要保留「本次检验值」明细，又要拿到「上次检验值」做对比
SELECT
  patient_id,
  test_date,
  value AS current_value,
  LAG(value) OVER (PARTITION BY patient_id ORDER BY test_date) AS last_value,  -- 👈 上一行
  value - LAG(value) OVER (PARTITION BY patient_id ORDER BY test_date) AS delta -- 👈 环比变化
FROM lab_results;
```

这种「每行都要和一个『同组其他行』的聚合值做对比」的查询，`GROUP BY` 做不了——因为 `GROUP BY` 一旦分组就把明细压没了，哪还拿得到「每一行的上一次检验值」？这就是「明细 + 聚合上下文」必须用窗口函数的根本原因。

> 💬 **面试官**：窗口函数和 `GROUP BY` 的本质区别是什么？什么场景必须用窗口函数？
>
> ✅ 标准答案：本质区别是「压缩行」vs「扩展行」。`GROUP BY` 分组后每组只返回一行聚合结果，原始明细被压没了；窗口函数在**保留原始每一行**的同时，针对每一行算一个基于其窗口（`PARTITION BY` 分组 + `ORDER BY` 排序）的聚合/排名结果。需要「明细 + 聚合上下文」的分析型查询必须用窗口函数——比如用 `LAG()` 算每位患者本次检验值相比上次的变化，`GROUP BY` 会把明细压没，根本拿不到「上一行」。
>
> 🎁 加分答案：能补充「窗口函数为什么不能写在 `WHERE` 里」——SQL 逻辑执行顺序是 `WHERE` 在窗口计算**之前**，`WHERE` 阶段窗口函数的结果还没算出来，所以窗口函数只能写在 `SELECT` 或 `ORDER BY` 里，要按窗口结果过滤得用子查询或 `QUALIFY`（PG 里是子查询/CTE）。

### 2. JSONB 优先：JSONB vs JSON（重点）

PG 里 `JSON` 和 `JSONB` 都能存 JSON 数据，但生产几乎总是用 `JSONB`。两者的本质区别在**存储方式**：

- **`JSON`**：**原样文本存储**——你写进去什么字符串，它就存什么，不解析、不重排、去不掉空格。查询时要**每次都重新解析** JSON，而且**不支持索引**。
- **`JSONB`**：**二进制存储**——写入时把 JSON 解析成内部二进制格式，查询时**不用重新解析**（性能好），而且**支持 GIN 索引**加速（第三部分第 3 节的 GIN 索引）。

一张表对比：

| 维度 | JSON | JSONB |
|------|------|-------|
| 存储方式 | 原样文本 | 二进制（解析后的格式） |
| 查询性能 | 每次查询重新解析，慢 | 解析一次，查询快 |
| 索引支持 | 不支持 | 支持 GIN 索引加速 |
| 键顺序 | 保留原始顺序 | 会重排键顺序、去空格 |
| 写入性能 | 快（不用解析） | 略慢（写入时要解析成二进制） |
| 适用场景 | 需要保留原始文本/顺序 | 生产绝大多数场景 |

**结论：生产几乎总是用 `JSONB`**。因为「查询性能 + 索引支持」这两个优势，远大于「键重排、写入略慢」的代价。除非你有一个非常明确的需求——**必须保留 JSON 的原始文本格式（键顺序、空格）**——才用 `JSON`，否则一律 `JSONB`。

> 💬 **面试官**：JSONB 和 JSON 有什么区别？为什么生产优先选 JSONB？
>
> ✅ 标准答案：核心区别在存储方式——`JSON` 是原样文本存储，查询要每次重新解析、且不支持索引；`JSONB` 是二进制存储，写入时解析一次、查询不重复解析、支持 GIN 索引加速。生产优先 `JSONB` 是因为「查询快 + 能走索引」这两个优势远大于「键重排、写入略慢」的代价。
>
> 🎁 加分答案：能点出 `JSONB` 的两个代价——① 存储时**重排键顺序、去重空格**（所以不能当「保留原始格式」的文档存储）；② 写入比 `JSON` 略慢（要解析成二进制）。并落到场景：需要保留原始文本/顺序（如审计日志要还原原始 JSON 字符串）时才用 `JSON`，其余一律 `JSONB`。

### 3. GIN/GiST 索引选型（重点）

索引选型是 PG 里最容易踩坑的地方，核心是**别拿 B+ 树去给「包含关系」查询加速**。

先记住一个前提：**B+ 树（默认索引）适合等值查询和范围查询**（`WHERE col = 1`、`WHERE col BETWEEN 1 AND 10`），但它**不适合「字段包含某元素」这种查询**——比如「JSONB 里包含某个 key」「数组里包含某个值」。为什么？因为 B+ 树是按「整列的值」排序建的树，它没法回答「这一列的值里面，哪些『包含』了某个子元素」这种问题——这类查询走 B+ 树只能全表扫描。

这类「包含关系」查询，PG 的答案是 **GIN 索引（Generalized Inverted Index，倒排索引）**：

- **GIN 适合「是否包含某元素」的查询**：JSONB 判断包含某 key、数组包含某值、全文搜索（`tsvector`）——这是 JSONB/数组/全文搜索的**标准选择**
- 原理：倒排索引——把每个「元素」（JSONB 的每个 key、数组的每个元素、每个词）都记录成「元素 → 出现在哪些行」，查「哪些行包含元素 X」直接从倒排表取，不用扫描

```sql
-- 给 JSONB 列建 GIN 索引
CREATE INDEX idx_form_data ON inquiry_forms USING GIN (form_data);

-- 给数组列建 GIN 索引
CREATE INDEX idx_allergies ON patients USING GIN (allergies);

-- 这样 @> / ? 这类「包含」查询就能走索引了
SELECT * FROM inquiry_forms WHERE form_data @> '{"symptom": "发热"}';
```

那 **GiST 又是什么**？GiST（Generalized Search Tree，通用搜索树）是一个「可扩展的索引框架」，适合**几何数据、范围类型的「最近邻/重叠判断」**——比如「地理坐标找最近的药店」「两个时间范围是否重叠」：

```sql
-- 范围类型的重叠判断用 GiST
CREATE INDEX idx_visit_range ON consultations USING GiST (visit_time_range);
```

**一句话选型口诀**：**按「是否包含关系查询」选 GIN，按「空间/范围近邻」选 GiST**。

三种索引的适用场景对比：

| 索引类型 | 适合的查询 | 典型场景 |
|---------|-----------|---------|
| B+ 树（默认） | 等值、范围查询 | `WHERE col = 1`、`BETWEEN`、`ORDER BY` |
| GIN（倒排） | 「包含某元素」 | JSONB 的 `@>`/`?`、数组 `ANY`、全文搜索 |
| GiST（通用搜索树） | 「最近邻/重叠」 | 几何坐标、范围类型（时间范围重叠） |

> 💬 **面试官**：GIN 索引适合什么场景？为什么 B+ 树索引不适合给 JSONB 字段的包含查询加速？
>
> ✅ 标准答案：GIN（倒排索引）适合「字段包含某元素」的查询——JSONB 判断包含某 key、数组包含某值、全文搜索。B+ 树不适合是因为它按「整列的值」排序建树，只能答等值/范围查询，答不了「这一列的值里哪些『包含』了某个子元素」，这类查询走 B+ 树只能全表扫描。GIN 把「元素 → 出现在哪些行」预先倒排好，包含查询直接取，不用扫。
>
> 🎁 加分答案：能补充 GiST 的定位（几何/范围类型的「最近邻/重叠」），并点出 GIN 的代价——**查询快但写入慢**（每插入一行要维护倒排表），所以「读多写少」的场景适合 GIN，高频写入且不常做包含查询的字段没必要建。

### 4. pgvector 三种距离算子（对齐 AI 工程栈）

pgvector 的三种距离算子，分别对应三种**相似度度量**，是向量检索的核心概念，也是 AI 工程栈面试的高频点。

| 算子 | 度量 | 含义 | 值越小越相似？ |
|------|------|------|---------------|
| `<->` | L2 欧氏距离 | 两点之间的直线距离，对「绝对尺度」敏感 | 是 |
| `<#>` | 负内积 | 内积的相反数（内积越大越相似） | 是 |
| `<=>` | 余弦距离 | 1 - 余弦相似度，衡量「方向」相似 | 是 |

逐个讲透：

**`<->` 欧氏距离（L2）**：就是高维空间里两个点的直线距离，`sqrt(Σ(ai-bi)²)`。它衡量「绝对位置有多近」，对向量的**长度（模）敏感**——两个方向相同但长度差很多的向量，欧氏距离会很大。

**`<#>` 负内积**：内积 `Σ(ai×bi)`，衡量「两个向量在多大程度上同向且越长越大」。取负号是为了统一「越小越相似」的排序约定。内积越大（负内积越小）越相似，适合「**最大化内积检索**」的场景。

**`<=>` 余弦距离**：`1 - 余弦相似度`，余弦相似度是 `Σ(ai×bi) / (|a|×|b|)`，只衡量「**方向**有多接近」，**对向量的长度不敏感**——两个方向相同、长度任意的向量，余弦相似度都是 1。

**RAG 系统「药品说明书向量库」通常用余弦距离（`<=>`）**。原因：

- 文本 embedding（如 OpenAI 的 embedding、通义千问的 embedding）**通常已经做了归一化**，此时余弦距离 ≈ 内积 ≈ 欧氏距离（归一化后三者等价）
- 但即便没归一化，**文本语义检索更关心「方向相似」而非「长度接近」**——两个语义相近的句子，embedding 方向接近，长度可能因句子长短而不同。余弦距离只看方向，天然适配「语义相似度」

🔧 **医疗场景**：药品说明书 RAG 检索里，「布洛芬缓解头痛」和「对乙酰氨基酚缓解头痛」的语义很接近，它们的 embedding 方向应该接近，但句子长度不同、embedding 的模长不同。用 `<->` 欧氏距离会被「模长差异」误导，用 `<=>` 余弦距离只看方向，能更准确地判断「语义是否相似」。

> 💬 **面试官**：pgvector 的三种距离算子分别对应什么相似度度量？RAG 系统里通常用哪种？
>
> ✅ 标准答案：`<->` 是 L2 欧氏距离（直线距离，对长度敏感），`<#>` 是负内积（内积越大越相似，最大化内积检索），`<=>` 是余弦距离（衡量方向相似，对长度不敏感）。RAG 系统通常用 `<=>` 余弦距离，因为文本语义检索更关心「方向相似」而非「长度接近」。
>
> 🎁 加分答案：能补充「归一化后三者等价」这个关键细节——如果 embedding 已经做了 L2 归一化，余弦距离、内积、欧氏距离的排序结果是一致的；并点出「内积对长度敏感、余弦对长度不敏感」，所以没归一化的 embedding 要选余弦、明确要「最大化内积」的场景（如推荐系统打分）才用内积。

### 5. 精确检索 vs 近似索引（HNSW/IVFFlat）

向量检索到数据量大时，会遇到一个「精度 vs 速度」的经典权衡。

**小数据量：精确检索**。数据量小（比如几万条以内），直接用顺序扫描算距离——每一行都算一遍距离、取最近的 K 个，这就是**精确检索**，能保证 **100% 召回**（真正最近的向量一定被找到）。

```sql
-- 精确检索：不做索引，直接算距离排序，100% 召回
SELECT drug_name
FROM drug_instructions
ORDER BY embedding <=> '[0.15, 0.25, 0.35]'
LIMIT 10;
```

**数据量大：近似索引**。数据量一大（几十万、上百万条），逐行算距离太慢，就用**近似索引**「牺牲一点精度换检索速度」。pgvector 支持两种近似索引：

- **HNSW（Hierarchical Navigable Small World，分层导航小世界图）**：构建一个多层图，高层是「稀疏的路标」、底层是「稠密的邻居」，检索时从高层往下导航，快速逼近最近邻。**查询快、召回率高，是 pgvector 当前推荐的首选**。
- **IVFFlat（倒排文件 + 平坦）**：先对所有向量做聚类（如 K-Means），检索时只算「最近的几个聚类中心」里的向量，跳过其他聚类。**构建快、内存小，但召回率通常略低于 HNSW**。

```sql
-- HNSW 近似索引
CREATE INDEX ON drug_instructions USING hnsw (embedding vector_cosine_ops);

-- IVFFlat 近似索引
CREATE INDEX ON drug_instructions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

HNSW 和 IVFFlat 对比：

| 维度 | HNSW | IVFFlat |
|------|------|---------|
| 检索方式 | 分层图导航 | 先聚类、再算最近聚类 |
| 召回率 | 高 | 略低（取决于 `lists` 参数） |
| 构建速度 | 慢（要建图） | 快（要聚类） |
| 内存占用 | 较大（存图结构） | 较小 |
| 适用 | pgvector 当前首选 | 内存敏感、数据量极大的场景 |

**结论：RAG 场景先上 HNSW 近似索引；规模小、或要求 100% 召回时，退回精确扫描**。近似索引的本质是「用一点点召回率的损失，换数量级的检索速度提升」。

> 💬 **面试官**：向量数据量大了之后，为什么需要近似索引（HNSW/IVFFlat）而不是精确检索？代价是什么？
>
> ✅ 标准答案：数据量一大，逐行精确算距离的复杂度是 O(N)（甚至要全库扫一遍），检索延迟不可接受。近似索引（HNSW 分层图导航、IVFFlat 先聚类再算）通过「牺牲一点精度」把检索降到亚线性甚至对数级，换数量级的速度提升。代价就是**召回率不再是 100%**——真正最近的向量可能被近似索引漏掉。
>
> 🎁 加分答案：能补充两者的取舍——HNSW 召回率高、是 pgvector 首选，但构建慢、内存大；IVFFlat 构建快、内存小，但召回率略低、受 `lists` 参数影响。并落到决策：RAG 场景先上 HNSW，数据量小或要求 100% 召回时退回精确扫描。

到这里，「企业最佳实践」讲完了五个深度点。下面进入「注意事项」——那些在生产里最容易翻车、面试里也常被追问的坑。

---

## 三、注意事项

### 1. 与 MySQL 的 MVCC 实现差异 → VACUUM 运维坑

PostgreSQL 和 MySQL 都支持 MVCC（多版本并发控制），但实现方式截然不同，PG 的这种实现带来了一个 MySQL 用户想不到的运维坑：**表膨胀**。

**关键差异**：PG 的**旧版本数据直接存在表里**，靠 `VACUUM` 回收；而 MySQL InnoDB 把旧版本放在**独立的回滚段（undo log）**里，不在主表里堆积。

具体说：PG 里一条记录被 `UPDATE` 时，**不会原地覆盖**，而是插入一条新版本、把旧版本标记为「死元组（dead tuple）」留在原表里。这些死元组要等 `VACUUM`（或 `autovacuum`）来回收空间。如果一个表**频繁更新、但 `VACUUM` 跟不上**，死元组会越积越多，导致：

- **表严重膨胀**：表的物理体积远超实际数据量（可能膨胀几倍甚至几十倍）
- **拖慢顺序扫描**：全表扫描时要扫过一堆「已经没用的死元组」，白白浪费 I/O

**应对**：`autovacuum` 是 PG 内置的自动回收机制，默认开启，但**频繁大量更新的场景要手动调优触发阈值**（如降低 `autovacuum_vacuum_scale_factor`、提高频率），否则默认阈值可能「跟不上」写入速度。

🔧 **运维场景**：医院 HIS 系统的订单表、处方状态表是高频更新表（订单状态从「待支付」改到「已支付」、处方从「待审核」改到「已审核」），这类表如果不关注 `VACUUM`，运行几个月后表会膨胀得离谱，全表查询越来越慢。

> 💬 **面试官**：PostgreSQL 和 MySQL 的 MVCC 实现有什么差异？PG 的表为什么会「膨胀」？
>
> ✅ 标准答案：PG 的旧版本直接存在表里、靠 `VACUUM` 回收；MySQL InnoDB 把旧版本放独立回滚段。PG 里 `UPDATE` 是「插入新版本 + 标记旧版本为死元组」，死元组留原表等 `VACUUM` 回收——频繁更新且 `VACUUM` 跟不上时，死元组堆积导致表体积远超实际数据量、拖慢顺序扫描。
>
> 🎁 加分答案：能补充应对——`autovacuum` 默认开启但要调优触发阈值，高频更新表要降低 `autovacuum_vacuum_scale_factor`、提高 `autovacuum` 频率，必要时手动 `VACUUM FULL` 彻底回收（但会锁表，要选低峰期）。

### 2. JSONB 的键重排

JSONB 存储时会**重排键顺序、去重空格**——这是它「二进制存储、写入时解析」带来的直接后果。所以**别拿 JSONB 当「保留原始格式」的文档存储**。

举例：

```sql
-- 你写入的 JSON 键顺序是 b 在前、a 在后，还带空格
INSERT INTO inquiry_forms (patient_id, dept, form_data)
VALUES (103, '内科', '{ "b": 1, "a": 2 }');

-- JSONB 读出来，键被重排成 a 在前、b 在后，空格也没了
SELECT form_data FROM inquiry_forms WHERE patient_id = 103;
-- 结果：{"a": 2, "b": 1}   👈 键顺序变了，空格没了
```

如果你的业务**必须保留 JSON 的原始文本**（比如审计日志要原样还原当时收到的 JSON 字符串、或对键顺序有语义依赖），那该用 `JSON` 类型，而不是 `JSONB`。这就是「JSONB 优先」的唯一例外场景（第二部分第 2 节）。

> 💬 **面试官**：JSONB 能不能当「保留原始格式」的文档存储？
>
> ✅ 标准答案：不能。JSONB 存储时会重排键顺序、去重空格，读出来的 JSON 不是原始文本。需要保留原始文本/键顺序的场景（如审计日志还原原文）应该用 `JSON` 类型，而不是 `JSONB`。

### 3. 向量维度过高或数据量过大

近似索引不是「建了索引就一劳永逸」。当**向量维度过高**或**数据量过大**时，近似索引的召回率会明显下降——这是高维空间的「维度诅咒」：维度越高，向量之间「距离」的区分度越差，近似索引的图/聚类结构越难准确导航。

具体要关注 **HNSW 的两个关键参数**：

- **`ef_construction`**：构建索引时的候选邻居数，越大索引质量越高（构建越慢）
- **`ef_search`**：查询时搜索的候选数，越大召回率越高、越慢

`ef_search` 是**查询时**调优「召回率 vs 速度」的旋钮——调大 `ef_search` 提高召回率、调小提速。生产上要根据业务对「召回率」的容忍度，在「召回率 vs 速度」之间调优，**不是建了索引就一劳永逸**。

```sql
-- 查询时调大 ef_search，提高召回率（默认 40，可以调到 100、200）
SET hnsw.ef_search = 200;
SELECT drug_name FROM drug_instructions
ORDER BY embedding <=> '[0.15, 0.25, 0.35]'
LIMIT 10;
```

> 💬 **面试官**：HNSW 的 `ef_search` 和 `ef_construction` 分别影响什么？
>
> ✅ 标准答案：`ef_construction` 是**构建时**的候选邻居数，影响索引质量（越大召回率上限越高、构建越慢）；`ef_search` 是**查询时**的搜索候选数，是「召回率 vs 速度」的直接旋钮——调大提高召回率、调小提速。高维或大数据量下，要按业务对召回率的容忍度调优，不是建了索引就一劳永逸。

---

## 参考资料

- https://www.postgresql.org/docs/current/ （PostgreSQL 官方文档）
- https://www.postgresql.org/docs/current/tutorial-window.html （窗口函数）
- https://www.postgresql.org/docs/current/functions-window.html （窗口函数参考）
- https://www.postgresql.org/docs/current/datatype-json.html （JSON/JSONB 类型）
- https://www.postgresql.org/docs/current/indexes-types.html （索引类型：B-tree/GIN/GiST）
- https://www.postgresql.org/docs/current/routine-vacuuming.html （VACUUM 与表膨胀）
- https://github.com/pgvector/pgvector （pgvector 官方仓库）
- https://github.com/pgvector/pgvector#hnsw （HNSW 索引）

> 窗口函数、JSONB 索引、GIN 倒排索引、pgvector 余弦距离、HNSW 召回率等主题，推荐搜索关键词「PostgreSQL 窗口函数 OVER PARTITION」「PostgreSQL JSONB GIN 索引」「pgvector 余弦距离 欧氏距离 内积」「HNSW ef_search 召回率」「PostgreSQL VACUUM 表膨胀」。

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 考察频率 |
|--------|-----------|---------|
| 窗口函数 vs GROUP BY | GROUP BY「压缩行」、窗口函数「扩展行」（保留明细 + 算聚合） | ⭐⭐⭐ 必考 |
| JSONB vs JSON | JSONB 二进制存储、能走 GIN 索引、查询快；JSON 原样文本、无索引 | ⭐⭐⭐ 必考 |
| GIN vs GiST | 包含关系查询选 GIN，空间/范围近邻选 GiST | ⭐⭐⭐ 必考 |
| 三种距离算子 | `<->` 欧氏距离、`<#>` 负内积、`<=>` 余弦距离（RAG 用余弦） | ⭐⭐⭐ 必考 |
| 精确 vs 近似索引 | 小数据精确扫描 100% 召回；大数据用 HNSW/IVFFlat 换速度 | ⭐⭐⭐ 必考 |
| VACUUM 表膨胀 | PG 旧版本存表里靠 VACUUM 回收，频繁更新不回收会膨胀 | ⭐⭐ 高频 |
| JSONB 键重排 | JSONB 重排键/去空格，保留原文用 JSON | ⭐⭐ 高频 |
| 高维召回率下降 | 维度诅咒，`ef_search` 调「召回率 vs 速度」 | ⭐⭐ 高频 |

> 💡 记住这条主线：**窗口函数是「保留明细算聚合」的分析利器 → JSONB 是「灵活又能走索引」的半结构化存储 → GIN/GiST 是「按查询类型选索引」的选型功夫 → pgvector 是「把 AI 检索搬进数据库」的桥梁**。PostgreSQL 的特色能力，每一步都在「扩展 SQL 的表达边界」，把 MySQL 做不了的分析型查询、半结构化存储、向量检索，装进同一个关系库里。

---

## 💡 面试核心问

- **窗口函数和 `GROUP BY` 的本质区别是什么？什么场景必须用窗口函数？**（压缩行 vs 扩展行；需要「明细 + 聚合上下文」时，如 `LAG` 算环比）
- **JSONB 和 JSON 有什么区别？为什么生产优先选 JSONB？**（二进制 vs 文本；查询快 + 能走 GIN 索引）
- **GIN 索引适合什么场景？为什么 B+ 树索引不适合给 JSONB 字段的包含查询加速？**（包含关系查询；B+ 树只答等值/范围，答不了「包含某元素」）
- **pgvector 的三种距离算子分别对应什么相似度度量？RAG 系统里通常用哪种？**（欧氏/内积/余弦；RAG 用余弦，因语义看方向不看长度）
- **向量数据量大了之后为什么需要近似索引（HNSW/IVFFlat）而不是精确检索？代价是什么？**（O(N) 太慢；近似索引换速度，代价是召回率下降）
- **PostgreSQL 和 MySQL 的 MVCC 实现差异是什么？PG 的表为什么会「膨胀」？**（旧版本存表里 vs 回滚段；死元组堆积靠 VACUUM 回收）

---

## 📝 思考题

窗口函数为什么不能直接写在 `WHERE` 子句里？想想 SQL 的逻辑执行顺序——`FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT`（窗口计算在这里）→ `ORDER BY`。`WHERE` 在窗口计算**之前**执行，所以窗口函数的结果在 `WHERE` 阶段还不存在。

那么问题来了：如果我想筛选出「每位患者接诊序号为 1（首次就诊）的记录」，用 `ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY visit_time) = 1` 这个条件，该怎么写？提示：想想子查询或 CTE 能不能先把窗口函数算出来，再在**外层**过滤。

欢迎评论区写出你的答案 👇

---

> 🔖 这是「Node.js 全栈深度拆解」系列第 15 篇。上一篇：《Redis 深度：五大数据结构/持久化/缓存与分布式锁最佳实践/接口限流》；下一篇预告：《GraphQL+Apollo：Schema 设计/Resolver/DataLoader N+1/Server 实战》
>
> 前置基础扩展阅读：搜索关键词「MySQL 索引 B+ 树 事务 隔离级别」「MongoDB 聚合管道 文档模型」「Redis 缓存 分布式锁」「PostgreSQL 窗口函数 JSONB pgvector」
