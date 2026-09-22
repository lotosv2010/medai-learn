# MySQL 全栈：基本使用/索引与事务最佳实践/慢查询与设计范式（生产收藏级）

> **副标题**：InnoDB 事务与隔离级别选型、B+ 树索引与最左前缀、执行计划与慢查询优化、三大范式与反范式设计

> 面试官问「拿到一条慢查询，你的排查思路是什么？」，大多数人只会答一句「用 EXPLAIN 看有没有走索引」。能把 B+ 树为什么要这么设计、聚簇索引为什么会有「回表」、隔离级别在锁层面到底挡了什么并发问题、范式与反范式怎么权衡——讲清楚，才说明你真的在生产里扛过 MySQL，而不是只会背八股。

---

## 🎯 这篇文章解决什么问题

MySQL 是 Node.js 全栈开发者绕不开的一道坎，也是后端面试里「看似简单、实则最容易问深」的一块。你写过无数条 `SELECT`、用过 `JOIN`、加过索引，但被追问到底层——为什么 B+ 树适合做索引？二级索引为什么有时要「回表」？联合索引 `(a,b,c)` 什么时候能用、什么时候用不上？脏读和幻读到底差在哪？——很多人就卡住了。

这篇文章是「Node.js 全栈深度拆解」系列的第 12 篇，也是数据库板块的第一篇。它把 MySQL 从「基本使用」到「生产最佳实践」完整串起来，三件事讲透：

- **基本使用**：从数据库概念到 CRUD、函数、聚合分组、子查询、表连接、索引、事务，再到 Node.js 用 `mysql2` 操作 MySQL 的完整落地
- **企业最佳实践**：ACID、四种隔离级别、表锁/行锁、B+ 树索引原理、最左前缀、慢查询排查、三大范式与反范式权衡、ER 图与 RBAC 设计实战
- **注意事项**：深分页陷阱、索引失效、忘带 WHERE、外键争议、TRUNCATE 不可恢复、死锁重试这些生产事故高发点

**既讲怎么用，也讲面试怎么答。** 5-10 年 Node 开发者的简历上，数据库这一栏从「会用」到「能讲清为什么这么设计」，面试官的眼睛会不一样。

---

## 一、基本使用

### 1. 数据库基础概念

先厘清几个绕来绕去的名词。**实体**，是客观世界存在、可以被描述出来的东西——患者、药品、处方都是实体。**数据库（DB）**是数据的仓库，存放结构化的数据。**数据库管理系统（DBMS）**是一种系统软件，提供操作数据库的环境，我们通过它对数据进行增删改查。**SQL**（Structured Query Language，结构化查询语言）是专门用来和数据库交流的语言，几乎所有 DBMS 都支持它。

一个直观的图，理清它们的关系：

