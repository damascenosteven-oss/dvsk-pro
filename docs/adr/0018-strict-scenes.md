# 官方 DeepSeek 分组使用严格函数参数
issue: https://github.com/damascenosteven-oss/dvsk-pro/issues/11
status: accepted

线上分组第 2、3 页第二个对象动作均未通过枚举校验。当前 JSON 输出只要求可解析；提示词已列允许值。维持现状 30/100，继续发生无效枚举；仅增加示例 55/100，兼容成本低但缺少生成约束；官方 Flash 分组使用 beta 严格函数 90/100，以额外协议测试换取生成时约束。其他接口维持原协议。应用独立检查工具身份、参数和布局；失败不降级重试。
