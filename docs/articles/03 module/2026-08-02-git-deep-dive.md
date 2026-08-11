# Git 核心原理全攻略：四区五态、撤销回滚、分支策略（面试收藏级）

> 面试官轻描淡写问了一句："git reset 和 git revert 有什么区别？"你刚想开口，他又补了一刀："那 --soft、--mixed、--hard 呢？已经 push 出去的代码怎么撤回？"大多数人到这里就支棱不起来了。

---

## 🎯 这篇文章解决什么问题

Git 每天都在用，但真正搞懂的人不多。这篇从 Git 的核心设计模型讲起，拆透「四区五态」，把最容易混淆的撤销回滚命令理清楚，再到团队级别的分支策略和工程规范。

既讲原理，也讲面试怎么答——Git 相关的题，读完这篇基本能接住。

---

## 🌍 分布式的本质：Git 为什么赢了

版本控制有两种模式：

**集中式**（SVN）：只有一台中央服务器有完整历史，所有操作都要联网。服务器挂了，大家都没法提交。

**分布式**（Git）：每个人本地都有**完整的仓库和历史**，联网只是为了同步。没网也能提交、回滚、查日志。

Git 解决了版本控制的几个核心诉求：

- **备份**：代码提交到版本库，删了也能找回
- **历史记录**：每次提交都是快照，知道谁在什么时间改了什么
- **回滚**：出了事可以退回任意历史版本，比打游戏存档还靠谱
- **团队协作**：多人并行开发，合并代码，处理冲突

> 💬 **面试官**：说说 Git 分布式的优势是什么？
>
> ✅ 标准答案：每个开发者本地都有完整仓库，不依赖网络也能工作；分支操作成本极低，创建/切换/合并都在本地完成。
>
> 🎁 加分答案：Git 用内容寻址（SHA-1 hash）存储每次提交的完整快照，而不是差分。这是它能做到完整历史还原、以及分布式同步的底层基础。

---

## 🗺️ 四区五态：Git 的核心模型

这是所有 Git 操作的底层地图，搞懂它，后面所有命令都有了坐标。

### 四个区域

**工作区（Working Directory）**：你能直接看到和编辑的文件目录，就是磁盘上的实际文件。

**暂存区（Staging Area / Index）**：`git add` 之后文件进这里，是提交前的缓冲层。

**本地仓库（Local Repository）**：`git commit` 之后进这里，`.git` 目录里存着完整提交历史。

**远程仓库（Remote Repository）**：`git push` 之后进这里，是团队共享的中央节点（GitHub / GitLab 等）。

数据流向很清晰：

```
工作区 --(git add)--> 暂存区 --(git commit)--> 本地仓库 --(git push)--> 远程仓库
```

### 五种状态

文件在 Git 里有五种生命状态：

- **Origin（未修改）**：文件与上次提交一致
- **Modified（已修改）**：在工作区改了，还没 add
- **Staged（已暂存）**：已 add，等待 commit
- **Committed（已提交）**：已 commit，进了本地仓库
- **Pushed（已推送）**：已 push，同步到了远程

### git diff 看哪段

三个阶段有三种 diff，对应不同的比较维度：

```bash
git diff                        # 工作区 vs 暂存区（已改未暂存）
git diff --cached               # 暂存区 vs 本地仓库（已暂存未提交）
git diff master origin/master   # 本地仓库 vs 远程（已提交未推送）
```

> 💬 **面试官**：git diff 和 git diff --cached 有什么区别？
>
> ✅ 标准答案：`git diff` 对比工作区和暂存区，看「改了什么还没 add」；`git diff --cached` 对比暂存区和最新提交，看「add 了什么还没 commit」。
>
> 🎁 加分答案：`git diff HEAD` 可以一次性看工作区和最新提交的差异，相当于把前两者合并——改了但还没提交的所有内容都显示出来。

---

## ⏪ 撤销与回滚：最容易答错的面试题

这块是高频考点，坑多。核心思路是**对照四区五态，在哪个阶段出了问题，用对应阶段的撤销命令**。

### 各阶段撤销

```bash
# 已修改，未暂存 → 丢弃工作区改动
git checkout .
# Git 2.23+ 新语法（更语义化）
git restore .
```

```bash
# 已暂存，未提交 → 从暂存区退回工作区（保留改动）
git reset HEAD
# Git 2.23+ 新语法
git restore --staged .
```

```bash
# 已提交，未推送 → 重置到远程状态
git reset --hard origin/master
```