![数据库系统 DBS：由数据库（数据仓库）、DBMS（管理系统软件）组成，通过 DBMS 完成增加/修改/删除数据](https://cdn.nlark.com/yuque/0/2025/png/738210/1743413781689-3d0b3096-1407-48fc-aeab-18e13215037a.png)

**表（Table）**是数据库中包含所有数据的数据库对象，是其它对象的基础。数据在表中按行和列组织——行（记录）存放一个个实体，列（字段）描述实体的某一个属性：

![数据表：行是记录（一条条实体），列是字段（描述实体的属性）](https://cdn.nlark.com/yuque/0/2025/png/738210/1743413781435-645b93ea-825a-464f-aa4c-cc87e1a5144c.png)

SQL 按作用分成三类：

- **DDL（数据定义语言）**：`CREATE`/`ALTER`/`DROP`，定义或改变表结构、数据类型、表之间的链接和约束，多在建表时使用
- **DML（数据操纵语言）**：`SELECT`/`INSERT`/`UPDATE`/`DELETE`，对数据做操作
- **DCL（数据控制语言）**：`GRANT`/`REVOKE`，设置或更改用户/角色的权限

写 SQL 有几条规范要养成习惯：SQL 语句不区分大小写（建议关键字大写、表名列名小写）；命令以分号结尾；命令可以缩进和换行；`#` 和 `--` 是单行注释，`/* */` 是多行注释。

### 2. 建库建表与数据完整性

在创建表之前，先理解「数据完整性」——它要保证数据库表里每行每列的数据都符合要求，错误的数据不允许写入。

**域完整性**：不同字段要设置成合适的类型，比如年龄就该是整数类型。MySQL 的列类型分几大类：

![MySQL 列类型：数值型（整数/小数）、字符串型（CHAR/VARCHAR/TEXT）、日期时间型（DATE/DATETIME/TIMESTAMP）](https://cdn.nlark.com/yuque/0/2025/png/738210/1743413783196-7f804689-48cb-418b-b97c-edda359ef336.png)

小数类型有个细节值得记：`FLOAT`/`DOUBLE` 是近似存储（用符号位+指数+尾数表示，有精度误差），`DECIMAL` 是精确存储（整数和小数分开算，适合金额这类不能有误差的场景）：

![数值型小数类型对比：FLOAT/DOUBLE 近似存储、DECIMAL 精确存储](https://cdn.nlark.com/yuque/0/2025/png/738210/1743413783012-92234704-e0e5-42b8-a5f5-368b2eee8d94.png)

![FLOAT（符号位+8指数+23尾数）与 DOUBLE（符号位+11指数+52尾数）的存储方式](https://cdn.nlark.com/yuque/0/2025/png/738210/1743413783007-36bbace8-eec6-46bd-871c-e62962969306.png)

**默认值**：用户没指定值时，用预先设定的默认值填充。**非空约束**：指定某字段必须提供一个非空值。

**实体完整性**靠几个约束保证：

- **主键约束**：一列或几列组合的值能唯一标识表中每一行。主键的选择标准是「最少性」（尽量单个键）和「稳定性」（主键用于表间联接，最好不更新）。
- **唯一约束**：某字段在所有记录中不能重复（如患者的身份证号）。
- **外键**：一个表的外键必须引用另一个表的主键，保证引用完整性。主表没有的记录，子表不能添加；修改/删除主表记录不能让子表记录孤立。
- **标识列**：表里没有合适的主键时，增加一个无业务含义、自动生成值的列（`AUTO_INCREMENT`）来区分每条记录。

下面建一张患者表，并演示加字段、加约束：

```sql
-- 创建患者表
CREATE TABLE `patient` (
  `id`  int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `name`  varchar(50) NOT NULL,
  `age`  int(11) NULL DEFAULT NULL,
  `city`  varchar(50) DEFAULT '北京'
);

-- 增加身份证号字段
ALTER TABLE `patient` ADD COLUMN `idcard`  varchar(15) NULL AFTER `city`;
-- 修改字段
ALTER TABLE `patient` MODIFY COLUMN `idcard`  varchar(18) DEFAULT NULL AFTER `name`;
-- 删除字段
ALTER TABLE `patient` DROP COLUMN `idcard`;
```

用 `ALTER TABLE` 加约束：

```sql
-- 主键约束
ALTER TABLE `patient` ADD PRIMARY KEY (`id`);
-- 唯一约束
ALTER TABLE `patient` ADD UNIQUE INDEX `uq_idcard` (`idcard`);
-- 默认约束
ALTER TABLE `patient` MODIFY COLUMN `city`  varchar(50)  DEFAULT '北京' AFTER `age`;
-- 外键约束（处方明细表引用患者表）
ALTER TABLE `prescription` ADD CONSTRAINT `fk_patient_id` FOREIGN KEY (`patient_id`) REFERENCES `patient` (`id`);
-- 删除约束
ALTER TABLE `prescription` DROP FOREIGN KEY `fk_patient_id`;
```

> 💬 **面试官**：`DECIMAL` 和 `FLOAT`/`DOUBLE` 有什么区别？金额字段该用哪个？
>
> ✅ 标准答案：`FLOAT`/`DOUBLE` 是近似存储，用符号位+指数+尾数表示，有精度误差；`DECIMAL` 是精确存储，整数和小数部分分开计算。金额这类不能有误差的字段必须用 `DECIMAL`，不能容忍 `FLOAT` 的舍入误差。
>
> 🎁 加分答案：能说出 `DECIMAL(M,D)` 里 M 是总位数、D 是小数位数，以及它在底层用「每 9 位数字打包成 4 字节」的方式存储，所以位数越多占空间越大。

### 3. 基本 CRUD 与查询

这里用一套医疗场景表贯穿后续所有示例：**患者表 `patient`**、**药品表 `drug`**、**处方明细表 `prescription`**（多对多关联患者和药品）。先建表：

```sql
CREATE TABLE `patient` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `idcard` varchar(18) DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `city` varchar(50) DEFAULT '',
  PRIMARY KEY (`id`)
);

CREATE TABLE `drug` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE `prescription` (
  `patient_id` int(11) NOT NULL DEFAULT '0',
  `drug_id` int(11) NOT NULL DEFAULT '0',
  `quantity` int(11) DEFAULT NULL,
  PRIMARY KEY (`patient_id`,`drug_id`),
  KEY `fk_drugid` (`drug_id`),
  CONSTRAINT `fk_drugid` FOREIGN KEY (`drug_id`) REFERENCES `drug` (`id`),
  CONSTRAINT `fk_patient_id` FOREIGN KEY (`patient_id`) REFERENCES `patient` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

**插入数据行**：

```sql
-- 语法：INSERT [INTO] 表名 [(列名)] VALUES (值列表)
INSERT INTO patient (name, idcard, age, city)
VALUES ('张三', '123456', 30, '北京');
```

插入有几个注意点：每次插入一行，数据是否有效按整行完整性校验；每个值的数据类型、精度、位数必须与对应列精确匹配；不能为标识列指定值；非空字段必须插入数据；有默认值的列可用 `DEFAULT` 关键字代替实际值。

**更新数据行**：

```sql
-- 语法：UPDATE 表名 SET 列名 = 更新值 [WHERE 更新条件]
UPDATE patient
SET age = 40, city = '上海'
WHERE id = 7;
```

多列用逗号隔开，**一定要加更新条件以免错误更新**；多个联合条件用 `AND`；判断字段为空用 `email is null or email = ''`。

**删除数据行**：

```sql
-- 语法：DELETE [FROM] 表名 [WHERE <删除条件>]
DELETE FROM patient WHERE id = 7;
```

`DELETE` 是对整行操作，不需要提供列名；如果要删除主表数据，要先删除子表记录。

**TRUNCATE 截断表**：

```sql
TRUNCATE TABLE patient;
```

数据全部清空，但表结构、列、约束等不被改动；不能用于有外键约束引用的表；标识列重新开始编号。因为删除的数据不写日志、无法恢复，所以**工作中尽量少用**（这个风险在第三部分详细展开）。

**数据查询**：

```sql
-- 语法
SELECT    <列名>
FROM      <表名>
[WHERE    <查询条件表达式>]
[ORDER BY <排序的列名>[ASC或DESC]]
```

查询产生的是「虚拟表」，不会保存起来。几个高频写法——排序、别名、查空行、常量列、限制行数、去重：

```sql
-- 查询北京的患者信息，并按 ID 正序排列
SELECT id, name, idcard, age, city
FROM patient
WHERE city = '北京'
ORDER BY id ASC;

-- 别名
SELECT id, name, idcard, age, city AS home
FROM patient
WHERE city = '山东'
ORDER BY id ASC;

-- 查询空行（没有填 email 的）
SELECT id, name, age, city
FROM patient
WHERE email IS NULL OR email = '';

-- 常量列
SELECT id, name, age, city, '中国' AS country
FROM patient;

-- 限制返回的行数
SELECT id, name, age, city
FROM patient LIMIT 2;

-- 去重：查询患者一共来自哪些不同的城市
SELECT DISTINCT city
FROM patient;
```

在 MySQL 里 `+` 号只能用于数字运算（字符串拼接要用 `CONCAT`）：

```sql
SELECT 1 + 1;          -- 2
SELECT 1 + '1';        -- 2（字符串 '1' 被转成数字）
SELECT 1 + 'zfpx';     -- 1（无法转换的字符串当 0）
SELECT 1 + NULL;       -- NULL（任何数与 NULL 相加都是 NULL）
SELECT CONCAT(last_name, first_name) FROM user;  -- 字符串拼接用 CONCAT
```

**模糊查询**——查询条件不明确时用通配符配合 `LIKE`：

- `_` 表示一个任意字符，`%` 表示任意长度的字符串
- `BETWEEN AND`：查询某一列在指定范围内的记录（含两个边界）
- `IN`：查询某一列的值在列出的列表中
- `IS NULL` / `IS NOT NULL`：查询空/非空

```sql
-- 处方数量在 5 到 10 之间
SELECT * FROM prescription WHERE quantity BETWEEN 5 AND 10;
-- 患者城市在列表中
SELECT * FROM patient WHERE city IN ('北京','上海','广东');
-- 查询没有 email 的
SELECT * FROM patient WHERE email IS NULL;
```

> 💬 **面试官**：`DELETE`、`TRUNCATE`、`DROP` 三者的区别是什么？
>
> ✅ 标准答案：`DELETE` 删除数据（可带 WHERE 部分删除），走事务、写日志、可回滚，不重置自增列；`TRUNCATE` 清空整表数据，DDL 操作、不写逐行日志、不能回滚、重置自增列；`DROP` 直接删掉整张表（结构和数据都没了）。三者破坏力递增、可恢复性递减。
>
> 🎁 加分答案：能点出 `TRUNCATE` 不能用于有外键引用的表，以及它底层是「删除再重建表」而非逐行删除，所以快但不留日志。

### 4. SQL 运算符与常用函数

**算术运算符**：`+ - * / %`，`%` 是取模（`6 % 4 = 2`）。**逻辑运算符**：`AND`（两个都为 true 才 true）、`OR`（两个都为 false 才 false）、`NOT`（取反）。**比较运算符**：`= > < <> >= <= !=`。

**字符函数**是最常用的一类，列成表：

| 函数 | 描述 |
|------|------|
| `CONCAT` / `CONCAT_WS` | 字符串连接（后者用指定分隔符） |
| `UPPER` / `LOWER` | 转大写 / 转小写 |
| `SUBSTR` | 截取子串 |
| `TRIM` / `LTRIM` / `RTRIM` | 去掉（左右/左/右）空格 |
| `LPAD` / `RPAD` | 用指定字符补齐到指定长度 |
| `REPLACE` | 替换子串 |
| `FORMAT` | 数字格式化（千分位） |
| `LEFT` / `RIGHT` | 返回最左 / 最右 n 个字符 |
| `LENGTH` | 返回字符串字节长度 |
| `INSTR` | 返回子串首次出现的位置 |

```sql
SELECT LENGTH('zfpx');          -- 4
SELECT LENGTH('珠峰');          -- 6（中文每个字 3 字节，utf8 下）

SELECT CONCAT(last_name, '_', first_name) FROM user;
SELECT UPPER('zfpx');           -- ZFPX
SELECT SUBSTR('zfpx', 2);       -- 从第 2 个字符截到结尾：fpx
SELECT SUBSTR('zfpx', 2, 3);    -- 从第 2 个字符截 3 个：fpx

-- 姓名首字符大写、其余小写，用 _ 拼接
SELECT CONCAT(UPPER(SUBSTR(last_name,1,1)), '_', LOWER(SUBSTR(last_name,2)));

SELECT TRIM('  zfpx  ');        -- 去两端空格
SELECT LPAD('1', 8, '0');       -- 00000001（编号补零常用）
SELECT REPLACE('zfpx', 'f', 'q');  -- zqpx
SELECT FORMAT(100000, 2);       -- 100,000.00
```

**数学函数**：

| 函数 | 描述 |
|------|------|
| `ROUND` | 四舍五入 |
| `CEIL` | 向上取整 |
| `FLOOR` | 向下取整 |
| `TRUNCATE` | 数字截取 |
| `MOD` | 取模 |
| `POWER` | 幂运算 |

```sql
SELECT ROUND(2.555, 2);   -- 2.56
SELECT CEIL(1.1);         -- 2
SELECT FLOOR(1.9);        -- 1
SELECT TRUNCATE(1.66, 1); -- 1.6
SELECT MOD(10, 3);        -- 1
```

**日期函数**：

| 函数 | 描述 |
|------|------|
| `NOW` | 当前日期和时间 |
| `CURDATE` / `CURTIME` | 当前日期 / 当前时间 |
| `DATE_ADD` | 日期变化 |
| `DATEDIFF` | 计算日期差 |
| `DATE_FORMAT` | 日期格式化 |
| `STR_TO_DATE` | 字符串转日期 |

```sql
SELECT NOW();
SELECT YEAR(NOW()), MONTH(NOW()), DAY(NOW()), HOUR(NOW()), MINUTE(NOW()), SECOND(NOW());
SELECT STR_TO_DATE('2018-09-09', '%Y-%m-%d');   -- 字符串转日期
SELECT DATE_FORMAT(NOW(), '%Y年%m月%d日');       -- 日期转字符串
SELECT DATE_ADD(NOW(), INTERVAL 365 DAY);        -- 加一年
SELECT DATEDIFF('2019-1-1', NOW());              -- 日期差
```

日期格式符速记：`%Y` 4 位年份、`%y` 2 位年份、`%m` 月份(01-12)、`%c` 月份(1-12)、`%d` 日(01-31)、`%H` 24 小时、`%h` 12 小时、`%i` 分钟、`%s` 秒。

**流程控制函数**：

```sql
SELECT IF(1 > 0, 'A', 'B');   -- A

-- CASE 两种写法
SELECT
CASE
  WHEN quantity < 60 THEN '不足'
  WHEN quantity >= 60 THEN '充足'
  ELSE '未知'
END
FROM prescription;

SELECT
CASE level
  WHEN 'A' THEN '优秀'
  WHEN 'B' THEN '良好'
  ELSE '未知'
END
FROM prescription;
```

**自定义函数**：对 MySQL 的扩展，使用方式和内置函数相同。函数必须有参数和返回值，函数体由合法 SQL 组成，返回值只能有一个：

```sql
-- 返回当前日期格式化字符串
CREATE FUNCTION znow() RETURNS VARCHAR(30)
RETURN DATE_FORMAT(NOW(), '%Y年%m月%d日 %H点:%i分%s秒');

-- 两数相加
CREATE FUNCTION zadd(num1 INT, num2 INT) RETURNS INT
RETURN num1 + num2;

-- 插入用户并返回自增 ID（复合结构用 BEGIN...END）
CREATE TABLE stu(id int PRIMARY KEY AUTO_INCREMENT, name VARCHAR(50));
CREATE FUNCTION addUser(name VARCHAR(50)) RETURNS INT
BEGIN
  INSERT INTO stu(name) VALUES(name);
  RETURN LAST_INSERT_ID();
END;

SELECT addUser('zfpx');
DROP FUNCTION addUser;
```

> 💬 **面试官**：`WHERE` 和 `HAVING` 都能做过滤，有什么区别？
>
> ✅ 标准答案：`WHERE` 在分组前过滤行，作用于原始数据；`HAVING` 在分组后过滤分组结果，作用于聚合函数计算后的结果。`WHERE` 里不能用聚合函数，`HAVING` 里可以（如 `HAVING COUNT(*) > 1`）。
>
> 🎁 加分答案：能点出执行顺序——`WHERE → GROUP BY → HAVING → ORDER BY → LIMIT`，以及「能在 WHERE 里过滤的就别放到 HAVING」，因为 WHERE 先过滤能减少进入分组的数据量。

### 5. 聚合函数与分组

**聚合函数**对一组值计算并返回一个结果，一般用来统计：

- `SUM` 累加、`AVG` 平均值、`MAX`/`MIN` 最大最小值、`COUNT` 统计非 NULL 的行数

```sql
-- 处方总数量、平均数量、最大最小数量
SELECT SUM(quantity) AS '总数量',
       AVG(quantity) AS '平均数量',
       MAX(quantity) AS '最大数量',
       MIN(quantity) AS '最小数量'
FROM prescription WHERE patient_id = 1;
```

`COUNT` 有四种写法，区别常被考到：

```sql
SELECT COUNT(*) FROM patient;      -- 统计所有行（含 NULL）
SELECT COUNT(1) FROM patient;      -- 同上，1 是常量，统计所有行
SELECT COUNT(name) FROM patient;   -- 统计 name 非 NULL 的行
SELECT COUNT(NULL) FROM patient;   -- 恒为 0（NULL 不计入）
```

**分组查询**按某列的值分组，相同的值分成一组，然后对组内求平均、求和等：

![分组：按学生 ID（此处为患者 ID）分组，组内分别统计](https://cdn.nlark.com/yuque/0/2025/png/738210/1743493681362-9223d0f0-34ab-49f3-9f1c-218b5817b614.png)

```sql
-- 语法
SELECT 列名, 查询表达式
FROM   <表名>
WHERE  <条件>
GROUP BY <分组字段>
HAVING  分组后的过滤条件
ORDER BY 列名 [ASC, DESC]
LIMIT  偏移量, 条数
```

分组查询的 SELECT 列表里只能放「被分组的列」和「为每个分组返回一个值的表达式（聚合函数）」。几个例子：

```sql
-- 每位患者的处方平均数量
SELECT patient_id, AVG(quantity) FROM prescription GROUP BY patient_id;

-- 每种药品的最大处方数量，按从高到低排列
SELECT drug_id, MAX(quantity) AS 最大数量
FROM prescription GROUP BY drug_id ORDER BY MAX(quantity) DESC;

-- 各省份不同性别的患者人数（多列分组）
SELECT province, gender, COUNT(*) FROM patient GROUP BY province, gender;

-- 分组筛选：患者人数超过 1 人的省份
SELECT province, COUNT(*) FROM patient GROUP BY province HAVING COUNT(*) > 1;

-- 处方数量不足 5 且出现次数大于 1 的患者
SELECT patient_id, COUNT(*) AS 不足次数
FROM prescription WHERE quantity < 5 GROUP BY patient_id HAVING COUNT(*) > 1;
```

### 6. 子查询

**子查询**是出现在其它 SQL 语句里的 `SELECT` 语句，必须始终放在圆括号里。外层查询可以是 `SELECT`/`INSERT`/`UPDATE` 等；子查询可以返回常量、一行、一列或多行。

**比较运算符子查询**——查年龄大于平均年龄的患者：

```sql
SELECT ROUND(AVG(age), 2) FROM patient;   -- 先算平均年龄
SELECT * FROM patient WHERE age > (SELECT ROUND(AVG(age), 2) FROM patient);
```

**ANY / SOME / ALL**——对比一组值：

```sql
-- 年龄大于陕西省任何一位患者（大于最小值即可）
SELECT * FROM patient WHERE age > ANY (SELECT age FROM patient WHERE province = '陕西省');
-- 年龄大于陕西省某些患者
SELECT * FROM patient WHERE age > SOME (SELECT age FROM patient WHERE province = '陕西省');
-- 年龄大于陕西省所有患者（大于最大值）
SELECT * FROM patient WHERE age > ALL (SELECT age FROM patient WHERE province = '陕西省');
```

**IN / EXISTS**——查有处方记录的患者：

```sql
-- IN：患者 id 在有处方记录的患者 id 集合里
SELECT * FROM patient WHERE id IN (SELECT DISTINCT patient_id FROM prescription);

-- EXISTS：存在满足条件的处方记录
SELECT * FROM patient
WHERE EXISTS (SELECT DISTINCT patient_id FROM prescription WHERE patient.id = prescription.patient_id);
```

**删除重复记录**是一个经典的综合题。先造出重复数据：

```sql
INSERT INTO category(id, name, parent_id)
VALUES (7, 'iPad', 1), (8, '李宁', 2), (9, '康师傅', 3);
```

思路分三步：先找出重复的名字，再找出每个重复组里该保留的最小 id，最后删除「重复但非最小 id」的记录：

```sql
-- 第一步：找重复的名字
SELECT name FROM category GROUP BY name HAVING COUNT(1) > 1;

-- 第二步：找每组该保留的最小 id
SELECT MIN(id) FROM category GROUP BY name HAVING COUNT(1) > 1;

-- 第三步：删除重复记录（MySQL 不允许先 SELECT 再 DELETE 同一张表，需包一层派生表）
DELETE FROM category
WHERE name IN
  (SELECT NAME FROM (SELECT name FROM category GROUP BY name HAVING COUNT(1) > 1) AS T1)
AND id NOT IN
  (SELECT id FROM (SELECT MIN(id) id FROM category GROUP BY name HAVING COUNT(1) > 1) AS T2);
```

> 💬 **面试官**：`IN` 和 `EXISTS` 有什么区别？什么时候用哪个？
>
> ✅ 标准答案：`IN` 是把子查询结果集展开后做等值匹配，适合「子查询结果集小、外层表大」的场景；`EXISTS` 是判断「是否存在」满足条件的记录，一旦命中即可返回（不需要扫完整个子查询结果），适合「子查询结果集大」的场景。`EXISTS` 常用于相关子查询（子查询引用外层表的列）。
>
> 🎁 加分答案：能说出 `NOT IN` 遇到子查询结果含 NULL 时会整体返回空集（因为 `x NOT IN (1, NULL)` 等价于 `x <> 1 AND x <> NULL`，后者恒为 UNKNOWN），而 `NOT EXISTS` 没有这个问题。

### 7. 表连接

**表连接**把多张表按条件关联查询。连接类型四种：

![连接类型：INNER JOIN 取交集、LEFT JOIN 左表全量、RIGHT JOIN 右表全量、FULL OUTER JOIN 取并集](https://cdn.nlark.com/yuque/0/2025/png/738210/1743493681386-d2115f1b-d886-44a1-a1a9-b7f55dfd466d.png)

- `INNER JOIN`（内连接）：显示左表和右表符合条件的记录
- `LEFT JOIN`（左外连接）：显示左表全部 + 右表符合条件的
- `RIGHT JOIN`（右外连接）：显示右表全部 + 左表符合条件的
- `ON` 设定连接条件（也可用 `WHERE` 过滤）

```sql
-- 内连接：患者 + 处方明细
SELECT * FROM patient INNER JOIN prescription ON patient.id = prescription.patient_id;

-- 左外连接：显示所有患者（含没有处方的），右表没匹配的用 NULL 补
SELECT * FROM patient LEFT JOIN prescription ON patient.id = prescription.patient_id;

-- 右外连接
SELECT * FROM patient RIGHT JOIN prescription ON patient.id = prescription.patient_id;

-- 多表连接：患者 + 处方 + 药品，查出「谁 + 用什么药 + 数量多少」
SELECT patient.name, drug.name, prescription.quantity
FROM prescription
INNER JOIN patient ON patient.id = prescription.patient_id
INNER JOIN drug ON drug.id = prescription.drug_id;
```

**自连接**（无限分类）——表自己连自己，典型场景是树形分类：

```sql
CREATE TABLE category (
  id int(11) PRIMARY KEY AUTO_INCREMENT NOT NULL,
  name varchar(50),
  parent_id int(11)
);

INSERT INTO category(id, name, parent_id)
VALUES (1, '数码产品', 0), (2, '服装', 0), (3, '食品', 0),
       (4, 'iPad', 1), (5, '李宁', 2), (6, '康师傅', 3);

-- 查询所有顶级分类下面的子分类数量
SELECT c1.id, c1.name, COUNT(1)
FROM category c1 INNER JOIN category c2 ON c1.id = c2.parent_id
WHERE c1.parent_id = 0
GROUP BY c1.id;

-- 把父分类 id 变成名称
SELECT c1.id, c1.name, p.name
FROM category c1 LEFT JOIN category p ON c1.parent_id = p.id;
```

**多表更新**——用一张表的数据更新另一张表：

```sql
-- 插入省份表（从 patient 表去重提取省份）
CREATE TABLE province(id int PRIMARY KEY AUTO_INCREMENT, name varchar(50));
INSERT INTO province(name) SELECT DISTINCT province FROM patient;

-- 用 JOIN 把 patient 的省份字段从「省份名」更新为「省份 id」
UPDATE patient INNER JOIN province ON patient.province = province.name
SET patient.province = province.id;

-- 修改字段类型
ALTER TABLE patient CHANGE COLUMN `province` `province_id` int(11);
```

### 8. 索引基本操作

**索引可以提高查询速度**——它像书的目录，让数据库不用从头到尾翻全表就能定位数据：

![索引：像目录一样快速定位数据，避免全表扫描](https://cdn.nlark.com/yuque/0/2025/png/738210/1743413784330-98efd27f-08a0-4cbb-8046-6f7bc584a096.png)

先用存储过程造一批海量数据（838 万行），才能看出索引的效果：

```sql
-- 创建用户表
CREATE TABLE user (
  id int,
  username varchar(64),
  userno int
);

-- 生成随机字符串的函数
CREATE FUNCTION `rand_string`(n INT) RETURNS varchar(255)
BEGIN
  DECLARE chars_str varchar(100) DEFAULT 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  DECLARE return_str varchar(255) DEFAULT '';
  DECLARE i INT DEFAULT 0;
  WHILE i < n DO
    SET return_str = concat(return_str, substring(chars_str, FLOOR(1 + RAND() * 62), 1));
    SET i = i + 1;
  END WHILE;
  RETURN return_str;
END;

-- 生成随机数字的函数
CREATE FUNCTION rand_num()
RETURNS int(5)
BEGIN
  DECLARE i int DEFAULT 0;
  SET i = floor(10 + rand() * 500);
  RETURN i;
END;

-- 存储过程：向 user 表插入海量数据
CREATE PROCEDURE insert_user(in start int(10), in max_num int(10))
BEGIN
  DECLARE i int;
  SET i = 0;
  WHILE i < max_num DO
    SET i = i + 1;
    INSERT INTO user(id, username, userno) VALUES((start + i), rand_string(6), rand_num());
  END WHILE;
END;

CALL insert_user(1, 8388608);   -- 插入 838 万行
```

索引的创建、查看、删除：

```sql
-- 创建普通索引
CREATE TABLE user(id int PRIMARY KEY, name varchar(32), email varchar(32));
ALTER TABLE user ADD INDEX(name);
CREATE INDEX idx_name ON user(name);

-- 查看索引
SHOW INDEX FROM user;

-- 删除索引
ALTER TABLE user DROP PRIMARY;      -- 删主键（需先删自增）
ALTER TABLE user DROP INDEX idx_name;
DROP INDEX idx_name ON user;
```

对比加索引前后的查询速度——`EXPLAIN` 看是否走索引：

```sql
EXPLAIN SELECT * FROM user WHERE userno = 4593;   -- 加索引前：全表扫描
ALTER TABLE user ADD INDEX(userno);               -- 加索引
EXPLAIN SELECT * FROM user WHERE userno = 4593;   -- 加索引后：走索引
```

`EXPLAIN` 是排查慢查询的核心工具，这张截图解释了它的关键字段（`type`/`key`/`rows`/`Extra`）：

![EXPLAIN 字段说明：type 表示访问类型（const/ref/range/index/ALL），key 表示实际使用的索引，rows 表示预估扫描行数，Extra 里 Using filesort/Using temporary 是性能杀手](https://cdn.nlark.com/yuque/0/2025/png/738210/1743413785864-88b7bece-bdf6-4317-9b5f-6a2c6797f76a.png)

**索引创建的原则**（基础版，原理在第二部分展开）：

- 比较频繁作为查询条件的字段应该创建索引
- 唯一性太差的字段不适合单独创建索引（即使频繁作为查询条件）
- 更新非常频繁的字段不适合创建索引（索引维护成本高）
- 不会出现在 WHERE 子句中的字段不该创建索引

### 9. 事务基本用法

**为什么需要事务**？银行转账——A 账户减 10、B 账户加 10，这两条 `UPDATE` 必须要么都成功、要么都失败：

```sql
CREATE DATABASE bank;
USE bank;
CREATE TABLE account (
  name varchar(64),
  balance decimal(10, 2)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

INSERT INTO account(name, balance) VALUES ('张三', 100);
INSERT INTO account(name, balance) VALUES ('李四', 100);

UPDATE account SET balance = balance - 10 WHERE name = '张三';
UPDATE account SET balance = balance + 10 WHERE name = '李四';
```

如果第一条成功、第二条失败，钱就凭空消失了。**事务**是把多个操作作为一个整体向系统提交，要么都执行、要么都不执行——一个不可分割的工作逻辑单元。

事务的三种基本命令：

```plain
BEGIN;       -- 开始事务（等价于 START TRANSACTION）
UPDATE account SET balance = balance - 10 WHERE name = '张三';
ROLLBACK;    -- 回滚（撤销）
-- 或 COMMIT 提交（永久生效）
```

默认情况下，每条单独的 SQL 语句视为一个事务。关闭自动提交后可手动管理事务：

```sql
SET autocommit = 0;   -- 关闭自动提交，从下一条 SQL 开始新事务
SET autocommit = 1;   -- 开启自动提交
```

> 关闭自动提交后，从下一条 SQL 语句开始开启新的事务，需要用 `COMMIT` 或 `ROLLBACK` 结束该事务。

### 10. Node.js 用 mysql2 操作 MySQL

笔记原本用的是 `mysql` 包（回调风格），但它早已废弃，官方继任者是 **`mysql2`**——API 兼容、性能更好，还原生支持 Promise。安装：

```shell
npm install mysql2
```

**连接池 + Promise 版**（现代推荐写法）：

```javascript
const mysql = require('mysql2/promise')

// 连接池：复用连接，避免每次请求都建连的开销
const pool = mysql.createPool({
  host: 'localhost',
  user: 'me',
  password: 'secret',
  database: 'my_db',
  connectionLimit: 10,        // 👈 连接池上限
  waitForConnections: true,
  queueLimit: 0
})

// 查询
async function queryPatient(id) {
  const [rows, fields] = await pool.query('SELECT * FROM patient WHERE id = ?', [id])
  return rows[0]
}
```

`?` 是**参数占位符**，值通过数组传入——这是防 SQL 注入的关键（不要拼字符串）。

**事务写法**（async/await 版）：

```javascript
async function transfer(from, to, amount) {
  const conn = await pool.getConnection()   // 从池里拿一个连接
  try {
    await conn.beginTransaction()            // 开始事务

    await conn.query('UPDATE account SET balance = balance - ? WHERE name = ?', [amount, from])
    await conn.query('UPDATE account SET balance = balance + ? WHERE name = ?', [amount, to])

    await conn.commit()                      // 提交
  } catch (err) {
    await conn.rollback()                    // 出错回滚
    throw err
  } finally {
    conn.release()                           // 归还连接
  }
}
```

这个写法的三个关键点：`getConnection()` 拿独立连接（事务必须在一个连接内完成，不能用 `pool.query` 直接发多条）、`try/catch` 里 `rollback`、`finally` 里 `release` 归还连接避免泄漏。

> 💬 **面试官**：为什么 MySQL 事务必须用参数化查询，不能拼 SQL 字符串？
>
> ✅ 标准答案：拼字符串会有 SQL 注入风险——用户输入 `' OR '1'='1` 这类恶意值就能改写 SQL 语义。参数化查询（`?` 占位符 + 值数组）由驱动在底层把值作为数据而非 SQL 代码发送，从根上杜绝注入。这是后端安全的第一条铁律。
>
> 🎁 加分答案：能补充「ORM（Drizzle/Prisma）本质上也是在底层做参数绑定」，以及「事务必须在同一连接内完成，所以要用 `getConnection()` 拿独立连接，而不是 `pool.query` 直接发多条」。

到这里，「基本使用」的十个知识点——概念、建表、CRUD、函数、聚合分组、子查询、表连接、索引、事务、Node 落地——就串完了。下面进入「企业最佳实践」，把这些东西往生产深度上推一层。

---

## 二、企业最佳实践

### 1. 事务四大特性 ACID：理解隔离级别与锁的坐标系

ACID 是事务的四个特性，它不只是四个要背的名词，更是理解后面「隔离级别」「锁选型」的**坐标系**——隔离性 I 对应隔离级别，原子性 A 对应回滚，持久性 D 对应日志。

- **原子性（Atomicity）**：事务是一个完整的操作，各部分不可分，要么都执行、要么都不执行。转账两条 UPDATE 要么都成功、要么都回滚。
- **一致性（Consistency）**：事务完成后，数据必须处于完整的状态。总余额在转账前后不变，就是一致性的体现。
- **隔离性（Isolation）**：并发事务彼此隔离、独立，不应该以任何方式依赖其它事务。
- **持久性（Durability）**：事务完成后，对数据库的修改被永久保持（提交即落盘，靠 redo log 保证）。

理解这套坐标系，再看下面的隔离级别：**隔离级别就是在「隔离性」和「性能」之间做取舍的旋钮**——隔离得越彻底（串行化），并发问题越少，但性能越差。而锁，是数据库实现这些隔离级别的**底层手段**。

### 2. 四种隔离级别与选型

并发事务同时操作同一份数据，会引出三种典型问题（**按严重程度从高到低**）：

- **脏读（Dirty Read）**：事务 A 读到了事务 B 已经修改但**尚未提交**的数据。此时 B 回滚，A 读到的就是无效数据。一句话：读到「别人没提交的脏数据」。
- **不可重复读（Non-Repeatable Read）**：事务 A 内两次读同一行，中间事务 B 修改并提交了这行，导致 A 两次读到的值不一样。针对的是 `UPDATE`/`DELETE`。
- **幻读（Phantom Read）**：事务 A 按相同条件查两次，中间事务 B **插入**了满足条件的新数据，导致 A 第二次查多出几行「幻影」。针对的是 `INSERT`。

针对这三个问题，SQL 标准定义了四种隔离级别，InnoDB 全部支持：

| 隔离级别 | 脏读 | 不可重复读 | 幻读 | 说明 |
|---------|------|-----------|------|------|
| READ UNCOMMITTED（读未提交） | 允许 | 允许 | 允许 | 几乎不用 |
| READ COMMITTED（读已提交） | — | 允许 | 允许 | 解决脏读 |
| REPEATABLE READ（可重复读） | — | — | 允许 | InnoDB 默认 |
| SERIALIZABLE（串行化） | — | — | — | 完全串行 |

先看脏读怎么发生。设两个会话都改成「读未提交」：

```sql
SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
SELECT @@tx_isolation;   -- 查看当前隔离级别
```

会话 1 开启事务、插入一条但**不提交**；会话 2 开启事务查询——在「读未提交」级别下，会话 2 能读到这条尚未提交的数据，这就是脏读：

```sql
-- 会话 1
START TRANSACTION;
INSERT INTO account3(id, balance) VALUES(3, 100);   -- 未提交

-- 会话 2
START TRANSACTION;
SELECT * FROM account3;   -- 读到了会话 1 未提交的 id=3（脏读）
```

把级别调到「读已提交」，脏读就没了（只能读到已提交的数据），但「不可重复读」还在——会话 2 第一次读、会话 1 修改并提交、会话 2 再读，两次值不同：

```sql
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- 会话 2 第一次读
START TRANSACTION;
SELECT * FROM account3;

-- 会话 1 修改并提交
START TRANSACTION;
DELETE FROM account3 WHERE id = 1;
COMMIT;

-- 会话 2 第二次读：id=1 没了，两次结果不一致（不可重复读）
SELECT * FROM account3;
```

InnoDB 的默认级别「可重复读」用 MVCC（多版本并发控制）解决了脏读和不可重复读——事务开始后，读到的都是「一致性快照」，别人提交的修改在本次事务内看不到。但幻读仍可能发生（针对新插入的数据）：

```sql
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- 会话 1 插入并提交
START TRANSACTION;
INSERT INTO account3(id, balance) VALUES(5, 100);
COMMIT;

-- 会话 2 读到的仍是一致性快照，看不到 id=5（InnoDB 的 RR 实际上也抑制了大部分幻读）
START TRANSACTION;
SELECT * FROM account3;
```

> 这里有个面试常考的细节：**InnoDB 的「可重复读」通过「一致性读 + 间隙锁（next-key lock）」实际上已经很大程度上抑制了幻读**，这和 SQL 标准里「RR 允许幻读」的定义有出入。标准是标准，InnoDB 实现得更强。

**选型原则**（面试最爱问）：

- **默认用 InnoDB 的可重复读（RR）**，多数业务场景够用——它解决了脏读和不可重复读，性能折中最好
- **读已提交（RC）**常用于需要「每次读都看到最新已提交数据」的场景，如实时对账
- **串行化**只有对并发读写一致性要求极高、且能接受性能代价时才考虑

```sql
-- 切换隔离级别的三种作用域
SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;   -- 当前会话
SET GLOBAL TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;    -- 全局（新连接生效）
SELECT @@global.tx_isolation;    -- 查看全局
SELECT @@session.tx_isolation;   -- 查看会话
```

> 💬 **面试官**：MySQL 的四种隔离级别分别解决什么并发问题？InnoDB 默认是哪个？怎么选？
>
> ✅ 标准答案：四种级别分别是读未提交、读已提交、可重复读、串行化。读已提交解决脏读，可重复读解决脏读+不可重复读，串行化解决全部三种（脏读/不可重复读/幻读）。InnoDB 默认是「可重复读」。选型：默认可重复读，只有对一致性要求极高且能接受性能代价才用串行化，需要每次读最新已提交数据（如实时对账）可用读已提交。
>
> 🎁 加分答案：能说清三种并发问题的**区别**——脏读是「读未提交」、不可重复读针对 `UPDATE/DELETE`、幻读针对 `INSERT`；并能点出「InnoDB 的可重复读靠 MVCC 一致性读 + 间隙锁，实际上比 SQL 标准定义更强、已大幅抑制幻读」这个实现层面的细节。

### 3. 锁：表锁 vs 行锁、死锁

**锁是计算机协调多个进程或线程并发访问某一资源的机制**，数据库用锁来实现并发控制。从两个维度分类：

**按操作类型分**：

- **读锁（共享锁）**：同一份数据，多个读操作可以同时进行、互不影响
- **写锁（排它锁）**：当前写操作完成前，阻断其它写锁和读锁

**按粒度分**：

- **表锁**：偏向 MyISAM 存储引擎，开销小、加锁快，但锁定粒度大、锁冲突概率最高、并发度最低
- **行锁**：偏向 InnoDB 存储引擎，开销大、加锁慢，会出现死锁，但锁定粒度最小、并发度最高

**InnoDB 与 MyISAM 的最大不同**有两点：一是支持事务（TRANSACTION），二是采用了行级锁。

表锁的读锁/写锁行为，用两个会话演示最清楚。先造数据：

```sql
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `NAME` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE = MyISAM DEFAULT CHARSET = utf8;

INSERT INTO `users` (`id`, `NAME`) VALUES ('1', 'a'), ('2', 'b'), ('3', 'c'), ('4', 'd');
```

**加读锁**：会话 1 锁表后，两个会话都能查（读锁不阻塞读），但会话 1 自己不能写（插入/更新报错），会话 2 写会等待：

| 会话 1 | 会话 2 | 说明 |
|-------|-------|------|
| `lock table users read;` | 连接数据库 | |
| `select * from users;` | `select * from users;` | 都可以查询 |
| 插入/更新 | 插入/更新 | 会话 1 报错，会话 2 等待 |
| `unlock tables;` | | 会话 1 释放锁，会话 2 完成 |

**加写锁**：会话 1 锁表后，会话 1 能读写，会话 2 的**查询也会被阻塞**：

| 会话 1 | 会话 2 | 说明 |
|-------|-------|------|
| `lock table users write;` | 连接数据库 | |
| `select * from users;` | `select * from users;` | 会话 2 的查询被阻塞 |
| `unlock tables;` | | 释放后会话 2 返回 |

> 结论一句话：**读锁会阻塞写、但不阻塞读；写锁把读和写都阻塞**。

**行锁**只有在 InnoDB 引擎的索引键上才会启用。它的代价是**死锁**——两个事务各自持有对方需要的行锁，互相等待，谁都进行不下去：

```plain
Deadlock found when trying to get lock; try restarting transaction
```

典型死锁场景：两个会话交叉更新两行：

| 会话 1 | 会话 2 | 说明 |
|-------|-------|------|
| `set autocommit=0` | `set autocommit=0` | 都关闭自动提交 |
| `update account set balance = balance - 10 where name = '张三'` | `update account set balance = balance - 10 where name = '李四'` | 各锁一行 |
| `update account set balance = balance - 10 where name = '李四';` | `update account set balance = balance - 10 where name = '张三';` | 各自等对方释放 → 死锁 |

> 💬 **面试官**：InnoDB 的锁是加在行上还是加在索引上？什么时候会锁全表？
>
> ✅ 标准答案：InnoDB 的行锁是加在**索引**上的——通过索引条件检索数据时锁行；如果一条 UPDATE 的 WHERE 条件没走索引（全表扫描），InnoDB 会退化为锁全表。这是「为什么 UPDATE/DELETE 要确保走索引」的深层原因。
>
> 🎁 加分答案：能说出「行锁在索引上的三种形态——记录锁（锁索引记录）、间隙锁（锁索引区间、防幻读）、next-key 锁（前两者组合）」，以及「死锁后 InnoDB 会自动检测并回滚其中一个事务，应用层应捕获死锁异常做重试」。

### 4. 索引设计原理：B+ 树、聚簇索引、回表、覆盖索引

前面只讲了「怎么建索引」，这一节讲透「为什么索引这么快」。这是整篇文章面试密度最高的一块。

**InnoDB 用 B+ 树组织索引**。为什么是 B+ 树而不是二叉树或哈希？核心答案一句话：**树高被压得很低，通常只有 3-4 层，所以一次查询的磁盘 I/O 次数被限制在树高以内**。

数据库的瓶颈在磁盘 I/O（读一页数据是毫秒级，比内存慢几个数量级）。B+ 树每个节点能存几百上千个 key（一个节点是一页，如 16KB），所以几百万、几千万条数据，树高也只有 3-4 层——查一条记录最多 3-4 次磁盘 I/O，这是「大数据量下索引查询依然快」的根本原因。

B+ 树还有两个对范围查询友好的特性：

- **叶子节点之间用链表相连**，`BETWEEN`/`ORDER BY` 这类范围查询只要定位到起点，顺着链表往下读即可
- **所有数据都存在叶子节点**，非叶子节点只存 key 做「导航」，所以非叶子节点能放更多 key、树更矮

![B+ 树结构：非叶子节点只存索引做导航，所有数据在叶子节点，叶子节点间用链表相连便于范围查询](https://cdn.nlark.com/yuque/0/2025/png/738210/1743413784330-98efd27f-08a0-4cbb-8046-6f7bc584a096.png)

**聚簇索引与二级索引**是理解 InnoDB 索引体系的两块基石：

- **聚簇索引**：主键索引就是聚簇索引，**数据行按主键物理存储**——叶子节点直接就是整行数据。
- **二级索引**：非主键索引，叶子节点**只存「索引列的值 + 主键值」**，不存整行数据。

**回表**由此而来：用二级索引查到主键值后，还要再回聚簇索引查一次，才能拿到完整的行数据。如果查询只需要索引里的字段（索引「覆盖」了查询），就不用回表——这就是**覆盖索引**快的原理：

```sql
-- 建一个联合二级索引 (name, age)
CREATE INDEX idx_name_age ON patient(name, age);

-- 回表：SELECT * 需要整行，二级索引只有 name/age/id，还得回聚簇索引拿其它字段
SELECT * FROM patient WHERE name = '张三';

-- 覆盖索引：只查 name/age/id，全在二级索引里，无需回表
SELECT name, age FROM patient WHERE name = '张三';
```

「覆盖索引」是优化查询最实用的一招：**让查询字段尽量都落在索引里，省掉回表的第二次磁盘 I/O**。

> 💬 **面试官**：什么是聚簇索引和二级索引？为什么二级索引有时要「回表」？覆盖索引为什么快？
>
> ✅ 标准答案：聚簇索引是主键索引，数据行按主键物理存储，叶子节点就是整行；二级索引是非主键索引，叶子节点只存索引列+主键值。所以用二级索引查到主键后，要再回聚簇索引查一次才能拿全行，这就是「回表」。覆盖索引指查询字段全在索引里，直接读索引返回，省掉回表的第二次 I/O，所以快。
>
> 🎁 加分答案：能补充「一张表只能有一个聚簇索引（因为数据只能按一种顺序物理存储），其余都是二级索引」；以及「自增主键比随机主键更适合做聚簇索引，因为自增是顺序插入、不会引发页分裂，随机主键会导致大量页分裂和碎片」。

### 5. 最左前缀原则

联合索引 `(a, b, c)` 的生效规则，一句话就是**最左前缀原则**：**只有从最左列 `a` 开始连续匹配，索引才生效**。

```sql
CREATE INDEX idx_abc ON t(a, b, c);

WHERE a = 1 AND b = 2 AND c = 3;   -- ✅ 全部命中
WHERE a = 1 AND b = 2;             -- ✅ 命中 a、b
WHERE a = 1;                       -- ✅ 命中 a
WHERE a = 1 AND c = 3;             -- ⚠️ 只命中 a，b 断了，c 用不上
WHERE b = 2;                       -- ❌ 没从最左 a 开始，整个索引用不上
WHERE b = 2 AND c = 3;             -- ❌ 同上
```

原因藏在 B+ 树的存储里：联合索引的 key 是「先按 a 排、a 相同再按 b 排、b 相同再按 c 排」。所以**脱离了 a 单独查 b，数据在索引里不是有序的**，自然用不上。中间断了（跳过 b 直接用 c）也不行。

**设计联合索引时，把最常作为等值/范围查询的列放最左边**。还有一个进阶点：范围查询会「中断」后续列的索引——`WHERE a = 1 AND b > 10 AND c = 3` 里，`b > 10` 是范围，所以 `c` 用不上索引。

> 💬 **面试官**：什么是最左前缀原则？联合索引 `(a,b,c)` 哪些查询能生效、哪些不能？
>
> ✅ 标准答案：最左前缀原则指联合索引只有从最左列开始连续匹配才生效。`WHERE a=1 AND b=2` 能用，`WHERE b=2` 单独用不上。因为联合索引的 key 按 a→b→c 依次排序，脱离 a 单独查 b，数据在索引里不是有序的。
>
> 🎁 加分答案：能说出「范围查询会中断后续列」——`WHERE a=1 AND b>10 AND c=3` 里 c 用不上索引；以及设计时「等值查询列放最左、范围查询列放靠后」的实践原则。

### 6. 慢查询排查方法论

拿到一条慢查询，排查思路分三步：

**第一步：用慢查询日志定位问题 SQL**。开启慢查询日志，设置阈值（如超过 1 秒的记录），生产上靠它持续收集慢 SQL。

**第二步：用 `EXPLAIN` 分析执行计划**。这是核心工具，重点看四个字段：

- **`type`**（访问类型，从好到坏）：`const`（主键/唯一索引等值查，最优）> `ref`（普通索引等值查）> `range`（索引范围扫描）> `index`（全索引扫描）> `ALL`（全表扫描，最差）
- **`key`**：实际使用的索引，为 `NULL` 说明没走索引
- **`rows`**：预估扫描行数，越大越慢
- **`Extra`**：附加信息，`Using filesort`（额外排序）和 `Using temporary`（临时表）是性能杀手

```sql
EXPLAIN SELECT * FROM user WHERE userno = 4593;
```

判断标准一句话：**`type` 出现 `ALL` 或 `key` 为 `NULL`，基本就是索引缺失或失效**。

**第三步：针对性优化**——建索引、改 SQL 让查询走索引、用覆盖索引省回表、避免 `Extra` 里出现 `Using filesort`/`Using temporary`。

> 💬 **面试官**：拿到一条慢查询，你的排查思路是什么？
>
> ✅ 标准答案：三步走——① 慢查询日志定位问题 SQL；② `EXPLAIN` 看执行计划，重点看 `type`（const>ref>range>index>ALL）、`key`（实际索引，NULL 说明没走）、`rows`（扫描行数）、`Extra`（Using filesort/temporary 是性能杀手）；③ 针对性优化：建索引、改 SQL、覆盖索引省回表。
>
> 🎁 加分答案：能解释 `type` 各取值的含义，并补充「`rows` 是预估不是精确值、和真实扫描行数可能差很多」，以及「`Extra` 出现 `Using index` 是好事（覆盖索引），出现 `Using filesort`/`Using temporary` 要重点优化」。

### 7. 三大范式与反范式权衡

数据库设计有三大范式，用来减少冗余、保证更新一致性：

- **第一范式（1NF）**：每列（字段）是不可拆分的最小单元，保证列的原子性。比如「地址」不该塞进「国家+城市」两个维度。

![第一范式：地址列拆分为国家、城市，保证每列原子性](https://cdn.nlark.com/yuque/0/2025/png/738210/1743494360195-bbbe2ba1-591d-4b11-a0a2-dad9cf41a040.png)

- **第二范式（2NF）**：满足 1NF 后，所有列都必须依赖主键，一个表只描述一件事。一个订单表里既放订单又放联系人，一个人订多个房间就导致联系人重复冗余。

![第二范式：一个订单表混杂订单和联系人两个实体，导致数据冗余](https://cdn.nlark.com/yuque/0/2025/png/738210/1743494361121-e909e12c-4360-434a-9f76-4a6f409fe5c2.png)

![第二范式修正：把联系人拆成独立表，订单表只留联系人编号](https://cdn.nlark.com/yuque/0/2025/png/738210/1743494361044-e38e8e49-d6b3-423c-947e-ac9423147990.png)

- **第三范式（3NF）**：满足 2NF 后，每列只与主键直接相关、不间接相关（消除传递依赖）。学生表里既有学生又有「年级名称」，而年级名称其实依赖年级 ID，是传递依赖，应拆出年级表。

![第三范式：学生表里「年级名称」通过年级 ID 传递依赖主键，应拆出年级表](https://cdn.nlark.com/yuque/0/2025/png/738210/1743494361215-1d3f0ccd-bfce-40d6-bdef-0b6d5ff13b69.png)

快速区分三范式：**1NF 管「列不能再拆」，2NF 管「一张表只描述一个实体（消除部分依赖）」，3NF 管「列只依赖主键、不依赖主键之外的其它列（消除传递依赖）」**。

**但范式不是越严格越好**。严格范式化会带来更多 `JOIN`，高并发读场景下频繁 JOIN 反而拖慢性能。所以有了**反范式化**：

> 高并发读场景常故意反范式化（如订单表冗余商品名快照），用空间换查询性能。

**设计原则一句话：读多写少走反范式、读少写多走范式**。订单表里冗余商品名，是因为「下单那一刻的商品名」就是要快照下来（商品改名前后的历史订单不该跟着变），而且读订单详情远比写频繁——这就是反范式的典型正当理由。

> 💬 **面试官**：什么场景该用范式，什么场景该反范式化？
>
> ✅ 标准答案：范式减少冗余、保证更新一致性，但会带来更多 JOIN；反范式用空间换查询性能。判据是读写比：**读多写少走反范式（如订单冗余商品名快照），读少写多走范式**。
>
> 🎁 加分答案：能点出反范式的一个关键场景是「快照语义」——订单里的商品名是「下单时点的快照」，本来就该冗余，否则商品改名会影响历史订单；以及「反范式是显式用冗余换性能，前提是清楚冗余带来的更新一致性问题并做好同步机制」。

### 8. 数据库设计流程与 ER 图

数据库设计不是直接写建表语句，而是顺着一条流程走：

**需求分析 → 概要设计（ER 模型图）→ 详细设计（三大范式审核）→ 代码编写（物理实现）→ 测试 → 部署**。

核心是「现实世界 → 信息世界 → 数据库模型图 → 数据库」的抽象过程。设计步骤分四步：

1. **收集信息**：与相关人员交流，充分理解需求
2. **标示实体（Entity）**：数据库要管理的关键对象，实体一般是名词（患者、药品、处方）
3. **标示实体的属性（Attribute）**：实体的特征（患者的姓名、年龄）
4. **标示实体之间的关系（Relationship）**：实体间的联系（患者与处方的「拥有」关系）

**ER 图**（实体关系图）用三个基本概念描述静态数据结构：实体（长方形）、属性（椭圆形）、关系（菱形）。属性分唯一属性（下划线标识，能唯一标识实体实例）和非唯一属性。

实体间有三种关联关系：

- **1 对 1（1:1）**：A 中每个实体至多对应 B 中一个实体（患者-身份证信息）

![1:1 关系：患者与身份证信息一一对应](https://cdn.nlark.com/yuque/0/2025/png/738210/1743494360099-32bea6b8-806d-4c78-a0f5-6f9414bdd46b.png)

- **1 对多（1:N）**：A 中一个实体对应 B 中多个实体（患者-处方，一个患者可有多张处方）

![1:N 关系：患者与处方，一个患者对应多张处方](https://cdn.nlark.com/yuque/0/2025/png/738210/1743494360113-3518788e-758a-4934-ae0a-0664e2604017.png)

- **多对多（M:N）**：A 与 B 互相多个对应（患者-药品，通过处方明细表关联）

![M:N 关系：患者与药品多对多，需要中间表](https://cdn.nlark.com/yuque/0/2025/png/738210/1743494360323-214d33ed-eb35-4a43-88be-b6a51f324521.png)

> 多对多关系在物理实现时必须拆出一个中间表（如处方明细），这是 ER 图转表结构时的标准动作。

### 9. RBAC 权限模型：数据库设计的实战案例

**RBAC（Role-Based Access Control，基于角色的访问控制）**是数据库设计的一个完整实战案例：用户通过角色与权限关联——一个用户拥有若干角色，每个角色拥有若干权限，构成「用户-角色-权限-资源」的授权模型。核心概念四个：用户（User）、角色（Role）、权限（Permission）、资源（Resource）。

RBAC 支持三条安全原则：

- **最小权限原则**：把角色配置成完成任务所需的最小权限集
- **责任分离原则**：通过相互独立、互斥的角色共同完成敏感任务
- **数据抽象原则**：用业务抽象（借款、存款）而非底层读写执行权限

完整的 ER 图（用户/角色/资源 + 用户角色/角色资源两张关联表）：

![RBAC 完整 ER 图：用户、角色、资源三张实体表 + 用户角色、角色资源两张多对多关联表](https://cdn.nlark.com/yuque/0/2025/png/738210/1743494362129-891de25f-2391-40e3-a8d8-2327c60e7cbb.png)

核心是「用户」「角色」「资源」三张实体表 + 「用户角色」「角色资源」两张关联表（多对多拆分出的中间表）。建表脚本：

```sql
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NULL,
  `password` varchar(255) NULL,
  `email` varchar(255) NULL,
  `phone` varchar(255) NULL,
  `gender` tinyint(255) NULL,
  `birthday` datetime NULL,
  `address` varchar(255) NULL,
  `last_login` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `status` tinyint(255) NULL DEFAULT 1,
  PRIMARY KEY (`id`)
);

CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NULL,
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `status` tinyint(255) NULL DEFAULT 1,
  PRIMARY KEY (`id`)
);

CREATE TABLE `resources` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `key` varchar(255) NULL,
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `status` tinyint(255) NULL DEFAULT 1,
  PRIMARY KEY (`id`)
);

-- 用户角色关联表（多对多中间表）
CREATE TABLE `user_role` (
  `user_id` int(11) NOT NULL,
  `role_id` int(255) NOT NULL,
  PRIMARY KEY (`user_id`, `role_id`)
);

-- 角色资源关联表
CREATE TABLE `role_resource` (
  `role_id` int(11) NOT NULL,
  `resource_id` int(255) NOT NULL,
  PRIMARY KEY (`role_id`, `resource_id`)
);

-- 外键约束
ALTER TABLE `user_role` ADD CONSTRAINT `fk_user_role_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
ALTER TABLE `user_role` ADD CONSTRAINT `fk_user_role_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);
ALTER TABLE `role_resource` ADD CONSTRAINT `fk_role_resource_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);
ALTER TABLE `role_resource` ADD CONSTRAINT `fk_role_resource_resource_id` FOREIGN KEY (`resource_id`) REFERENCES `resources` (`id`);
```

> 💬 **面试官**：为什么多对多关系一定要拆中间表？RBAC 里「用户-角色」「角色-权限」怎么落地？
>
> ✅ 标准答案：多对多关系无法直接用外键表达（一个外键只能「多对一」），必须拆出一张中间表，中间表的主键是两端主键的联合。RBAC 里「用户-角色」用 `user_role(user_id, role_id)`、「角色-权限」用 `role_resource(role_id, resource_id)` 两张中间表落地。
>
> 🎁 加分答案：能补充中间表的设计细节——联合主键本身既表达了「一个用户不能重复拥有同一角色」，又天然支持按任一端的索引查询；以及 RBAC 的扩展（角色继承、动态权限）都是在这套基本模型上叠加。

到这里，「企业最佳实践」讲完了九个深度点。下面进入「注意事项」——那些在生产里最容易翻车、面试里也常被追问的坑。

---

## 三、注意事项

### 1. 深分页性能陷阱

分页查询最朴素的写法是 `LIMIT offset, count`，但 offset 一大就会出问题：

```sql
SELECT * FROM prescription ORDER BY id LIMIT 100000, 20;
```

这条 SQL 会**扫描并丢弃前 10 万行**，只返回最后的 20 行——偏移量越大越慢，`LIMIT 1000000, 20` 时基本不可用。深分页是生产里「翻到后面几页就卡死」的头号元凶。

两个解法：

**游标分页**（推荐）：记录上一页最后一条的主键，用 `WHERE id > lastId` 代替 `OFFSET`：

```sql
-- 第一页
SELECT * FROM prescription WHERE id > 0 ORDER BY id LIMIT 20;
-- 拿到最后一条 id = 10086，下一页用它做游标
SELECT * FROM prescription WHERE id > 10086 ORDER BY id LIMIT 20;
```

**延迟关联**：先在索引上快速定位要返回的 id，再回表拿完整数据：

```sql
-- 子查询只扫索引（覆盖索引），拿到 id 后再关联取全行
SELECT p.* FROM prescription p
INNER JOIN (SELECT id FROM prescription ORDER BY id LIMIT 100000, 20) t
ON p.id = t.id;
```

游标分页的代价是「不能跳页」（只能上一页/下一页），延迟关联保留跳页能力但要写子查询——按业务需求选。

### 2. 索引失效的常见场景

建了索引却不生效，比没建索引更隐蔽。三个高频失效场景：

**索引列上使用函数**：

```sql
-- ❌ YEAR 函数包住索引列，索引失效 → 全表扫描
SELECT * FROM prescription WHERE YEAR(create_time) = 2026;
-- ✅ 改成范围条件，走索引
SELECT * FROM prescription WHERE create_time >= '2026-01-01' AND create_time < '2027-01-01';
```

**隐式类型转换**：字符串列用数字比较，MySQL 会把列转成数字，导致索引失效：

```sql
-- ❌ idcard 是 varchar，用数字比较触发隐式转换，索引失效
SELECT * FROM patient WHERE idcard = 123456;
-- ✅ 用字符串，走索引
SELECT * FROM patient WHERE idcard = '123456';
```

**`LIKE '%xxx'` 前缀模糊匹配**：

```sql
-- ❌ 左模糊（% 在开头），无法用索引
SELECT * FROM patient WHERE name LIKE '%张';
-- ✅ 右模糊（% 在结尾），可以用索引
SELECT * FROM patient WHERE name LIKE '张%';
```

> 💬 **面试官**：索引在哪些情况下会失效？
>
> ✅ 标准答案：三类高频场景——① 索引列上使用函数（`WHERE YEAR(create_time)=2026`）；② 隐式类型转换（字符串列用数字比较）；③ `LIKE '%xxx'` 前缀模糊匹配。都会导致索引无法使用、落到全表扫描。
>
> 🎁 加分答案：能补充「OR 条件里有一侧没索引、`NOT IN`/`<>` 负向查询、联合索引不满足最左前缀」等更多失效场景，并点出「用 `EXPLAIN` 看 `type` 是否变 `ALL` 是判断失效的唯一可靠手段」。

### 3. UPDATE/DELETE 忘带 WHERE

`UPDATE`/`DELETE` 忘带 `WHERE`，会全表更新/删除——这是生产事故高发区，一条 SQL 就能清空整张表。三个兜底习惯：

- **先写 WHERE 再写 SET**：养成思维定式，避免写完 SET 一激动直接执行了
- **上线前在事务里回滚验证**：`BEGIN` → 执行 → 确认影响行数 → 再决定 `COMMIT` 还是 `ROLLBACK`
- **用 SQL 审核工具兜底**：让工具在「无 WHERE 的 UPDATE/DELETE」时拦截告警

### 4. 生产环境是否用外键的争议

外键能保证引用完整性，但生产环境是否该用，是个有争议的问题：

- **用外键**：数据库层强制引用完整，脏数据进不来，数据一致性有硬保证
- **不用外键**：外键会带来锁竞争（插入/更新子表要检查父表，加共享锁），级联删除有风险，高并发下是性能瓶颈

> 高并发场景常见选择是「**不用外键、在应用层保证一致性**」。没有绝对答案，取决于团队对「一致性 vs 性能」的取舍。

一个折中的实践：**开发/测试环境保留外键做校验，生产环境去掉外键、靠应用层 + 定期数据一致性巡检兜底**。

### 5. TRUNCATE 不可恢复

`TRUNCATE` 清空表数据但不写日志，**无法回滚**，且不能用于有外键引用的表——能删数据但几乎不可逆。

它和 `DELETE` 的关键差异：`DELETE` 是 DML，逐行删、写 undo 日志、可回滚；`TRUNCATE` 是 DDL，相当于「删表再重建」，不写逐行日志、不可回滚、还重置自增列。所以生产环境里，`TRUNCATE` 要慎用，能不用就不用，用 `DELETE`（哪怕是全表 `DELETE`，至少能回滚）更安全。

### 6. 隐式锁与死锁：应用层要重试

InnoDB 行锁在并发事务下可能死锁（前面第二节已经演示了交叉更新的死锁场景）。关键结论是：**死锁是并发下的正常现象，不是 bug**，应用层要做的是**捕获死锁异常并重试**，而不是当作 bug 崩溃处理。

```javascript
// 死锁重试：捕获 ER_LOCK_DEADLOCK 错误码，指数退避重试
async function transferWithRetry(from, to, amount, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await transfer(from, to, amount)
    } catch (err) {
      // MySQL 死锁错误码 1213 / 锁等待超时 1205
      if ((err.code === 'ER_LOCK_DEADLOCK' || err.code === 'ER_LOCK_WAIT_TIMEOUT') && i < retries - 1) {
        await sleep(Math.random() * 100 * (i + 1))  // 随机退避，避免再次同时冲突
        continue
      }
      throw err
    }
  }
}
```

减少死锁的实践：**按固定顺序访问资源**（所有事务都先锁 A 再锁 B，而非有的先 A 后 B、有的先 B 后 A）、**缩短事务持有锁的时间**（把能提前做的查询挪到事务外）、**尽量用索引让锁粒度降到行级**。

### 7. 存储过程与自定义函数：进阶但生产慎用

第一部分的存储过程（`insert_user` 造数据）和自定义函数（`rand_string`）展示了它们的用法，但生产环境要**谨慎使用**：

- **可维护性差**：逻辑藏在数据库里，版本管理、Code Review、单元测试都不如应用层代码方便
- **调试困难**：报错信息不友好，排查链路长
- **跨团队协作成本高**：业务逻辑分散在「应用代码」和「数据库存储过程」两处，职责边界模糊

> 现代实践倾向把业务逻辑放在应用层（Node.js），存储过程只保留「造数据、批量清洗」这类数据库内部辅助场景，不承载核心业务逻辑。

---

## 参考资料

- https://dev.mysql.com/doc/ （MySQL 官方文档）
- https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html （InnoDB 事务隔离级别）
- https://dev.mysql.com/doc/refman/8.0/en/explain-output.html （EXPLAIN 输出说明）
- https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html （InnoDB 索引类型）
- https://github.com/sidorares/node-mysql2 （mysql2 官方仓库）

> 索引底层原理（B+ 树、聚簇/二级索引、MVCC）推荐搜索关键词「MySQL B+ 树 索引原理」「InnoDB 聚簇索引 回表」「MySQL MVCC 一致性读」。

---

## 💡 一张图总结（面试速记表）

| 知识点 | 一句话内核 | 考察频率 |
|--------|-----------|---------|
| ACID | 原子/一致/隔离/持久，是隔离级别与锁的坐标系 | ⭐⭐⭐ 必考 |
| 四种隔离级别 | RR 解决脏读+不可重复读（InnoDB 默认），串行化解全部 | ⭐⭐⭐ 必考 |
| B+ 树索引 | 树高 3-4 层 → 磁盘 I/O 受限，叶子节点链表利于范围查询 | ⭐⭐⭐ 必考 |
| 聚簇/二级/回表/覆盖 | 主键聚簇存整行，二级存主键值，覆盖索引省回表 | ⭐⭐⭐ 必考 |
| 最左前缀 | 联合索引从最左列连续匹配才生效，范围查询中断后续列 | ⭐⭐⭐ 必考 |
| 慢查询排查 | 慢日志定位 → EXPLAIN 看 type/key/rows/Extra → 优化 | ⭐⭐⭐ 必考 |
| 范式与反范式 | 读多写少反范式、读少写多范式 | ⭐⭐ 高频 |
| 深分页 | `LIMIT 100000,20` 扫全丢前 10 万行 → 游标分页/延迟关联 | ⭐⭐ 高频 |
| 索引失效 | 函数/隐式转换/`LIKE '%xxx'` 前缀模糊 | ⭐⭐ 高频 |
| 死锁重试 | 并发正常现象，捕获错误码重试，不当 bug | ⭐⭐ 高频 |

> 💡 记住这条主线：**ACID 是坐标系 → 隔离级别是「隔离 vs 性能」的旋钮 → 锁是实现隔离的手段 → B+ 树/索引是查询性能的根基 → 慢查询排查是「用 EXPLAIN 找索引缺失/失效」 → 范式权衡是「空间 vs 一致性」的算账**。MySQL 的生产实践，每一步都在做取舍。

---

## 💡 面试核心问

- **MySQL 的四种事务隔离级别分别解决什么并发问题？InnoDB 默认是哪个？怎么选？**（读已提交解决脏读，可重复读解决脏读+不可重复读，串行化解决全部；默认 RR；默认可重复读，实时对账等场景用读已提交）
- **为什么 B+ 树适合做数据库索引？树高 3-4 层意味着什么？**（树高被压到 3-4 层，磁盘 I/O 次数受限，所以大数据量下索引查询依然快；叶子节点链表利于范围查询）
- **什么是聚簇索引和二级索引？为什么二级索引查询有时要「回表」？覆盖索引为什么快？**（聚簇是主键索引、存整行；二级只存主键值，查到主键要回聚簇拿全行；覆盖索引字段全在索引里，省回表）
- **什么是最左前缀原则？联合索引 `(a,b,c)` 哪些查询能生效、哪些不能？**（从最左列连续匹配才生效，`WHERE a=1 AND b=2` 能用、`WHERE b=2` 用不上）
- **拿到一条慢查询，你的排查思路是什么？**（慢日志定位 → EXPLAIN 看 type/key/rows/Extra → 建索引/改 SQL/覆盖索引）
- **什么场景该用范式，什么场景该反范式化？**（读多写少反范式、读少写多范式；订单冗余商品名是快照语义）
- **`DELETE`/`TRUNCATE`/`DROP` 的区别？**（删数据可回滚 / 清空不写日志不可回滚 / 删整表）
- **`COUNT(*)`/`COUNT(1)`/`COUNT(name)` 的区别？**（前两者统计所有行，`COUNT(name)` 统计非 NULL 行）

---

## 📝 思考题

一张患者表有 1000 万行，你要做一个「患者列表」分页，每页 20 条。第一页秒开，翻到第 50 万页时却要 5 秒——这是为什么？你会怎么优化？提示：想想 `LIMIT offset, count` 的扫描方式，以及「游标分页」和「延迟关联」各自适用的场景（游标分页能不能支持「跳转到第 50 万页」这种需求？）。

欢迎评论区写出你的答案 👇

---

> 🔖 这是「Node.js 全栈深度拆解」系列第 12 篇。上一篇：《Serverless 架构：云函数/API 网关/部署形态演进》；下一篇预告：《MongoDB 深度：文档模型/聚合管道/索引策略/Mongoose 最佳实践》
>
> 前置基础扩展阅读：搜索关键词「Node.js 事件循环 微任务」「Node.js 模块系统 CommonJS ESM」「BFF 架构模式 API Gateway」「MySQL B+ 树 索引原理」

