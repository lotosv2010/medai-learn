# ADR-0003 · 数据库与向量存储选型

**状态**：已采纳（Accepted）
**日期**：2025-01-01
**决策人**：你自己

---

## 背景与问题

系统需要存储两类数据：
1. **关系型数据**：用户、对话、消息（需要事务、外键约束）
2. **向量数据**：药品说明书 Embedding（需要近似最近邻搜索）

需要决定：独立的向量数据库（Pinecone / Chroma）？还是在关系型数据库上扩展向量能力？

---

## 决策

**关系型数据库：PostgreSQL 16**
**向量存储：pgvector（PostgreSQL 扩展，不引入额外服务）**
**缓存层：Redis 7（session + 限流 + 语义缓存）**

---

## 考量因素

### 为什么 pgvector 而不是专用向量库？

| 维度 | pgvector | Pinecone | Chroma |
|------|---------|---------|--------|
| 运维成本 | 低（复用 PostgreSQL） | 高（额外服务） | 中 |
| 本地开发 | 简单（Docker） | 需要 API Key | 可本地但重 |
| 事务支持 | ✅ 与业务数据同库，原子操作 | ❌ 跨服务，无事务 | ❌ |
| 扩展性 | 百万量级足够 | 亿级优势 | 百万量级 |
| 学习价值 | ✅ 深入 PostgreSQL 索引 | 仅学 API 调用 | 仅学 API 调用 |
| 成本 | 免费 | 按用量付费 | 免费（本地）|

**关键判断**：药品说明书体量（几千到几十万条 chunks），pgvector 的 ivfflat 索引完全胜任，引入专用向量库是过度工程。

### pgvector 的局限与缓解

```
局限：超过千万级 embedding 时，检索延迟会上升
缓解：
  1. 现阶段药品数据量远不到这个量级
  2. Phase 4 可以迁移到 Pinecone，接口层（packages/ai-sdk）已抽象
```

### 为什么选 Redis 而不是其他缓存？

- **Session 存储**：refresh token 需要服务端存储，Redis 的 TTL 机制天然匹配
- **限流**：Redis 原子操作实现滑动窗口限流，不会有并发问题
- **语义缓存**（Phase 3）：相似问题的 embedding 距离判断，缓存 AI 回答降成本
- **学习价值**：Redis 数据结构（String / List / SortedSet）和过期策略是高频面试题

### 为什么不用 MongoDB？

关系型数据的优势在于：
- 用户→对话→消息的三级关联用外键保证数据完整性
- 分页查询（游标分页）用 PostgreSQL 的 `WHERE id < cursor LIMIT n` 高效实现
- pgvector 扩展需要 PostgreSQL 宿主，已经用 PG 就没有理由再引入 Mongo

---

## 索引策略

```sql
-- 向量索引（IVFFlat，适合批量查询）
CREATE INDEX idx_drug_chunks_embedding
  ON drug_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);  -- lists ≈ sqrt(总行数)

-- 全文搜索索引（补充向量检索）
CREATE INDEX idx_drug_chunks_fts
  ON drug_chunks USING gin(to_tsvector('chinese', content));

-- 业务查询常用索引
CREATE INDEX idx_conversations_user_updated
  ON conversations(user_id, updated_at DESC)
  WHERE deleted_at IS NULL;
```

---

## 影响

### 正面
- 一个 PostgreSQL 实例管理全部数据，事务一致性有保证
- 本地开发只需 Docker，无需额外注册 API Key
- DBA 技能（索引调优、EXPLAIN ANALYZE）可以直接应用

### 负面与缓解
- **pgvector 冷启动**：首次运行 `CREATE INDEX` 在大量数据时耗时。缓解：开发阶段数据量小，无感知
- **PostgreSQL 连接池**：高并发时需要 PgBouncer 或 Drizzle 的连接池配置。缓解：Phase 3 接入

---

## 📚 对应学习内容

通过这个决策的实践，你将深度理解：

- **向量索引原理**：IVFFlat（倒排文件 + 量化）vs HNSW（分层导航小世界图），为什么 HNSW 更适合实时查询
- **余弦相似度 vs 欧氏距离**：为什么文本 embedding 用余弦相似度，而不是 L2 距离（归一化向量的等价性）
- **PostgreSQL 索引**：B-Tree / GIN / GIST / IVFFlat 各自适合什么查询类型
- **Redis 数据结构**：INCR + EXPIRE 实现计数器，ZADD 实现排行榜，这些是面试必考题
- **数据库事务**：为什么"写消息 + 更新对话 message_count"要在同一个事务里

**面试角度**：能解释"pgvector 和 Pinecone 的选型依据"、"IVFFlat 索引为什么需要先 vacuum"——这让你在 AI 工程师面试中比只会调 API 的候选人高出一档。

---

## 相关资源

- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [向量数据库选型指南（Pinecone 博客）](https://www.pinecone.io/learn/vector-database/)
- [Drizzle ORM pgvector 支持](https://orm.drizzle.team/docs/extensions/pg#vector)