```bash
# 已推送 → 本地重置后强制推送（危险，需团队知晓）
git reset --hard <commit-id>
git push -f
```

### reset 的三种模式

`git reset` 是最常考的命令，三种模式的区别要说清楚：

```bash
# --soft：只移动 HEAD，暂存区和工作区不动
# 效果：提交被撤回，改动还在暂存区，等你重新 commit
git reset --soft HEAD^
```

```bash
# --mixed（默认）：移动 HEAD + 清空暂存区，工作区不动
# 效果：提交被撤回，改动退回工作区，需重新 add + commit
git reset HEAD^
```

```bash
# --hard：移动 HEAD + 清空暂存区 + 丢弃工作区改动
# 效果：完全回到上一个提交，当前所有改动全丢（危险！）
git reset --hard HEAD^
```

`HEAD^` 是上一个提交，`HEAD~3` 是往前数第 3 个提交，也可以直接写 commit id。

### git reflog：后悔药

`git reset --hard` 之后后悔了怎么办？`git log` 已经看不到被丢弃的 commit 了，但 `git reflog` 记录了 HEAD 的**所有移动历史**，包括 reset、rebase、merge 的每一步：

```bash
git reflog
# 输出类似：
# a3f1b2c HEAD@{0}: reset: moving to HEAD^
# 9d8e7f1 HEAD@{1}: commit: feat: 药品搜索优化
# ...

git reset --hard 9d8e7f1   # 找到目标 id，恢复回去
```

只要没超过 GC 回收周期（默认 90 天），数据都能找回来。

### reset vs revert

```bash
# git reset：移动 HEAD，改写历史
# 适用：本地未 push 的提交，安全操作

# git revert：创建一个"反向提交"，历史不改写
# 适用：已 push 的提交，团队协作场景的安全回滚
git revert <commit-id>
```

**已经 push 出去的代码，不要用 `reset -f` 覆盖历史，用 `revert` 生成新提交，让历史可追溯。**

> 💬 **面试官**：git reset 误操作了，代码还能找回来吗？
>
> ✅ 标准答案：用 `git reflog` 查到被丢弃的 commit id，再 `git reset --hard <id>` 恢复。`reflog` 记录所有 HEAD 移动，包括 reset 掉的提交。
>
> 🎁 加分答案：说出 `git log` 和 `git reflog` 的区别——`log` 只显示当前分支的提交链，`reflog` 显示所有 HEAD 移动记录，是 Git 里最强的后悔药。

---

## 🌿 分支策略：团队协作的规则手册

分支管理是 Git 在团队里用好用差的分水岭，不同规模的团队有不同策略，但核心思路一致。

### 主流分支职责

| 分支 | 职责 |
|------|------|
| `master / main` | 版本迭代主线，只有正式发布的代码 |
| `feature/xxx` | 日常开发，基于 master 创建 |
| `release/dev` | 开发环境集成分支，feature 先合这里 |
| `release/test` | 测试环境分支，测试通过后合到 master |
| `hotfix/xxx` | 线上紧急 bug，基于 master 创建 |

### 标准开发流程

以一个 Jira 任务 #12345 为例：

```bash
# 基于 master 创建 feature 分支
git checkout master
git pull origin master
git checkout -b feature/12345
```

开发完成，提交并推到远程：

```bash
git commit -m "feat: 完成 #12345 药品搜索优化"
git push origin feature/12345
```

合入开发环境自测：

```bash
git checkout release/dev
git pull origin release/dev
git merge origin/feature/12345 --no-ff
git push origin release/dev
```

测试通过后合入 master，打 tag：

```bash
git checkout master
git pull origin master --rebase
git merge origin/release/test --no-ff
git push origin master
git tag -a v1.2.0 -m "release: 药品搜索优化上线"
git push origin --tags
```

### merge vs rebase

这是面试必考题，也是团队里经常争论的问题。

`git merge --no-ff`：保留分支合并历史，产生一个 merge commit，历史是非线性的但完整可追溯。

```bash
# merge 结果：主线上会有明显的分叉合并节点
git checkout master
git merge feature/12345 --no-ff
```

`git rebase`：把当前分支的提交"重新播放"到目标分支之上，历史是线性的，更干净。

```bash
# rebase：feature 的提交接在 master 最新提交之后，无分叉
git checkout feature/12345
git rebase master
# 如果有冲突，解决后继续
git rebase --continue
```

**什么时候用哪个？**

