# DeepSeek 分镜参数诊断
issue: https://github.com/damascenosteven-oss/dvsk-pro/issues/13
status: accepted
base: 61ba220479c3f5d9c0cad6bf0eb606d1d437dae6
adr: not-required

所有者批准区分严格函数参数的空白、意外结束和其他 JSON 语法错误。网页提示失败组和已保存进度，日志仅记录固定分类、UTF-16 长度和可信偏移，绝不记录参数或原始异常。沿用现有接口和校验，模拟 HTTP 链路验证失败后进度不变、合法组可保存。交付 Issue 分支和审核 PR，不部署或调用真实模型。

维持笼统错误 35/100，成本低但无法定位。直接记录解析器消息 20/100，可能泄露正文。仅记录受限数字和固定分类 92/100，增加少量诊断逻辑且不改变生成协议。既有模块内的局部诊断没有架构、接口或数据模型决策，故无需 ADR。
