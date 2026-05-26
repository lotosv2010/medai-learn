# ADR-0002：TypeScript 严格模式配置

- **状态**：已接受
- **日期**：2026-05-26
- **决策者**：项目组

---

## 背景

作为学习项目，需要决定 TypeScript 的严格程度。严格模式能暴露更多问题，但也会增加初期开发成本。

## 决策

采用 **最严格的 TypeScript 配置**，开启所有严格检查选项。

## 具体配置

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "exactOptionalPropertyTypes": true,
  "forceConsistentCasingInFileNames": true,
  "noFallthroughCasesInSwitch": true,
  "noImplicitReturns": true
}
```

## 理由

1. **学习目标驱动**：TypeScript 深度是核心学习目标之一，严格模式强迫深入理解类型系统
2. **面试加分**：能在面试中解释 `noUncheckedIndexedAccess` 的作用是加分项
3. **代码质量**：严格模式能捕获更多潜在 bug
4. **职业习惯**：养成严格类型思维，对未来项目有益

## 影响

- 禁止使用 `any`（用 `unknown` + 类型守卫替代）
- 禁止 `@ts-ignore`（必须用 `@ts-expect-error` + 注释原因）
- 数组索引访问需要非空断言或类型守卫
- 初期开发速度会稍慢，但长期收益大

## 后续行动

- [ ] 创建根 `tsconfig.json` + 各包继承配置
- [ ] 配置 ESLint typescript-eslint 规则