- 公共分支（master、release）合并 feature → 用 `merge --no-ff`，保留合并记录
- 个人 feature 分支同步最新主线 → 用 `rebase`，保持历史整洁
- 已经 push 到远程的分支 → **禁止 rebase**，会重写 commit hash，破坏他人本地历史

> 💬 **面试官**：rebase 和 merge 的区别？什么情况下不能用 rebase？
>
> ✅ 标准答案：merge 产生合并提交，历史是分叉的但完整；rebase 重写提交历史，历史是线性的但改变了 commit hash。
>
> 🎁 加分答案：已经 push 到远程的分支不能 rebase，因为 rebase 改变了 commit hash，其他人的本地历史和远程产生分歧，必须 force push，会让团队其他人陷入混乱。

---

## 🔧 实战技能：stash、gitignore、标签

### git stash：临时保存现场

临时被叫去修紧急 bug，feature 还没写完不想提交：

```bash
git stash              # 把工作区和暂存区改动压栈保存
git stash list         # 查看所有暂存记录
git stash pop          # 恢复最近一次（恢复后删除栈记录）
git stash apply        # 恢复但不删除栈记录（可多次恢复）
git stash apply stash@{2}  # 恢复指定的那条
```

🔧 **真实场景**：药品上架审核系统上线后发现线上 bug，我正在开发新功能改到一半。`git stash` 保存现场 → 基于 master 创建 `hotfix/drug-audit-fix` → 修完合回 master → `git stash pop` 恢复现场继续开发。整个过程零污染。

### gitignore 不生效怎么办

`.gitignore` 只能忽略**从未被 track 过的文件**。如果文件已经被 git 追踪了，后来再加到 `.gitignore` 不会生效。解决方法：

```bash
git rm -r --cached .       # 清除所有文件的 track 状态
git add .                  # 重新 add（这次 gitignore 生效）
git commit -m "chore: update .gitignore"
```

### 标签管理

标签用来标记发布版本，有轻量标签和含附注标签两种，**推荐含附注标签**：

```bash
git tag -a v1.0.0 -m "Version 1.0.0"   # 创建含附注标签
git tag -a v1.2.1 9fceb02              # 给历史 commit 补打标签
git push origin --tags                 # 推送所有标签到远程
git tag -d v2.0.0                      # 删除本地标签
git push origin :refs/tags/v2.0.0      # 删除远程标签
```

> 💬 **面试官**：git stash pop 和 git stash apply 的区别？
>
> ✅ 标准答案：pop 恢复后会删除栈里的记录；apply 恢复后保留栈记录，可以多次应用。
>
> 🎁 加分答案：`stash` 默认只保存已追踪文件的改动，如果要同时保存未追踪的新文件，需要加 `-u` 参数：`git stash -u`。

---

## 💡 一张图总结（面试速记）

| 知识点 | 核心结论 | 面试频率 |
|--------|----------|----------|
| 分布式 vs 集中式 | 本地完整仓库，不依赖网络，分支成本低 | ★★★ |
| 四区五态 | 工作区→暂存区→本地仓库→远程，5 种文件状态 | ★★★★ |
| git diff | diff 看工作区；diff --cached 看暂存区 | ★★★ |
| reset --soft | 撤回提交，改动留在暂存区 | ★★★★★ |
| reset --mixed | 撤回提交，改动退回工作区（默认） | ★★★★★ |
| reset --hard | 撤回提交，改动全丢（危险） | ★★★★★ |
| reset vs revert | reset 改写历史；已 push 用 revert 新增反向提交 | ★★★★ |
| git reflog | 所有 HEAD 移动记录，reset --hard 的后悔药 | ★★★★ |
| merge --no-ff | 保留合并节点，历史可追溯 | ★★★ |
| rebase | 线性历史，禁止对已 push 分支使用 | ★★★★ |
| git stash | 临时压栈保存现场，pop/apply 恢复 | ★★★ |
| gitignore 不生效 | git rm -r --cached 清除追踪再重新 add | ★★★ |

---

## 📝 留个问题

一道经典面试题：**`git pull` 和 `git fetch + git merge` 有什么区别？为什么很多团队规范要求用 `git fetch` 而不是直接 `git pull`？**

欢迎评论区聊聊你们团队的 Git 规范，以及有哪些踩坑经历。

---

> 🔖 前端工程化系列持续更新，上一篇：**npm / yarn / pnpm 深度对比——存储机制、幽灵依赖、lock 文件全攻略**



